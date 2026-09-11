
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LessonPlan, MindMapData, MindMapMode, PresentationScript, ContentResult, CharacterProfile, AppMode, ImageRatio, SpeechEvaluation, AiProvider } from "../types";
import { ensureCompletePracticeContent } from "../utils/practiceBuilder";

export { ensureCompletePracticeContent };

// ===== API KEY & PROVIDER MANAGEMENT (api.md standard) =====
export const GOOGLE_AI_API_KEY_PATTERN = /^(?:AIzaSy|AQ)\S{8,}$/;

export const isValidGoogleAiApiKey = (key: string): boolean => {
  return GOOGLE_AI_API_KEY_PATTERN.test((key || '').trim());
};

const GEMINI_KEY_STORAGE = 'gemini_api_key';
const AGENT_PLATFORM_KEY_STORAGE = 'agent_platform_api_key';
const PROVIDER_STORAGE = 'google_ai_provider';
const PROVIDER_SOURCE_STORAGE = 'google_ai_provider_selection_source';
const MODEL_STORAGE = 'mrs_dung_selected_model';
const LEGACY_KEY_STORAGE = 'mrs_dung_api_key'; // For backward compatibility

// Provider helpers
export const getAiProvider = (): AiProvider => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(PROVIDER_STORAGE) as AiProvider;
    if (saved === 'gemini' || saved === 'agent-platform') return saved;
  }
  return 'gemini';
};

export const setAiProvider = (provider: AiProvider): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROVIDER_STORAGE, provider);
    localStorage.setItem(PROVIDER_SOURCE_STORAGE, 'manual');
  }
};

// API Key getters/setters per provider
export const getApiKeyForProvider = (provider: AiProvider): string => {
  if (typeof window === 'undefined') return '';
  if (provider === 'agent-platform') {
    return localStorage.getItem(AGENT_PLATFORM_KEY_STORAGE) || '';
  }
  // Gemini API: check specific key first, fallback to legacy key if present
  const geminiKey = localStorage.getItem(GEMINI_KEY_STORAGE);
  if (geminiKey) return geminiKey;
  const legacyKey = localStorage.getItem(LEGACY_KEY_STORAGE);
  if (legacyKey) {
    localStorage.setItem(GEMINI_KEY_STORAGE, legacyKey);
    return legacyKey;
  }
  return '';
};

export const setApiKeyForProvider = (provider: AiProvider, key: string): void => {
  if (typeof window === 'undefined') return;
  const cleanKey = key.trim();
  if (provider === 'agent-platform') {
    localStorage.setItem(AGENT_PLATFORM_KEY_STORAGE, cleanKey);
  } else {
    localStorage.setItem(GEMINI_KEY_STORAGE, cleanKey);
    localStorage.setItem(LEGACY_KEY_STORAGE, cleanKey); // backward compat
  }
};

export const getApiKey = (): string | null => {
  const currentProvider = getAiProvider();
  const key = getApiKeyForProvider(currentProvider);
  return key || null;
};

export const setApiKey = (key: string): void => {
  const currentProvider = getAiProvider();
  setApiKeyForProvider(currentProvider, key);
};

export const hasApiKey = (): boolean => {
  return !!getApiKey();
};

// ===== MODEL SPECIFICATION (api.md standard) =====
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
  provider: AiProvider;
}

export const GEMINI_MODELS: ModelInfo[] = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Mặc định: Thế hệ mới nhất, suy luận logic và chất lượng giáo án vượt trội', isDefault: true, provider: 'gemini' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Dự phòng chất lượng cao, mạnh mẽ và ổn định', provider: 'gemini' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', description: 'Tốc độ siêu nhanh, tiết kiệm token, trích xuất dữ liệu tốt', provider: 'gemini' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Tương thích ngược ổn định', provider: 'gemini' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Bản 2.5 ổn định, dự phòng cuối chuỗi', provider: 'gemini' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Suy luận chuyên sâu cao cấp cho bài tập phức tạp', provider: 'gemini' },
];

export const AGENT_PLATFORM_MODELS: ModelInfo[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Mặc định Agent Platform: Tốc độ cao, tối ưu chi phí', isDefault: true, provider: 'agent-platform' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Bản nhẹ, phản hồi nhanh', provider: 'agent-platform' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Suy luận mạnh mẽ, viết giáo án chi tiết', provider: 'agent-platform' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', description: 'Bản preview suy luận cao cấp', provider: 'agent-platform' },
];

export const AVAILABLE_MODELS = GEMINI_MODELS; // Keep for backward compat

export const getModelsForProvider = (provider: AiProvider): ModelInfo[] => {
  return provider === 'agent-platform' ? AGENT_PLATFORM_MODELS : GEMINI_MODELS;
};

export const getSelectedModel = (): string => {
  if (typeof window !== 'undefined') {
    const provider = getAiProvider();
    const saved = localStorage.getItem(`${MODEL_STORAGE}_${provider}`) || localStorage.getItem(MODEL_STORAGE);
    const available = getModelsForProvider(provider);
    if (saved && available.some(m => m.id === saved)) {
      return saved;
    }
    const defaultModel = available.find(m => m.isDefault)?.id || available[0].id;
    return defaultModel;
  }
  return 'gemini-3.6-flash';
};

export const setSelectedModel = (modelId: string): void => {
  if (typeof window !== 'undefined') {
    const provider = getAiProvider();
    localStorage.setItem(`${MODEL_STORAGE}_${provider}`, modelId);
    localStorage.setItem(MODEL_STORAGE, modelId);
  }
};

// Client factory strictly following api.md
export const createGoogleAiClient = (
  apiKey: string,
  provider: AiProvider = getAiProvider()
): GoogleGenAI => {
  if (provider === 'agent-platform') {
    // Flag for Agent Platform endpoint aiplatform.googleapis.com
    return new GoogleGenAI({ vertexai: true, apiKey });
  }
  return new GoogleGenAI({ apiKey });
};

const getAI = () => {
  const provider = getAiProvider();
  const apiKey = getApiKeyForProvider(provider);
  if (!apiKey) {
    throw new Error('API_KEY_REQUIRED: Vui lòng cấu hình API Key trước khi sử dụng tính năng này.');
  }
  return createGoogleAiClient(apiKey, provider);
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type ApiErrorType =
  | 'MODEL_OVERLOADED'    // 500, 503, 504, overloaded, high demand, NOT_FOUND
  | 'QUOTA_EXCEEDED'      // 429, RESOURCE_EXHAUSTED
  | 'API_KEY_INVALID'     // 401
  | 'PERMISSION_DENIED'   // 403
  | 'INVALID_ARGUMENT'    // 400
  | 'UNKNOWN';

export const parseApiError = (error: any): { type: ApiErrorType; message: string } => {
  const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error)) || '';
  const lower = msg.toLowerCase();

  if (
    lower.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return {
      type: 'QUOTA_EXCEEDED',
      message: 'Đã hết quota hoặc vượt giới hạn tốc độ API. Vui lòng đợi một lát rồi thử lại.'
    };
  }

  if (lower.includes('401') || msg.includes('API_KEY_INVALID') || lower.includes('key invalid')) {
    return {
      type: 'API_KEY_INVALID',
      message: 'API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong Cài đặt.'
    };
  }

  if (lower.includes('403') || msg.includes('PERMISSION_DENIED')) {
    const provider = getAiProvider();
    if (provider === 'agent-platform') {
      return {
        type: 'PERMISSION_DENIED',
        message: 'Google đã nhận key nhưng dự án/key chưa được cấp quyền gọi Agent Platform API hoặc model này. Vui lòng kiểm tra Agent Platform API đã bật, billing và API restrictions.'
      };
    }
    return {
      type: 'PERMISSION_DENIED',
      message: 'API key không có quyền truy cập Gemini API hoặc tính năng này.'
    };
  }

  if (
    lower.includes('500') ||
    lower.includes('503') ||
    lower.includes('504') ||
    msg.includes('UNAVAILABLE') ||
    lower.includes('overloaded') ||
    lower.includes('high demand') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('try again later') ||
    lower.includes('404') ||
    msg.includes('NOT_FOUND')
  ) {
    return {
      type: 'MODEL_OVERLOADED',
      message: 'Model đang quá tải hoặc tạm thời không khả dụng; app đang tự động thử model dự phòng.'
    };
  }

  if (lower.includes('400') || msg.includes('INVALID_ARGUMENT')) {
    return {
      type: 'INVALID_ARGUMENT',
      message: `Tham số yêu cầu không hợp lệ: ${msg}`
    };
  }

  return {
    type: 'UNKNOWN',
    message: msg || 'Lỗi không xác định'
  };
};

export interface FallbackNotice {
  fromModel: string;
  toModel: string;
  reason: string;
}

// Retry with model fallback strictly following api.md Section II
export const callWithFallback = async <T>(
  fn: (model: string, client: GoogleGenAI) => Promise<T>,
  onFallbackNotice?: (notice: FallbackNotice) => void
): Promise<T> => {
  const provider = getAiProvider();
  const apiKey = getApiKeyForProvider(provider);
  if (!apiKey) {
    throw new Error('Vui lòng cấu hình API Key trước khi sử dụng tính năng này.');
  }

  const ai = createGoogleAiClient(apiKey, provider);
  const selectedModel = getSelectedModel();

  // Ordered fallback models based on provider as per api.md
  const defaultChain = provider === 'agent-platform'
    ? ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
    : ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

  // Deduplicate: user selected model first, followed by default chain
  const orderedModels = Array.from(new Set([selectedModel, ...defaultChain]));
  const errorDetails: string[] = [];

  for (let i = 0; i < orderedModels.length; i++) {
    const currentModel = orderedModels[i];
    try {
      return await fn(currentModel, ai);
    } catch (err: any) {
      const parsed = parseApiError(err);
      errorDetails.push(`[${currentModel}]: ${parsed.type} - ${parsed.message}`);

      // Stop immediately on auth, quota or invalid argument errors
      if (parsed.type === 'API_KEY_INVALID' || parsed.type === 'QUOTA_EXCEEDED' || parsed.type === 'INVALID_ARGUMENT') {
        throw new Error(parsed.message);
      }

      // Stop on permission error if Gemini API
      if (parsed.type === 'PERMISSION_DENIED' && provider !== 'agent-platform') {
        throw new Error(parsed.message);
      }

      // Fallback to next model if available
      if (i < orderedModels.length - 1) {
        const nextModel = orderedModels[i + 1];
        console.warn(`[Fallback] Model ${currentModel} gặp lỗi (${parsed.type}), thử model tiếp theo ${nextModel}...`);
        if (onFallbackNotice) {
          onFallbackNotice({ fromModel: currentModel, toModel: nextModel, reason: parsed.message });
        }
        await delay(1200);
      }
    }
  }

  // All models failed
  throw new Error(`ALL_MODELS_FAILED|${errorDetails.join(' || ')}`);
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

// ===== TTS SYSTEM: Mobile-First with IMMEDIATE Playback =====
// Uses Web Speech API with SYNCHRONOUS speak() for mobile compatibility
// Unified standard: British English Female Voice (Giọng nữ ngữ điệu chuẩn Anh - Anh en-GB)

let currentUtterance: SpeechSynthesisUtterance | null = null;
let cachedVoice: SpeechSynthesisVoice | null = null;
let ttsInitialized = false;

// Get voices SYNCHRONOUSLY - do not await
export const getVoicesSync = (): SpeechSynthesisVoice[] => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
};

/**
 * Detect & select the best British English Female voice (Giọng nữ chuẩn Anh - Anh)
 * Priorities:
 * 1. Google UK English Female (Chrome on PC, Mac, Chromebook, Android)
 * 2. Microsoft Natural Online UK Female voices (Edge/Windows 10/11) - Libby, Sonia
 * 3. Microsoft Desktop UK Female voices (Hazel, Susan built into Windows)
 * 4. Apple UK Female voices (Safari on iPhone, iPad, Mac) - Stephanie, Martha, Serena, Kate
 * 5. Any British voice explicitly marked female or with female name
 * 6. Any British voice (en-GB) that is NOT male
 * 7. Any British voice (en-GB)
 * 8. Fallback: Any English voice with female name or female tag
 * 9. Fallback: Any English voice that is not male
 * 10. Fallback: Any English voice
 */
export const getBestBritishFemaleVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  if (cachedVoice && voices.includes(cachedVoice)) return cachedVoice;
  if (!voices || voices.length === 0) return null;

  const isBritishLang = (v: SpeechSynthesisVoice) => {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    return lang === 'en-gb' || lang.startsWith('en-gb');
  };

  const isBritishName = (v: SpeechSynthesisVoice) => {
    const name = (v.name || '').toLowerCase();
    return name.includes('uk') || name.includes('united kingdom') || name.includes('great britain') || name.includes('british') || name.includes('england');
  };

  const isBritish = (v: SpeechSynthesisVoice) => isBritishLang(v) || isBritishName(v);

  const isExplicitlyMale = (v: SpeechSynthesisVoice) => {
    const name = (v.name || '').toLowerCase();
    return ['male', 'george', 'david', 'mark', 'guy', 'brian', 'ryan', 'oliver', 'alfie', 'charles', 'james', 'william', 'harry', 'jack', 'thomas'].some(m => name.includes(m));
  };

  const isFemaleNameOrTag = (v: SpeechSynthesisVoice) => {
    const name = (v.name || '').toLowerCase();
    return ['female', 'libby', 'sonia', 'hazel', 'susan', 'stephanie', 'martha', 'serena', 'kate', 'victoria', 'alice', 'emma', 'charlotte', 'fiona', 'rachel', 'amy'].some(f => name.includes(f));
  };

  // Priority order specifically for British English Female Voice:
  const priorities: ((v: SpeechSynthesisVoice) => boolean)[] = [
    // 1. Google UK English Female (Chrome/Android)
    (v) => v.name.toLowerCase().includes('google') && isBritish(v) && (v.name.toLowerCase().includes('female') || !isExplicitlyMale(v)),

    // 2. Microsoft Natural Online UK Female voices (Edge/Windows 10/11) - Libby, Sonia
    (v) => v.name.toLowerCase().includes('microsoft') && isBritish(v) && (v.name.toLowerCase().includes('libby') || v.name.toLowerCase().includes('sonia')),

    // 3. Microsoft Desktop UK Female voices (Hazel, Susan built into Windows)
    (v) => v.name.toLowerCase().includes('microsoft') && isBritish(v) && (v.name.toLowerCase().includes('hazel') || v.name.toLowerCase().includes('susan')),

    // 4. Apple UK Female voices (Safari on iPhone, iPad, Mac) - Stephanie, Martha, Serena, Kate
    (v) => isBritish(v) && (v.name.toLowerCase().includes('stephanie') || v.name.toLowerCase().includes('martha') || v.name.toLowerCase().includes('serena') || v.name.toLowerCase().includes('kate')),

    // 5. Any British voice explicitly marked female or with female name
    (v) => isBritish(v) && isFemaleNameOrTag(v),

    // 6. Any British voice (en-GB) that is NOT male
    (v) => isBritish(v) && !isExplicitlyMale(v),

    // 7. Any British voice (en-GB)
    (v) => isBritish(v),

    // 8. Fallback: Any English voice with female name or female tag
    (v) => (v.lang || '').toLowerCase().startsWith('en') && isFemaleNameOrTag(v),

    // 9. Fallback: Any English voice that is not male
    (v) => (v.lang || '').toLowerCase().startsWith('en') && !isExplicitlyMale(v),

    // 10. Fallback: Any English voice
    (v) => (v.lang || '').toLowerCase().startsWith('en')
  ];

  for (const check of priorities) {
    const voice = voices.find(check);
    if (voice) {
      cachedVoice = voice;
      return voice;
    }
  }

  cachedVoice = voices[0];
  return voices[0];
};

// Backward compatibility alias
export const getBestVoice = getBestBritishFemaleVoice;

// Pre-load voices in background (non-blocking)
const preloadVoices = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Try to get voices immediately
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoice = null;
    getBestBritishFemaleVoice(voices); // Cache the best British female voice
    return;
  }

  // Listen for voices to become available
  window.speechSynthesis.onvoiceschanged = () => {
    const v = window.speechSynthesis.getVoices();
    if (v.length > 0) {
      cachedVoice = null;
      getBestBritishFemaleVoice(v); // Cache the best British female voice
    }
  };
};

// Initialize TTS - call this on first user interaction (e.g., page touch)
export const initTTSOnUserInteraction = (): void => {
  if (ttsInitialized) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  ttsInitialized = true;

  // Warm up the speech synthesis engine with a silent utterance
  try {
    const warmup = new SpeechSynthesisUtterance('');
    warmup.volume = 0;
    warmup.rate = 10;
    window.speechSynthesis.speak(warmup);
    window.speechSynthesis.cancel();
  } catch (e) {
    // Ignore errors during warmup
  }

  // Pre-cache voices
  preloadVoices();
};

// Pre-load voices on page load
if (typeof window !== 'undefined' && window.speechSynthesis) {
  preloadVoices();

  const initOnInteraction = () => {
    initTTSOnUserInteraction();
    document.removeEventListener('touchstart', initOnInteraction);
    document.removeEventListener('click', initOnInteraction);
  };
  document.addEventListener('touchstart', initOnInteraction, { passive: true });
  document.addEventListener('click', initOnInteraction, { passive: true });
}

/**
 * Creates a SpeechSynthesisUtterance configured for standard British English female voice
 * - lang: en-GB
 * - rate: 0.88 (ideal pedagogical cadence for Vietnamese students)
 * - pitch: 1.05 (natural, warm, female intonation)
 */
export const createBritishSpeechUtterance = (text: string, rate = 0.88): SpeechSynthesisUtterance => {
  const cleanText = text.trim().replace(/[^\w\s.,!?'"-]/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);

  utterance.lang = 'en-GB';
  utterance.rate = rate;
  utterance.pitch = 1.05;
  utterance.volume = 1.0;

  const voices = getVoicesSync();
  const voice = getBestBritishFemaleVoice(voices);
  if (voice) {
    utterance.voice = voice;
  }

  return utterance;
};

// Main TTS function - SYNCHRONOUS speak() for mobile, returns Promise for awaitable calls
export const playGeminiTTS = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('Speech synthesis not available');
      resolve();
      return;
    }

    const cleanText = text.trim().replace(/[^\w\s.,!?'"-]/g, '');
    if (!cleanText) {
      resolve();
      return;
    }

    // Cancel existing speech
    window.speechSynthesis.cancel();
    currentUtterance = null;

    try {
      const utterance = createBritishSpeechUtterance(cleanText, 0.88);
      currentUtterance = utterance;

      utterance.onend = () => {
        currentUtterance = null;
        resolve();
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted') {
          console.warn('TTS error:', e.error);
        }
        currentUtterance = null;
        resolve();
      };

      // SYNCHRONOUS call to speak()
      window.speechSynthesis.speak(utterance);

      // Mobile Chrome/Safari fix: resume if paused
      let resumeAttempts = 0;
      const mobileResumeFix = setInterval(() => {
        resumeAttempts++;

        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
          clearInterval(mobileResumeFix);
          resolve();
          return;
        }

        if (resumeAttempts > 300) {
          clearInterval(mobileResumeFix);
          currentUtterance = null;
          resolve();
          return;
        }

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 100);

    } catch (e) {
      console.error('TTS Error:', e);
      resolve();
    }
  });
};

// Stop any playing audio
export const stopTTS = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
};

// Optional: Gemini TTS for high-quality audio (can be used as enhancement)
export const generateAudioFromContent = async (text: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Aoede' }
        }
      }
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const generateLessonPlan = async (
  topicInput?: string,
  textInput?: string,
  images: string[] = [],
  onProgress?: (stage: 'core' | 'practice') => void,
  onFallbackNotice?: (notice: FallbackNotice) => void
): Promise<LessonPlan> => {
  const imageParts = images.map(data => ({ inlineData: { data, mimeType: 'image/jpeg' } }));

  // ==================== PHASE 1: GENERATE CORE LESSON ====================
  const promptCore = `MRS. DUNG AI - EXPERT PEDAGOGY MODE.
  TASK: Create a comprehensive core lesson. BE CONCISE. Output valid JSON only, no extra text.
  
  ===== REFERENCE FRAMEWORK: GLOBAL SUCCESS (SGK TIẾNG ANH VIỆT NAM) =====
  All content MUST be aligned with the Global Success textbook series (NXB Giáo dục Việt Nam).
  CEFR level alignment — AUTO-DETECT grade level from input content:
  - Lớp 1-3 (STARTER / Pre-A1): CỰC KỲ ĐƠN GIẢN!
    * Chỉ dùng câu 2-5 từ: "I have a cat.", "This is a pen.", "She is happy."
    * Chủ đề: gia đình, trường học, đồ vật, con vật, màu sắc, số đếm
    * CHỈ dùng: Present Simple (is/am/are, have/has), can, like
    * KHÔNG dùng: Past tense, Future tense, mệnh đề phụ, câu phức
    * Từ vựng: chỉ những từ cơ bản nhất, 1-2 âm tiết
  - Lớp 4-5: Pre-A1 to A1 (câu đơn giản, 3-7 từ/câu, bắt đầu dùng Present Continuous)
  - Lớp 6-7: A1 (câu đơn giản, chủ đề gần gũi: sở thích, thể thao, thời tiết)
  - Lớp 8-9: A1-A2 (câu phức vừa phải, chủ đề: du lịch, môi trường, công nghệ)
  - Lớp 10-11: A2-B1 (có thể dùng mệnh đề phụ, chủ đề: nghề nghiệp, sức khỏe, xã hội)
  - Lớp 12: B1 (phức tạp hơn, chủ đề: giáo dục, toàn cầu hóa)
  → Tự động xác định cấp độ lớp dựa trên nội dung input và tạo bài phù hợp.

  ===== MANDATORY ENGLISH QUALITY RULES (ZERO TOLERANCE) =====
  1. ZERO spelling errors in English. Every single word MUST be spelled correctly.
  2. Every sentence MUST follow standard English grammar rules perfectly.
  3. Use British English spelling as PRIMARY (as used in Global Success textbooks):
     - "favourite" NOT "favorite", "colour" NOT "color"
     - "centre" NOT "center", "programme" NOT "program"
     - "travelling" NOT "traveling", "organised" NOT "organized"
  4. All proper nouns MUST be capitalized correctly.
  5. Vietnamese translations MUST use correct diacritics (dấu tiếng Việt đầy đủ).
  6. Contractions: Use consistently — "don't", "doesn't", "isn't", "aren't", "can't".
  7. Articles: Ensure 100% correct use of a/an/the in ALL sentences.
  8. Subject-verb agreement: MUST be perfect (He goes, NOT He go; She has, NOT She have).
  9. Tense consistency: All examples within a section must use consistent tense.
  10. Punctuation: Correct use of periods, commas, question marks, exclamation marks.

  ===== CRITICAL: 100% CONTENT EXTRACTION =====
  ⚠️ QUAN TRỌNG NHẤT: Phải trích xuất CHÍNH XÁC và ĐẦY ĐỦ 100% nội dung từ nguồn!
  - Nếu ảnh/văn bản có 10 từ vựng → tạo ĐÚNG 10 từ vựng, KHÔNG được bỏ sót
  - Nếu ảnh/văn bản có 5 từ vựng → tạo ĐÚNG 5 từ vựng
  - KHÔNG được tự thêm từ vựng mà nguồn không có
  - KHÔNG được bỏ sót bất kỳ từ vựng nào trong nguồn
  - Từ vựng phải GIỐNG HỆT với nội dung gốc (word, IPA, meaning, example)
  
  CRITICAL LANGUAGE REQUIREMENTS:
  - GRAMMAR section:
    * "topic": Keep in English (the grammar rule name, e.g., "Present Simple Tense", "Comparative Adjectives")
    * "explanation": MUST be in VIETNAMESE (giải thích bằng tiếng Việt, dễ hiểu cho học sinh, có dấu tiếng Việt đầy đủ)
      - For Lớp 1-3: Giải thích CỰC KỲ đơn giản, dùng từ ngữ trẻ em hiểu được.
    * "examples": Each example MUST include Vietnamese translation in format: "English sentence." → "bản dịch tiếng việt viết thường."
    * Grammar rules MUST match those taught in Global Success textbooks for the detected grade level.
  
  - VOCABULARY section (EXTRACT ALL FROM SOURCE):
    * Extract EVERY SINGLE vocabulary word from the source - DO NOT SKIP ANY
    * "word": English word (EXACTLY as shown in source)
    * "ipa": IPA pronunciation — MUST be accurate International Phonetic Alphabet.
      Double-check IPA transcription for common errors:
      - "school" = /skuːl/ NOT /ʃuːl/
      - "thought" = /θɔːt/ NOT /tɔːt/
      - "important" = /ɪmˈpɔːtənt/ NOT /ɪmˈpɔːtænt/
    * "meaning": Vietnamese meaning (EXACTLY as shown in source, lowercase, có dấu tiếng Việt đầy đủ)
    * "example": English example sentence (EXACTLY as shown in source). Must be grammatically perfect.
    * "sentenceMeaning": Vietnamese translation of example (EXACTLY as shown in source, lowercase, có dấu tiếng Việt đầy đủ)
    * "type": Word type — use standard abbreviations: "noun" (n), "verb" (v), "adjective" (adj), "adverb" (adv), "preposition" (prep), "conjunction" (conj)
    * "emoji": A cute relevant emoji representing the word.
  
  - READING ADVENTURE (reading):
    * "title": English title of the passage.
    * "passage": MUST adapt length to detected grade level:
      - Lớp 1-3 (Starter): ONLY 3-5 very simple sentences (20-40 words total). Example:
        "My name is Lan. I am seven. I have a cat. My cat is white. I love my cat."
      - Lớp 4-5: 5-7 simple sentences (40-70 words)
      - Lớp 6-9: 8-12 sentences (80-120 words)
      - Lớp 10-12: Full passage (100-150 words)
      Use at least 3-5 vocabulary words from the list. MUST be 100% grammatically correct with ZERO spelling errors.
    * "translation": Complete Vietnamese translation of the passage (có dấu tiếng Việt đầy đủ, chính xác).
    * "comprehension": Create EXACTLY 5 Multiple Choice comprehension questions based on the passage.
      - For Lớp 1-3: Questions MUST be very simple (e.g., "What colour is the cat?", "How old is Lan?")
      - Each question: "id" (e.g., comp_1 to comp_5), "question", "options" (4 options), "correctAnswer" (0-3), "explanation" (in Vietnamese, có dấu tiếng Việt đầy đủ).
      - Questions and all 4 options MUST be grammatically correct English.
      - The correctAnswer index MUST match the actually correct option. DOUBLE-CHECK this.
  
  - TEACHER TIPS (teacherTips):
    * A helpful tip in Vietnamese for teachers/parents to support the student's learning of this lesson (có dấu tiếng Việt đầy đủ).
  `;


  const coreInputParts: any[] = [];
  if (textInput) coreInputParts.push({ text: `SOURCE TEXT:\n${textInput}` });
  if (topicInput) coreInputParts.push({ text: `TOPIC FOCUS:\n${topicInput}` });
  coreInputParts.push(...imageParts);
  coreInputParts.push({ text: promptCore });

  if (onProgress) onProgress('core');

  const coreResult = await callWithFallback(async (modelId: string, client: GoogleGenAI) => {
    console.log(`🤖 [Giai đoạn 1] Đang thử với model: ${modelId}`);
    const response = await client.models.generateContent({
      model: modelId,
      contents: { parts: coreInputParts },
      config: { responseMimeType: "application/json", responseSchema: lessonCoreSchema }
    });
    return safeJsonParse<any>(response.text);
  }, onFallbackNotice);

  // ==================== PHASE 2: GENERATE PRACTICE EXERCISES ====================
  if (onProgress) onProgress('practice');

  const promptPractice = `MRS. DUNG AI - EXPERT EXERCISE GENERATOR.
  TASK: Create practice exercises based directly on the provided LESSON CORE DATA. BE CONCISE. Output valid JSON only.

  ===== ⚠️ MANDATORY JSON OUTPUT FORMAT ⚠️ =====
  Your response MUST be a JSON object with this EXACT structure (all exercises must be nested under 'megaTest' except 'listening'):
  {
    "listening": [ ...5 questions... ],
    "megaTest": {
      "multipleChoice": [ ...10 questions... ],
      "scramble": [ ...10 questions... ],
      "fillBlank": [ ...10 questions... ],
      "vocabTranslation": [ ...10 questions... ],
      "trueFalsePassage": "A reading passage for true/false based on the lesson",
      "trueFalse": [ ...5 questions... ],
      "matching": [ ...10 pairs... ]
    }
  }
  
  ===== ⚠️⚠️⚠️ CRITICAL WARNING: ZERO TOLERANCE FOR GRADING ERRORS ⚠️⚠️⚠️ =====
  🚨 BẠN ĐANG TẠO BÀI KIỂM TRA CHO HỌC SINH THẬT! CHẤM ĐIỂM PHẢI THẬT CHUẨN XÁC! 🚨
  - LỖI SAI ĐÁP ÁN LÀ KHÔNG THỂ CHẤP NHẬN: Nếu đáp án SAI → Học sinh bị chấm SAI → Học sinh mất niềm tin!
  - Vị trí correctAnswer (index 0-3) PHẢI KHỚP CHÍNH XÁC 100% với đáp án đúng trong mảng options.
  
  ===== 🎓 CRITICAL: SMART GRADING & CONTRACTIONS — CHẤM NHƯ GIÁO VIÊN THẬT =====
  🚨 QUY TẮC VÀNG: NẾU HỌC SINH TRẢ LỜI ĐÚNG NGỮ PHÁP → PHẢI CHẤM ĐÚNG!
  - Chấp nhận các cách viết tắt, viết gọn chuẩn tiếng Anh (contractions):
    * don't ↔ do not, doesn't ↔ does not, didn't ↔ did not
    * isn't ↔ is not, aren't ↔ are not, wasn't ↔ was not, weren't ↔ were not
    * can't ↔ cannot, won't ↔ will not, shouldn't ↔ should not, wouldn't ↔ would not
    * I'm ↔ I am, you're ↔ you are, he's ↔ he is, she's ↔ she is, it's ↔ it is, we're ↔ we are, they're ↔ they are
    * 's ↔ is, 're ↔ are, 'm ↔ am, 've ↔ have, 'll ↔ will, 'd ↔ would/had
  
  📌 MULTIPLE CHOICE — Nếu có NHIỀU đáp án đúng về ngữ pháp:
  - correctAnswer: index của đáp án tối ưu/phổ biến nhất
  - alternativeCorrectAnswers: mảng index của CÁC ĐÁP ÁN ĐÚNG KHÁC
  - Ví dụ: "What ____ your name?" options: ["is", "am", "are", "'s"]
    → correctAnswer: 3 ('s - phổ biến nhất)
    → alternativeCorrectAnswers: [0] ("is" cũng đúng vì 's = is)
  
  📌 FILL-IN-THE-BLANK — alternativeAnswers PHẢI đầy đủ:
  - Nếu đáp án có dạng viết tắt, PHẢI thêm dạng đầy đủ và ngược lại
    Ví dụ: correctAnswer: "I'm" → alternativeAnswers: ["I am", "I'm"]
    Ví dụ: correctAnswer: "don't" → alternativeAnswers: ["do not", "don't"]
    Ví dụ: correctAnswer: "is" → alternativeAnswers: ["'s", "is"]
  - Nếu câu hỏi điền TÊN NGƯỜI (ví dụ: "My name's ____."):
    → correctAnswer: một tên bất kỳ, alternativeAnswers: ["ANY_NAME"]
  
  📌 LISTENING — Tương tự MC, nếu có options tương đương ngữ pháp → thêm alternativeCorrectAnswers

  ===== MANDATORY ENGLISH QUALITY RULES (ZERO TOLERANCE) =====
  1. ZERO spelling errors. Every English word MUST be spelled correctly.
  2. Every sentence MUST follow standard English grammar perfectly.
  3. Use British English spelling (as in Global Success textbooks).
  4. Subject-verb agreement MUST be perfect in every sentence.
  5. Vietnamese text MUST use correct diacritics.

  ===== ⚠️ CRITICAL: 80% CONTENT MUST USE INPUT VOCABULARY/GRAMMAR =====
  MANDATORY RULE: At least 80% of ALL exercises MUST directly use the vocabulary, grammar patterns, and concepts from the LESSON CORE provided.
  
  ===== ⚠️ CRITICAL: MATCH DIFFICULTY LEVEL WITH INPUT =====
  🎯 GOLDEN RULE: Exercise difficulty MUST match the lesson core example sentences!
  1. If lesson core uses 3-5 word sentences → Exercises use 3-5 word sentences.
  2. PREFER using the EXACT example sentences from lesson core as exercise base.
  
  ===== EXERCISE TYPES TO GENERATE =====
  1. Create EXACTLY 10 Multiple Choice Questions (multipleChoice)
     - A sentence with ONE blank using "____"
     - 4 options [A, B, C, D]
     - correctAnswer: Index of the BEST/most common correct option (0-3)
     - alternativeCorrectAnswers: Array of indices of OTHER grammatically correct options (if any).
     - explanation: Vietnamese explanation with grammar rule reference.
     
  2. Create EXACTLY 10 Scramble Questions (scramble)
     - correctSentence: A grammatically correct English sentence.
     - scrambled: Array of WHOLE WORDS from correctSentence, shuffled.
     - PUNCTUATION: Must stay attached to the word they follow. NEVER separate punctuation.
     
  3. Create EXACTLY 10 Fill-in-the-blank Questions (fillBlank)
     - ONLY 1 WORD ANSWER, ONLY 1 BLANK "____"
     - correctAnswer: The correct word to fill in.
     - alternativeAnswers: Array of ALL valid alternative answers (contractions, expansions, "ANY_NAME").
     - clueEmoji: An emoji that VISUALLY REPRESENTS the correctAnswer.
     - explanation: Vietnamese explanation.
   
  4. Create EXACTLY 10 Vocabulary Translation Questions (vocabTranslation)
     - 4 Vietnamese choices, correctAnswer (0-3).
     - alternativeCorrectAnswers: Array of indices of OTHER correct options.
   
  5. Create EXACTLY 5 True/False Reading Comprehension Questions (trueFalse + trueFalsePassage)
     - trueFalsePassage: A short passage (40-100 words) using lesson vocabulary.
     - trueFalse: 5 statements (isTrue: boolean, explanation in Vietnamese).
  
  6. Create EXACTLY 5 Listening Comprehension Questions (listening) - BLANK FILLING FORMAT
     - audioText: A short, natural English sentence using lesson vocabulary. Audio will read this COMPLETE sentence.
     - sentenceWithBlank: The sentence with EXACTLY ONE key vocabulary word replaced with "______"
     - missingWord: The exact word/phrase that fills the blank.
     - alternativeAnswers: Array of other valid spellings, contractions, or equivalent words.
     - options: 4 choices (correct answer is audioText, 3 wrong choices are similar).
     - correctAnswer: Index of correct option (0-3).
     - alternativeCorrectAnswers: Array of indices of other correct options if any option is grammatically equivalent.
     - explanation: Vietnamese translation of audioText and meaning of the missing word.
  
  7. Create EXACTLY 10 Matching Pairs (matching)
     - left: English word/phrase from vocabulary (correctly spelled).
     - right: Vietnamese meaning (có dấu tiếng Việt đầy đủ).
  
  LESSON CORE DATA:
  ${JSON.stringify({ vocabulary: coreResult.vocabulary, grammar: coreResult.grammar, reading: coreResult.reading })}`;


  let practiceResult: any = null;
  try {
    practiceResult = await callWithFallback(async (modelId: string, client: GoogleGenAI) => {
      console.log(`🤖 [Giai đoạn 2] Đang thử với model: ${modelId}`);
      const response = await client.models.generateContent({
        model: modelId,
        contents: { parts: [{ text: promptPractice }] },
        config: { responseMimeType: "application/json", responseSchema: lessonPracticeSchema }
      });
      return safeJsonParse<any>(response.text);
    }, onFallbackNotice);
  } catch (err: any) {
    console.warn('⚠️ [Giai đoạn 2] AI không thể tạo bài tập từ API, tự động tổng hợp từ dữ liệu bài học:', err);
  }

  // Combine and GUARANTEE 100% complete practice content with fallback synthesis
  const completePractice = ensureCompletePracticeContent(practiceResult, coreResult);

  return {
    ...coreResult,
    practice: completePractice
  } as LessonPlan;
};

export const analyzeImageAndCreateContent = async (images: string[], mimeType: string, char: CharacterProfile, mode: AppMode, customPrompt?: string, topic?: string, text?: string): Promise<ContentResult> => {
  const imageParts = images.map(data => ({ inlineData: { data, mimeType } }));
  const prompt = `MRS. DUNG AI - CREATIVE STORYTELLER.
  
  Analyze the input and create:
  1. A magical story featuring ${char.name}.
  2. EXACTLY 10 Comprehension Quiz questions.
  3. EXACTLY 10 Speaking interaction prompts.
  4. A SCIENTIFIC WRITING PROMPT for the student in BOTH English and Vietnamese.
  
  Source material: Topic: ${topic || "N/A"}, Text: ${text || "N/A"}.
  Character context: ${char.promptContext}.`;

  return await callWithFallback(async (modelId: string, client: GoogleGenAI) => {
    const response = await client.models.generateContent({
      model: modelId,
      contents: { parts: [...imageParts, { text: prompt }] },
      config: { responseMimeType: "application/json", responseSchema: contentResultSchema }
    });
    return safeJsonParse<ContentResult>(response.text);
  });
};

const safeJsonParse = <T>(text: string): T => {
  try {
    let cleanText = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const start = Math.min(cleanText.indexOf('{') === -1 ? Infinity : cleanText.indexOf('{'), cleanText.indexOf('[') === -1 ? Infinity : cleanText.indexOf('['));
    const end = Math.max(cleanText.lastIndexOf('}'), cleanText.lastIndexOf(']'));
    if (start !== Infinity && end !== -1) cleanText = cleanText.substring(start, end + 1);
    return JSON.parse(cleanText) as T;
  } catch (e) { throw new Error("Lỗi xử lý dữ liệu AI."); }
};

const lessonCoreSchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    vocabulary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          emoji: { type: Type.STRING },
          ipa: { type: Type.STRING },
          meaning: { type: Type.STRING },
          example: { type: Type.STRING },
          sentenceMeaning: { type: Type.STRING },
          type: { type: Type.STRING }
        },
        required: ["word", "ipa", "meaning", "example", "type", "emoji"]
      }
    },
    grammar: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
        explanation: { type: Type.STRING },
        examples: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["topic", "explanation", "examples"]
    },
    reading: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        passage: { type: Type.STRING },
        translation: { type: Type.STRING },
        comprehension: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["id", "question", "options", "correctAnswer"]
          }
        }
      },
      required: ["title", "passage", "translation", "comprehension"]
    },
    teacherTips: { type: Type.STRING }
  },
  required: ["topic", "vocabulary", "grammar", "reading", "teacherTips"]
};

const lessonPracticeSchema = {
  type: Type.OBJECT,
  properties: {
    listening: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          audioText: { type: Type.STRING },
          sentenceWithBlank: { type: Type.STRING },
          missingWord: { type: Type.STRING },
          alternativeAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.INTEGER },
          alternativeCorrectAnswers: { type: Type.ARRAY, items: { type: Type.INTEGER } },
          explanation: { type: Type.STRING }
        },
        required: ["id", "audioText", "sentenceWithBlank", "missingWord"]
      }
    },
    megaTest: {
      type: Type.OBJECT,
      properties: {
        multipleChoice: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              alternativeCorrectAnswers: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              explanation: { type: Type.STRING }
            },
            required: ["id", "question", "options", "correctAnswer"]
          }
        },
        scramble: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              scrambled: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctSentence: { type: Type.STRING },
              translation: { type: Type.STRING }
            },
            required: ["id", "scrambled", "correctSentence"]
          }
        },
        fillBlank: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              correctAnswer: { type: Type.STRING },
              alternativeAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
              clueEmoji: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["id", "question", "correctAnswer"]
          }
        },
        vocabTranslation: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              word: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              alternativeCorrectAnswers: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              explanation: { type: Type.STRING }
            },
            required: ["id", "word", "options", "correctAnswer"]
          }
        },
        trueFalsePassage: { type: Type.STRING },
        trueFalse: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              statement: { type: Type.STRING },
              isTrue: { type: Type.BOOLEAN },
              explanation: { type: Type.STRING }
            },
            required: ["id", "statement", "isTrue", "explanation"]
          }
        },
        matching: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              left: { type: Type.STRING },
              right: { type: Type.STRING }
            },
            required: ["id", "left", "right"]
          }
        }
      },
      required: ["multipleChoice", "scramble", "fillBlank", "vocabTranslation", "trueFalsePassage", "trueFalse", "matching"]
    }
  },
  required: ["listening", "megaTest"]
};


const contentResultSchema = {
  type: Type.OBJECT,
  properties: {
    storyEnglish: { type: Type.STRING },
    translatedText: { type: Type.STRING },
    writingPromptEn: { type: Type.STRING },
    writingPromptVi: { type: Type.STRING },
    vocabulary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, meaning: { type: Type.STRING }, emoji: { type: Type.STRING } } } },
    imagePrompt: { type: Type.STRING },
    comprehensionQuestions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.INTEGER }, explanation: { type: Type.STRING } } } },
    speakingQuestions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, question: { type: Type.STRING }, suggestedAnswer: { type: Type.STRING } } } }
  },
  required: ["storyEnglish", "translatedText", "writingPromptEn", "writingPromptVi", "vocabulary", "imagePrompt", "comprehensionQuestions", "speakingQuestions"]
};

export const generateMindMap = async (content: any, mode: MindMapMode): Promise<MindMapData> => {
  return await callWithFallback(async (modelId: string, client: GoogleGenAI) => {
    const response = await client.models.generateContent({
      model: modelId,
      contents: `Create a professional Mind Map following Tony Buzan's principles for: ${JSON.stringify(content)}. 
    Structure: Root node is the main topic. Child nodes are key sub-concepts with emojis. 
    Output strictly in JSON format matching the schema.`,
      config: { responseMimeType: "application/json", responseSchema: mindMapSchema }
    });
    return safeJsonParse<MindMapData>(response.text);
  });
};

export const evaluateSpeech = async (base64Audio: string): Promise<SpeechEvaluation> => {
  return await callWithFallback(async (modelId: string, client: GoogleGenAI) => {
    const response = await client.models.generateContent({
      model: modelId,
      contents: { parts: [{ inlineData: { data: base64Audio, mimeType: 'audio/wav' } }, { text: "Evaluate the student's speaking performance on a scale of 0-10. Provide encouraging feedback in Vietnamese." }] },
      config: { responseMimeType: "application/json", responseSchema: speechEvaluationSchema }
    });
    return safeJsonParse<SpeechEvaluation>(response.text);
  });
};

export const generateStoryImage = async (prompt: string, style: string, ratio: ImageRatio): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `A high-quality educational illustration for kids: ${prompt}. Artistic Style: ${style}. High resolution, 8k, vibrant colors.` }] },
    config: { imageConfig: { aspectRatio: ratio } }
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; }
  throw new Error("Image generation failed");
};

export const correctWriting = async (userText: string, creativePrompt: string): Promise<any> => {
  return await callWithFallback(async (modelId: string, client: GoogleGenAI) => {
    const response = await client.models.generateContent({
      model: modelId,
      contents: `Evaluate and correct this student writing: "${userText}". The topic was: "${creativePrompt}". Provide a score (0-10), feedback, fixed text, and detailed error list.`,
      config: { responseMimeType: "application/json", responseSchema: writingCorrectionSchema }
    });
    return safeJsonParse<any>(response.text);
  });
};

export const generatePresentation = async (data: MindMapData): Promise<PresentationScript> => {
  return await callWithFallback(async (modelId: string, client: GoogleGenAI) => {
    const response = await client.models.generateContent({
      model: modelId,
      contents: `Create a professional English presentation script for a student based on this Mind Map data: ${JSON.stringify(data)}. 
    Include a warm introduction, body sections for each node, and a polite conclusion. 
    Provide both English script and Vietnamese translation.`,
      config: { responseMimeType: "application/json", responseSchema: presentationSchema }
    });
    return safeJsonParse<PresentationScript>(response.text);
  });
};

export const generateMindMapPrompt = async (content: any, mode: MindMapMode): Promise<string> => {
  return await callWithFallback(async (modelId: string, client: GoogleGenAI) => {
    const response = await client.models.generateContent({
      model: modelId,
      contents: `TASK: Generate a single, highly detailed English prompt for drawing a professional Tony Buzan Mind Map using AI art tools (like Midjourney or DALL-E). 
    CONTENT SOURCE: ${JSON.stringify(content)}. 
    
    PROMPT SPECIFICATIONS:
    - Style: 3D Organic Tony Buzan Mind Map, Pixar-style animation render.
    - Central Theme: A clear 3D icon representing the lesson topic at the center.
    - Branches: Curvy, organic, thick-to-thin colorful branches spreading outwards.
    - Elements: Floating keywords in English, cute 3D emojis/icons next to branches.
    - Environment: Clean bright studio background, 8k resolution, cinematic lighting, vibrant pedagogical colors.
    - Exclude: No text other than the keywords. 
    
    JUST PROVIDE THE RAW PROMPT STRING.`
    });
    return response.text || '';
  });
};

const mindMapSchema = { type: Type.OBJECT, properties: { center: { type: Type.OBJECT, properties: { title_en: { type: Type.STRING }, title_vi: { type: Type.STRING }, emoji: { type: Type.STRING } } }, nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text_en: { type: Type.STRING }, text_vi: { type: Type.STRING }, emoji: { type: Type.STRING } } } } } };
const presentationSchema = { type: Type.OBJECT, properties: { introduction: { type: Type.OBJECT, properties: { english: { type: Type.STRING }, vietnamese: { type: Type.STRING } } }, body: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING }, script: { type: Type.STRING } } } }, conclusion: { type: Type.OBJECT, properties: { english: { type: Type.STRING }, vietnamese: { type: Type.STRING } } } } };
const speechEvaluationSchema = { type: Type.OBJECT, properties: { scores: { type: Type.OBJECT, properties: { pronunciation: { type: Type.NUMBER } } }, overallScore: { type: Type.NUMBER }, feedback: { type: Type.STRING } } };
const writingCorrectionSchema = { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING }, fixedText: { type: Type.STRING }, breakdown: { type: Type.OBJECT, properties: { vocabulary: { type: Type.NUMBER }, grammar: { type: Type.NUMBER } } }, errors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, fixed: { type: Type.STRING }, reason: { type: Type.STRING } } } }, suggestions: { type: Type.STRING } } };
