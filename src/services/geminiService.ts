import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AiProvider, ModelOption } from "../types";

export interface VocabularyItem {
  word: string;
  ipa: string;
  meaning: string;
  emoji?: string;
}

export interface ContentGenerationResult {
  prompt: string;
  readingText: string;
  topicName: string;
  translation: string;
  vocabulary: VocabularyItem[];
}

export type EnglishLevel = "Starters" | "Movers" | "Flyers" | "A1" | "A2" | "B1" | "B2";

export const parseSafeJson = (text: string) => {
  let cleaned = (text || "{}").trim();
  // Strip markdown backticks if present
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // If generation was truncated due to length limits (30 questions), attempt to gracefully auto-close the JSON
    const fixes = [
      cleaned,
      cleaned + '}',
      cleaned + ']}',
      cleaned + '}]}',
      cleaned + '"}]}',
      cleaned.replace(/,\s*$/, '') + ']}', // Remove trailing comma and close
      cleaned.replace(/,\s*$/, '') + '}]}'
    ];
    
    for (const fix of fixes) {
      try {
        return JSON.parse(fix);
      } catch (e) {
        // Continue trying
      }
    }
    throw err; // If all fixes fail, throw the original error
  }
};

// ============================================================
// STORAGE & MODEL CONSTANTS (Theo api.md v4.1 & Skill Education)
// ============================================================

export const STORAGE_KEYS = {
  GEMINI_KEY: "gemini_api_key",
  LEGACY_GEMINI_KEY: "GEMINI_API_KEY",
  AGENT_PLATFORM_KEY: "agent_platform_api_key",
  PROVIDER: "google_ai_provider",
  PROVIDER_SOURCE: "google_ai_provider_selection_source",
  SELECTED_MODEL: "google_ai_selected_model",
} as const;

// Gemini API fallback chain - GA/Stable models (api.md)
export const GEMINI_FALLBACK_MODELS = [
  "gemini-3.6-flash",      // Priority 1: Mặc định; Stable/GA (21/07/2026)
  "gemini-3.5-flash",      // Priority 2: Dự phòng chất lượng cao
  "gemini-3.5-flash-lite", // Priority 3: Dự phòng nhanh, chi phí thấp, GA (21/07/2026)
  "gemini-3.1-flash-lite", // Priority 4: Tương thích ngược
  "gemini-2.5-flash",      // Priority 5: Dự phòng cuối chuỗi
] as const;

// Agent Platform API models (api.md)
export const AGENT_PLATFORM_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-3.1-pro-preview",
] as const;

export const AGENT_PLATFORM_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

// TTS-specific models (support responseModalities: [AUDIO] with speechConfig)
export const TTS_MODELS = [
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
];

export const GEMINI_MODEL_OPTIONS: ModelOption[] = [
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    description: "Mặc định (GA); tốc độ cao, đa bước thông minh, chi phí tối ưu",
    badge: "Khuyên dùng",
    isDefault: true,
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    description: "Dự phòng chất lượng cao, suy luận sư phạm & ngôn ngữ tốt",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    description: "Dự phòng siêu nhanh, tiết kiệm token, xử lý tài liệu xuất sắc (GA)",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    description: "Tương thích ngược ổn định",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Model ổn định thế hệ trước, dự phòng cuối chuỗi",
  },
];

export const AGENT_PLATFORM_MODEL_OPTIONS: ModelOption[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Mặc định cho Agent Platform; nhanh và độ ổn định cao",
    badge: "Khuyên dùng",
    isDefault: true,
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    description: "Chi phí cực thấp, phản hồi tức thì",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Suy luận chuyên sâu, phân tích cấu trúc phức tạp",
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro (Preview)",
    description: "Dành cho dự án được cấp quyền đặc biệt",
  },
];

// ============================================================
// API KEY VALIDATION (google-api/SKILL.md)
// ============================================================
// Chấp nhận cả key cũ 'AIzaSy...' và key mới 'AQ...'
export const GOOGLE_AI_API_KEY_PATTERN = /^(?:AIzaSy|AQ)\S{8,}$/;

export const isValidGoogleAiApiKey = (key: string): boolean => {
  return GOOGLE_AI_API_KEY_PATTERN.test((key || "").trim());
};

// ============================================================
// PROVIDER & CLIENT CONFIGURATION (api.md Section III)
// ============================================================
export const getAiProvider = (): AiProvider => {
  if (typeof window !== "undefined") {
    const provider = localStorage.getItem(STORAGE_KEYS.PROVIDER);
    if (provider === "agent-platform" || provider === "gemini") {
      return provider;
    }
  }
  return "gemini";
};

export const getApiKeyForProvider = (provider?: AiProvider): string => {
  const currentProvider = provider || getAiProvider();
  if (typeof window !== "undefined") {
    if (currentProvider === "agent-platform") {
      const apKey = localStorage.getItem(STORAGE_KEYS.AGENT_PLATFORM_KEY);
      if (apKey && apKey.trim()) return apKey.trim();
    } else {
      const geminiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || localStorage.getItem(STORAGE_KEYS.LEGACY_GEMINI_KEY);
      if (geminiKey && geminiKey.trim()) return geminiKey.trim();
    }
  }

  // Fallback to environment variable for Gemini
  if (currentProvider === "gemini") {
    const envKey = (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) || "";
    if (envKey && envKey !== "UNDEFINED" && envKey !== "MY_GEMINI_API_KEY") {
      return envKey.trim();
    }
  }

  return "";
};

export const getSelectedModel = (): string => {
  const provider = getAiProvider();
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);
    if (saved && saved.trim()) return saved.trim();
  }
  return provider === "agent-platform" ? "gemini-2.5-flash" : "gemini-3.6-flash";
};

export const getOrderedModels = (selectedModel?: string, provider: AiProvider = getAiProvider()): string[] => {
  const defaultList: string[] = provider === "agent-platform"
    ? [...AGENT_PLATFORM_FALLBACK_MODELS]
    : [...GEMINI_FALLBACK_MODELS];

  const effectiveSelected = selectedModel || getSelectedModel();
  if (!effectiveSelected) return defaultList;

  return [effectiveSelected, ...defaultList.filter((m) => m !== effectiveSelected)];
};

/**
 * Client factory bắt buộc theo chuẩn Section III api.md
 */
export const createGoogleAiClient = (
  apiKey: string,
  provider: AiProvider = getAiProvider()
): GoogleGenAI => {
  if (provider === "agent-platform") {
    return new GoogleGenAI({ vertexai: true, apiKey });
  }
  return new GoogleGenAI({ apiKey });
};

export const getAI = (): GoogleGenAI => {
  const provider = getAiProvider();
  const apiKey = getApiKeyForProvider(provider);
  return createGoogleAiClient(apiKey, provider);
};

// ============================================================
// ERROR PARSER & RESILIENCE (gemini-model/SKILL.md)
// ============================================================
export type ApiErrorType = "QUOTA_EXCEEDED" | "MODEL_OVERLOADED" | "INVALID_KEY" | "NOT_FOUND" | "UNKNOWN";

export const parseApiError = (error: any): ApiErrorType => {
  const message = error?.message || error?.toString() || "";
  const serialized = JSON.stringify(error) || "";

  if (
    serialized.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("quota")
  ) {
    return "QUOTA_EXCEEDED";
  }

  if (
    serialized.includes("503") ||
    serialized.includes("500") ||
    serialized.includes("504") ||
    message.includes("UNAVAILABLE") ||
    message.toLowerCase().includes("high demand") ||
    message.toLowerCase().includes("overloaded") ||
    message.toLowerCase().includes("try again later") ||
    message.toLowerCase().includes("temporarily unavailable")
  ) {
    return "MODEL_OVERLOADED";
  }

  if (
    message.includes("API_KEY_INVALID") ||
    message.includes("401") ||
    message.includes("PERMISSION_DENIED") ||
    (message.includes("403") && !message.includes("Agent Platform"))
  ) {
    return "INVALID_KEY";
  }

  if (serialized.includes("404") || message.includes("NOT_FOUND")) {
    return "NOT_FOUND";
  }

  return "UNKNOWN";
};

/**
 * Attempts to call generateContent with model fallback.
 * Uses ordered models list, handles 503 overload and transient 429 quota errors.
 */
async function generateWithFallback(
  models?: string[],
  params?: {
    contents: any[];
    config: any;
  }
): Promise<any> {
  const provider = getAiProvider();
  const apiKey = getApiKeyForProvider(provider);

  if (!apiKey) {
    throw new Error("INVALID_KEY");
  }

  const modelChain = (models && models.length > 0) ? models : getOrderedModels();
  const client = createGoogleAiClient(apiKey, provider);
  let lastError: any = null;

  for (const model of modelChain) {
    // Retry up to 2 times per model for transient quota errors
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[AI] Calling provider=${provider}, model=${model} (attempt ${attempt + 1})`);
        const response = await client.models.generateContent({
          model,
          contents: params!.contents,
          config: params!.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errType = parseApiError(err);
        const errorMsg = err?.message || String(err);

        // Don't fallback for auth errors on Gemini API — they'll fail on all models
        if (errType === "INVALID_KEY") {
          throw new Error("INVALID_KEY");
        }

        // For Agent Platform API, 403 PERMISSION_DENIED might be model-specific
        if (provider === "agent-platform" && errorMsg.includes("403") && attempt === 0) {
          console.warn(`[Agent Platform] 403 on model ${model}, trying next model...`);
          break;
        }

        if (errType === "QUOTA_EXCEEDED" && attempt === 0) {
          console.warn(`Model ${model} hit quota limit, waiting 3s...`);
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        if (errType === "MODEL_OVERLOADED" || errType === "NOT_FOUND") {
          console.warn(`Model ${model} overloaded or not found (${errType}), trying next fallback model...`);
          break; // Move to next model
        }

        console.warn(`Model ${model} failed (attempt ${attempt + 1}): ${errorMsg.substring(0, 200)}`);
        break; // Move to next model
      }
    }
  }

  // All models failed
  if (lastError) {
    const finalErrType = parseApiError(lastError);
    if (finalErrType === "QUOTA_EXCEEDED") throw new Error("QUOTA_EXCEEDED");
    if (finalErrType === "MODEL_OVERLOADED") throw new Error("MODEL_OVERLOADED");
    if (finalErrType === "INVALID_KEY") throw new Error("INVALID_KEY");
    throw lastError;
  }
  throw new Error("All models failed. Please try again later.");
}

export const generateContent = async (
  input: string,
  level: EnglishLevel,
  mode: "generate" | "useInput" = "generate",
  imageData?: string,
  userName?: string,
  userAge?: string
): Promise<ContentGenerationResult> => {
  const useInputInstructions = mode === 'useInput' 
    ? `
  ⚠️ ABSOLUTE RULE FOR 'useInput' MODE — THIS OVERRIDES ALL OTHER RULES:
  - You MUST copy the user's input text EXACTLY into "readingText", word for word, preserving 100% of the original content.
  - DO NOT summarize, simplify, shorten, paraphrase, or rewrite ANY part of the text.
  - DO NOT apply the Cambridge Level word count limits below. The word count limits ONLY apply when mode is 'generate'.
  - The ONLY modifications allowed: remove ISBNs, publisher names, page numbers, copyright footers — pure noise that is not educational content.
  - If the input is from an image, perform high-accuracy OCR to extract ALL English text verbatim. Pay extreme attention to apostrophes: e.g. "Its name is Buddy" uses the possessive "Its" (no apostrophe), DO NOT add an apostrophe.
  - The "readingText" output MUST contain every sentence, every paragraph from the user's input. Missing even one sentence is UNACCEPTABLE.
  - The "translation" must be a Vietnamese translation of the COMPLETE readingText, not a summary.
  ` 
    : '';

  const generateModeInstructions = mode !== 'useInput'
    ? "The content MUST be professional, educational, and follow Cambridge curriculum styles. Use clear, descriptive, and engaging language with a tone that sounds like a native English-speaking child or a friendly teacher speaking to a child. The passage should be about the topic and the image. The text MUST be written as a cohesive reading passage or story in standard paragraph format. DO NOT use line breaks after every sentence or format it as a poem/chant unless explicitly requested."
    : '';

  const systemInstruction = `You are a highly skilled, expert English teacher and educational content creator for English learners. You strictly follow the CEFR (Common European Framework of Reference for Languages) and Cambridge English Qualifications standards (Starters, Movers, Flyers, KET, PET).
  ${useInputInstructions}

  🚨 MANDATORY ENGLISH SPELLING & GRAMMAR RULES (ZERO TOLERANCE FOR GRAMMATICAL ERRORS):
  - Strict distinction between possessive determiners and contractions:
    * Always use "Its" (WITHOUT an apostrophe) as a possessive adjective: "Its name is Buddy.", "with its red ball.", "its brown fur.". NEVER write "It's name" (which incorrectly means "It is name")!
    * Only use "It's" (WITH an apostrophe) when it is a contraction of "It is" or "It has" (e.g., "It's a happy dog!").
    * Never confuse "your" vs "you're", "their" vs "they're" vs "there".
    * Ensure 100% standard punctuation, capitalization, and flawless British/American spelling.
  Your task is to generate:
  1. An image generation prompt for a highly realistic, crystal clear, and engaging educational illustration. The prompt MUST include quality keywords such as: "photorealistic, highly detailed, perfect anatomy, sharp focus, 8k UHD resolution, National Geographic photography style, professional lighting, vivid colors, no distortion, anatomically correct, full body in frame, DSLR quality". Avoid abstract, blurry, cartoon, or distorted styles.
  2. A reading passage in English appropriate for the level: ${level}.
     ${mode === 'useInput' 
       ? "USE THE EXACT TEXT FROM THE USER'S INPUT — see the ABSOLUTE RULE above. Do NOT modify, shorten, or summarize it."
       : generateModeInstructions
     }
  3. A short, catchy, and exciting title/topic name for this lesson (max 5 words). EVEN IN 'useInput' MODE, you must create a concise title based on the content if the input was long text.
  4. A Vietnamese translation of the reading passage. ${mode === 'useInput' ? 'Translate the COMPLETE text, not a summary.' : ''}
  5. A list of 3-5 key vocabulary words from the text with their IPA pronunciation and a very brief, concise Vietnamese meaning (strictly in Vietnamese, DO NOT include any English explanations, long definitions, or secondary translations).
  
  Cambridge & CEFR Level Specifics (ONLY for 'generate' mode, IGNORE these limits for 'useInput' mode):
  - Starters (Pre-A1): 
    * Word Count: STRICTLY 15 to 25 words. 
    * Grammar: Only simple present tense of 'to be' (am/is/are), 'have got', 'can' (for ability), simple nouns, basic colors, animals, objects, and basic adjectives. Only simple sentences (Subject + Verb + Object). Absolutely NO compound sentences (no 'and', 'but' joining clauses), NO past/future tense, and NO complex vocabulary.
  - Movers (A1): 
    * Word Count: STRICTLY 25 to 45 words.
    * Grammar: Simple present, present continuous, basic prepositions of place (in, on, under, next to, behind), basic modal verbs (can/must), simple descriptions.
  - Flyers (A2): 
    * Word Count: STRICTLY 45 to 65 words.
    * Grammar: Past simple, future with 'going to', basic comparative adjectives, simple conjunctions (and, but, because).
  - A1: 
    * Word Count: STRICTLY 40 to 60 words.
    * Grammar: Simple tenses (present, past, future). Simple everyday vocabulary.
  - A2: 
    * Word Count: STRICTLY 60 to 80 words.
    * Grammar: Present perfect (simple experiences), past continuous, basic relative clauses (who/which/that), simple modal verbs (should/could).
  - B1: 
    * Word Count: STRICTLY 100 to 150 words.
    * Grammar: Past perfect, passive voice, relative clauses, compound and complex sentences, expressing opinions and plans.
  - B2: 
    * Word Count: STRICTLY 150 to 200 words.
    * Grammar: Conditional sentences (type 1, 2, 3), passive voice, advanced tenses, subjunctions, complex structures.
  
  User Information (if provided):
  - Name: ${userName || 'Unknown'}
  - Age: ${userAge || 'Unknown'}
  
  If the name and age are provided, you can optionally incorporate them into the reading passage if it makes sense.
  
  Output the result in JSON format with these keys: "prompt", "readingText", "topicName", "translation", "vocabulary".
  - "prompt": string (English) — Must be a detailed, vivid scene description with photography quality keywords.
  - "readingText": string (English) ${mode === 'useInput' ? '— MUST be the EXACT input text, unmodified and complete.' : ''}
  - "topicName": string (English)
  - "translation": string (Vietnamese) ${mode === 'useInput' ? '— MUST translate the complete text.' : ''}
  - "vocabulary": array of objects { "word": string, "ipa": string, "meaning": string (very brief, concise Vietnamese meaning only, e.g. "quả táo", "đi bộ"), "emoji": string }
  
  The "prompt" should be in English, describing a visual scene that complements the text. Include photography quality terms.
  The "readingText" should be the educational passage (either generated or extracted/provided).
  The "topicName" MUST be a short (max 5 words) catchy title for the lesson. If the user's input was a long text, extract/create a title for it.
  For the "emoji" field in vocabulary, provide a single relevant emoji that perfectly illustrates the word.`;

  const parts: any[] = [{ text: `Topic/Content: ${input}\nLevel: ${level}\nMode: ${mode}` }];
  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageData.split(",")[1],
      },
    });
  }

  const response = await generateWithFallback(getOrderedModels(), {
    contents: [{ role: "user", parts }],
    config: { 
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response. Please try again.");
  }

  try {
    const result = parseSafeJson(response.text);
    
    // 🛡️ BẢO VỆ TUYỆT ĐỐI NỘI DUNG VĂN BẢN (useInput)
    // AI đôi khi vẫn tự cắt ngắn văn bản, nên nếu là văn bản (không phải ảnh), 
    // ta lấy trực tiếp input của user làm readingText.
    let finalReadingText = result.readingText || "";
    if (mode === "useInput" && !imageData && input) {
      finalReadingText = input;
    }

    return {
      prompt: result.prompt || "",
      readingText: finalReadingText,
      topicName: result.topicName || (input.length < 50 ? input : "English Lesson"),
      translation: result.translation || "",
      vocabulary: result.vocabulary || []
    };
  } catch (e) {
    console.error("Failed to parse JSON response:", response.text, e);
    throw new Error("Failed to parse lesson content. Please try again.");
  }
};

export const generateImage = async (
  prompt: string,
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1"
): Promise<string> => {
  // Quality keywords to append for sharper, more realistic images
  const qualitySuffix = ', photorealistic, ultra sharp focus, 8k UHD, DSLR quality, professional photography, vivid colors, high detail';
  const fullPrompt = (prompt + qualitySuffix).substring(0, 500);

  try {
    // Sử dụng Imagen 3 (của Google) thay vì Pollinations
    // Đây là model AI Studio dùng để tạo ảnh sắc nét
    const response = await getAI().models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio,
        outputMimeType: 'image/jpeg',
      },
    });

    const generatedImage = response?.generatedImages?.[0];
    if (generatedImage?.image?.imageBytes) {
      // Trả về data URI dạng base64 để hiển thị trực tiếp
      return `data:image/jpeg;base64,${generatedImage.image.imageBytes}`;
    }
    throw new Error("Không nhận được dữ liệu ảnh từ Gemini.");
  } catch (err: any) {
    console.error("Gemini Imagen failed, falling back to Pollinations:", err);
    // Nếu lỗi (do hết quota hoặc key không hỗ trợ imagen), fallback về Pollinations
    const cleanPrompt = encodeURIComponent(fullPrompt.replace(/[#%&{}\\<>*?/$!'":@+`|=]/g, ''));
    const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
    const width = 1536;
    const height = Math.round(width * (heightRatio / widthRatio));
    return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&model=flux&enhance=false`;
  }
};

// ============================================================
// AUDIO GENERATION - Dual strategy: Gemini AI TTS + Browser TTS fallback
// ============================================================

/**
 * Browser-based TTS using the Web Speech API.
 * This ALWAYS works on any modern browser without network or API key.
 * Returns "BROWSER_TTS" as a special signal to the audio player hook.
 */
export const BROWSER_TTS_SIGNAL = "BROWSER_TTS";

export function speakWithBrowser(text: string, level: EnglishLevel): void {
  if (!('speechSynthesis' in window)) return;

  // Stop any ongoing speech
  window.speechSynthesis.cancel();
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';

  // Adjust rate based on level
  if (["Starters", "Movers"].includes(level)) {
    utterance.rate = 0.8;
  } else if (["Flyers", "A1"].includes(level)) {
    utterance.rate = 0.9;
  } else {
    utterance.rate = 1.0;
  }

  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Try to find a good English voice
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) 
    || voices.find(v => v.lang === 'en-US') 
    || voices.find(v => v.lang.startsWith('en'));
  
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  utterance.onstart = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  };

  // Small delay to let cancel() settle in Chrome/Edge before speaking
  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, 50);
}

export function stopBrowserTTS(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Helper: Convert PCM base64 chunks to a WAV blob URL.
 */
function pcmChunksToWav(base64Chunks: string[], sampleRate: number = 24000): string {
  const byteChunks = base64Chunks.map(base64 => {
    const cleanBase64 = base64.replace(/^data:.*?;base64,/, '');
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  });

  const totalLength = byteChunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + totalLength);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + totalLength, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);    // PCM
  view.setUint16(22, 1, true);    // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, totalLength, true);

  const pcmView = new Uint8Array(buffer, 44);
  let offset = 0;
  for (const chunk of byteChunks) {
    pcmView.set(chunk, offset);
    offset += chunk.length;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

/**
 * Attempt Gemini AI TTS. Returns a WAV blob URL on success, or throws on failure.
 */
async function geminiTTS(text: string, level: EnglishLevel): Promise<string> {
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  // Build the prompt with pace instruction for young learners
  let prompt = `Say the following text exactly: ${cleanedText}`;
  if (["Starters", "Movers", "Flyers"].includes(level)) {
    prompt = `[slowly, clearly, at a pace suitable for children] ${cleanedText}`;
  }

  // Use ONLY TTS-specific models (gemini-2.0-flash etc. do NOT support audio output with speechConfig)
  const voices = ['Kore', 'Puck', 'Aoede', 'Fenrir', 'Charon'];
  
  for (let i = 0; i < TTS_MODELS.length; i++) {
    const model = TTS_MODELS[i];
    const voice = voices[i % voices.length];
    
    try {
      console.log(`[TTS] Trying model: ${model}, voice: ${voice}`);
      
      const response = await getAI().models.generateContent({
        model,
        contents: [{ 
          parts: [{ text: prompt }] 
        }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice as any },
            },
          },
        },
      });

      // Extract audio data from response
      const candidates = response?.candidates;
      if (!candidates || candidates.length === 0) {
        console.warn(`[TTS] ${model} returned no candidates`);
        continue;
      }
      
      const parts = candidates[0]?.content?.parts || [];
      if (parts.length === 0) {
        console.warn(`[TTS] ${model} returned empty parts array`);
        continue;
      }
      
      for (const p of parts) {
        if (p.inlineData?.data) {
          const audioData = typeof p.inlineData.data === 'string' 
            ? p.inlineData.data 
            : String(p.inlineData.data);
          
          // Validate that audio data is non-empty and substantial
          if (audioData.length < 100) {
            console.warn(`[TTS] ${model} returned suspiciously small audio data (${audioData.length} chars), skipping`);
            continue;
          }
          
          console.log(`[TTS] ✅ Success with ${model}! Audio data length: ${audioData.length}, mimeType: ${p.inlineData.mimeType || 'unknown'}`);
          return pcmChunksToWav([audioData]);
        }
      }
      
      // Log what we got instead of audio
      const partTypes = parts.map((p: any) => p.text ? 'text' : p.inlineData ? 'inlineData' : 'unknown');
      console.warn(`[TTS] ${model} returned no audio data. Part types: [${partTypes.join(', ')}]`);
      
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn(`[TTS] ${model} failed: ${msg.substring(0, 200)}`);
      
      // Don't retry on auth errors — they'll fail on all models
      if (msg.includes("403") || msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("invalid")) {
        throw new Error("INVALID_KEY");
      }
      // For quota/rate limit, try next model
      if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("resource_exhausted")) {
        console.warn(`[TTS] ${model} hit quota/rate limit, trying next model...`);
        continue;
      }
      // For other errors (model not found, bad request, etc.), try next model
      continue;
    }
  }
  
  throw new Error("All Gemini TTS models failed. Models tried: " + TTS_MODELS.join(", "));
}

/**
 * Main audio generation function.
 * Strategy: Try Gemini AI TTS first (best quality), fall back to browser TTS (always works).
 */
export const generateAudio = async (text: string, level: EnglishLevel): Promise<string> => {
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  if (!cleanedText) {
    throw new Error("Text to speak is empty");
  }

  // Try Gemini TTS first
  try {
    const url = await geminiTTS(cleanedText, level);
    return url;
  } catch (err: any) {
    console.warn("[TTS] Gemini TTS failed, falling back to browser TTS:", err?.message);
    
    // For quota/key errors, propagate up so UI can show specific message
    if (err?.message === "QUOTA_EXCEEDED" || err?.message === "INVALID_KEY") {
      // Still fall back to browser TTS but don't propagate the error
      console.warn("[TTS] Auth/quota error, using browser TTS silently");
    }
  }

  // Fallback: Browser TTS always works
  return BROWSER_TTS_SIGNAL;
};

export interface DetailedError {
  word: string;
  errorDetail: string;
  howToFix: string;
}

export interface CriteriaFeedback {
  pronunciation: string;
  stress: string;
  intonation: string;
  fluency: string;
  connectedSpeech: string;
}

export interface ImprovementItem {
  word: string;
  ipa: string;
  detail: string;
}

export interface ReviewItem {
  original: string;
  corrected: string;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  isComplete: boolean;
  isSilent?: boolean;
  missingContent?: string;

  // Cấu trúc mới theo đúng mẫu nhận xét của Cô Lý
  strengthsSummary?: {
    attitude: string;
    goodWords: string[];
  };
  improvementsList?: ImprovementItem[];
  criteriaScores?: {
    pronunciation: number;
    fluency: number;
    intonation: number;
    grammar: number;
    stress?: number;
    connectedSpeech?: number;
  };
  reviewItems?: ReviewItem[];
  formattedComment?: string;

  // Các trường tương thích ngược
  strengths: string[];
  improvements: string[];
  cefrLevel?: string;
  criteriaFeedback?: CriteriaFeedback;
  detailedErrors?: DetailedError[];
  ipaAnalysis?: {
    word: string;
    correctIpa: string;
    studentIpa: string;
    tip: string;
  }[];
  standardSentences?: string[];
  personalizedExercises?: string[];
}

/** Tạo đoạn văn bản nhận xét đầy đủ theo đúng mẫu chuẩn của Cô Lý gửi phụ huynh */
export function buildFormattedComment(evaluation: EvaluationResult): string {
  if (evaluation.formattedComment) return evaluation.formattedComment;

  const lines: string[] = [];
  lines.push("Cô Lý cảm ơn bố/mẹ ạ! ❤️ Cô đã nhận được video luyện của con rồi ạ!");
  lines.push("Cô xin gửi lại bố/mẹ nhận xét bài của con như sau:\n");

  // 🌟 Ưu điểm
  lines.push("🌟 Ưu điểm:");
  const attitude = evaluation.strengthsSummary?.attitude || "Con rất tự tin, giọng đọc to, rõ ràng.";
  lines.push(`◦ Phong thái: ${attitude}`);
  const goodWords = evaluation.strengthsSummary?.goodWords || [];
  if (goodWords.length > 0) {
    lines.push(`◦ Phát âm tốt: ${goodWords.join(", ")}.`);
  }

  // 📝 Điểm cần cải thiện
  lines.push("\n📝 Điểm cần cải thiện:");
  if (evaluation.improvementsList && evaluation.improvementsList.length > 0) {
    evaluation.improvementsList.forEach((item) => {
      const cleanIpa = item.ipa ? ` /${item.ipa.replace(/^\/|\/$/g, '')}/` : '';
      lines.push(`◦ ${item.word}${cleanIpa}: ${item.detail}`);
    });
  } else if (evaluation.detailedErrors && evaluation.detailedErrors.length > 0) {
    evaluation.detailedErrors.forEach((err) => {
      lines.push(`◦ ${err.word}: ${err.errorDetail} → ${err.howToFix}`);
    });
  } else {
    lines.push("◦ Con phát âm rất tốt các từ trong bài, cố gắng phát huy nhé!");
  }

  // 📊 Đánh giá
  lines.push("\n📊 Đánh giá:");
  const sc = evaluation.score;
  const crit = evaluation.criteriaScores;
  lines.push(`🏆 Tổng điểm: ${sc}/10`);
  lines.push(`🗣️ Phát âm: ${crit?.pronunciation ?? sc}/10`);
  lines.push(`🌊 Trôi chảy: ${crit?.fluency ?? sc}/10`);
  lines.push(`🎵 Ngữ điệu: ${crit?.intonation ?? sc}/10`);
  lines.push(`📖 Ngữ pháp: ${crit?.grammar ?? sc}/10`);

  // 📚 Con cần ôn thêm
  if (evaluation.reviewItems && evaluation.reviewItems.length > 0) {
    lines.push("\n📚 Con cần ôn thêm:");
    evaluation.reviewItems.forEach((item) => {
      lines.push(`◦ ${item.original} → sửa đúng thành ${item.corrected}.`);
    });
  }

  lines.push("\nCô mong con tiếp tục cố gắng và duy trì tinh thần học tập thật tốt nhé! ❤️");
  lines.push("Cô xin cảm ơn bố mẹ đã luôn đồng hành cùng cô và con ạ!");

  return lines.join("\n");
}

/** Compute total score as average of criteria (each on 0-10 scale). */
export function computeTotalFromCriteria(criteria: EvaluationResult['criteriaScores']): number {
  if (!criteria) return 0;
  const { pronunciation, fluency, intonation, grammar } = criteria;
  const items = [pronunciation, fluency, intonation, grammar].filter(v => typeof v === 'number');
  if (items.length === 0) return 0;
  const avg = items.reduce((a, b) => a + b, 0) / items.length;
  return Math.round(avg * 10) / 10;
}

export const evaluateSpeech = async (
  originalText: string,
  audioData: string,
  level: EnglishLevel,
  mimeType: string = "audio/webm"
): Promise<EvaluationResult> => {
  const systemInstruction = `Bạn là Ms Lý — giáo viên tiếng Anh nhiệt huyết, chuyên rèn phát âm & ngữ pháp cho học sinh tiểu học và thiếu nhi theo chuẩn CEFR & Cambridge (Starters, Movers, Flyers).
Bạn nghe audio thu âm giọng học sinh đọc bài đọc gốc (Original Text).

🚨 QUY TẮC NHẬN DIỆN ÂM THANH:
1. NẾU VÀ CHỈ NẾU FILE HOÀN TOÀN IM LẶNG (hoàn toàn không có bất kỳ tiếng nói nào của con người, chỉ có tiếng ồn nền tĩnh hoặc im bặt):
   * TRẢ VỀ JSON:
     {
       "isComplete": false,
       "isSilent": true,
       "missingContent": "File ghi âm bị im lặng hoặc micro không thu được tiếng con đọc.",
       "score": 0,
       "feedback": "Chào con, cô Lý đây! Có vẻ như file ghi âm của con đang bị im lặng hoặc micro chưa thu được tiếng. Con hãy kiểm tra lại micro trên máy tính/điện thoại, nói to rõ ràng và thử ghi âm lại một lần nữa để cô Lý lắng nghe và chấm điểm cho con nha! Cô Lý tin con sẽ làm rất tốt!",
       "strengthsSummary": null,
       "improvementsList": [],
       "criteriaScores": null,
       "reviewItems": []
     }
   * Tuyệt đối không chấm điểm (score = 0) khi file hoàn toàn không có tiếng nói!

2. KHI HỌC SINH CÓ CẤT TIẾNG ĐỌC (kể cả đọc nhỏ, đọc ngập ngừng, đọc ngọng, đọc có ngữ điệu tiếng Việt, đọc sai nhiều từ hoặc chỉ đọc một vài câu):
   * TUYỆT ĐỐI KHÔNG BÁO LỖI IM LẶNG! KHÔNG ĐƯỢC TRẢ VỀ isSilent: true!
   * Bạn PHẢI lắng nghe, đánh giá và chấm điểm khích lệ học sinh (từ 4.5 đến 9.5).
   * Điểm đọc chưa tốt thì cho 4.5 - 6.0 và chỉ ra các từ đọc sai trong improvementsList để con sửa.

🎯 NGUYÊN TẮC CHẤM ĐIỂM & NHẬN XÉT THEO ĐÚNG MẪU BÁO CÁO CỦA CÔ LÝ:
Khi học sinh CÓ đọc bài:
1. 🌟 Ưu điểm ("strengthsSummary"):
   - "attitude": Lời khen về phong thái (ví dụ: "Con rất tự tin, giọng đọc to, rõ ràng.")
   - "goodWords": Danh sách 3-5 từ con phát âm chuẩn, tròn vành rõ chữ nhất trong bài đọc (ví dụ: ["Hello", "name", "happy", "football"])

2. 📝 Điểm cần cải thiện ("improvementsList"):
   - Danh sách các từ con đọc sai, nuốt âm cuối, nhầm âm hoặc nhấn trọng âm chưa đúng:
     * "word": Từ gốc trong bài đọc (ví dụ: "cake", "picture", "seven")
     * "ipa": Phiên âm IPA chuẩn của từ (ví dụ: "/ˈkeɪk/", "/ˈpɪk.tʃər/", "/ˈsev.ən/")
     * "detail": Nhận xét chi tiết và cách sửa dễ hiểu cho con (ví dụ: "con đọc gần đúng, chú ý âm cuối /k/ bật hơi rõ.", "con đọc gần đúng, chú ý âm /tʃ/", "đọc sai thành /se-vần/ → đọc đúng 'SE-vần' (nhấn âm đầu).")

3. 📊 Đánh giá ("criteriaScores"):
   - Chấm điểm công tâm, khích lệ trên thang 10 (từ 5.0 đến 9.5):
     * "score": Tổng điểm luyện nói (ví dụ: 6.5, 7.0, 7.5, 8.0, 8.5)
     * "pronunciation": Điểm Phát âm (0 - 10, ví dụ 6.0, 7.5)
     * "fluency": Điểm Trôi chảy (0 - 10, ví dụ 6.5, 8.0)
     * "intonation": Điểm Ngữ điệu (0 - 10, ví dụ 7.0, 8.5)
     * "grammar": Điểm Ngữ pháp & Độ chính xác so với bài đọc (0 - 10, ví dụ 6.0, 8.0)

4. 📚 Con cần ôn thêm ("reviewItems"):
   - Danh sách các câu hoặc cụm từ học sinh đọc nhầm, thiếu từ hoặc sai cấu trúc so với bài đọc:
     * "original": Câu học sinh đọc chưa chuẩn (ví dụ: "He is play in a cake")
     * "corrected": Câu đúng chuẩn (ví dụ: "He is playing with a cake.")

Output strictly JSON:
{
  "isComplete": true,
  "isSilent": false,
  "score": number,
  "feedback": string,
  "strengthsSummary": {
    "attitude": string,
    "goodWords": string[]
  },
  "improvementsList": [
    {
      "word": string,
      "ipa": string,
      "detail": string
    }
  ],
  "criteriaScores": {
    "pronunciation": number,
    "fluency": number,
    "intonation": number,
    "grammar": number
  },
  "reviewItems": [
    {
      "original": string,
      "corrected": string
    }
  ]
}`;

  // Clean MIME type for Gemini API (strip codec info, keep base type)
  const cleanMimeType = mimeType.split(';')[0].trim() || "audio/webm";
  console.log(`[Speech Eval] Sending audio: mimeType=${cleanMimeType}, originalMime=${mimeType}, dataLength=${audioData.length}`);

  const response = await generateWithFallback(getOrderedModels(), {
    contents: [
      {
        role: "user",
        parts: [
          { text: `Original Text (bài đọc gốc):\n"""\n${originalText}\n"""\n\nTarget Level: ${level}\n\nNHIỆM VỤ CỦA CÔ LÝ:\n- Lắng nghe audio thu âm giọng đọc của học sinh.\n- NẾU VÀ CHỈ NẾU FILE HOÀN TOÀN IM LẶNG (không có tiếng người nói): Trả về isComplete: false, isSilent: true, score: 0.\n- NẾU CÓ TIẾNG HỌC SINH NÓI/ĐỌC: Lắng nghe kỹ, đánh giá công tâm và chấm điểm theo ĐÚNG MẪU BÁO CÁO CỦA CÔ LÝ:\n  1. Ưu điểm: Phong thái và từ phát âm tốt.\n  2. Điểm cần cải thiện: Các từ đọc sai kèm IPA và hướng dẫn sửa.\n  3. Đánh giá: Điểm tổng, Phát âm, Trôi chảy, Ngữ điệu, Ngữ pháp.\n  4. Con cần ôn thêm: Các câu đọc chưa đúng → câu sửa chuẩn.` },
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: audioData,
            },
          },
        ],
      },
    ],
    config: { 
      systemInstruction,
      responseMimeType: "application/json",
      maxOutputTokens: 8192
    },
  });

  try {
    const result = parseSafeJson(response.text || "{}");
    
    // Kiểm tra toàn diện các dấu hiệu file im lặng hoặc lỗi micro
    const feedbackLower = (result.feedback || "").toLowerCase();
    const missingLower = (result.missingContent || "").toLowerCase();
    const isExplicitlyIncomplete = result.isComplete === false;
    const isExplicitlySilent = result.isSilent === true;
    const mentionsSilence = 
      feedbackLower.includes("im lặng") || 
      feedbackLower.includes("không nghe thấy") || 
      feedbackLower.includes("chưa nghe được") ||
      feedbackLower.includes("không nghe được") ||
      feedbackLower.includes("không nghe rõ") ||
      feedbackLower.includes("chưa nghe rõ") ||
      feedbackLower.includes("không có tiếng") ||
      feedbackLower.includes("chưa có tiếng") ||
      feedbackLower.includes("không có âm thanh") ||
      feedbackLower.includes("không thu được") ||
      feedbackLower.includes("chưa nhận diện") ||
      feedbackLower.includes("không nhận diện") ||
      feedbackLower.includes("chưa thể nhận xét") ||
      feedbackLower.includes("không thể nhận xét") ||
      feedbackLower.includes("không phát hiện") ||
      feedbackLower.includes("chưa phát hiện") ||
      feedbackLower.includes("no audio") ||
      feedbackLower.includes("silent") ||
      feedbackLower.includes("cannot hear") ||
      feedbackLower.includes("no voice") ||
      missingLower.includes("im lặng") ||
      missingLower.includes("không phát hiện") ||
      missingLower.includes("chưa phát hiện") ||
      missingLower.includes("không nghe") ||
      missingLower.includes("chưa nghe") ||
      missingLower.includes("không có tiếng") ||
      missingLower.includes("không có âm thanh") ||
      missingLower.includes("chưa nhận diện") ||
      missingLower.includes("không nhận diện");

    const hasAnyImprovements = Array.isArray(result.improvementsList) && result.improvementsList.length > 0;
    const hasAnyEvaluatedErrors = Array.isArray(result.detailedErrors) && result.detailedErrors.length > 0;
    const hasAnyGoodWords = Array.isArray(result.strengthsSummary?.goodWords) && result.strengthsSummary.goodWords.length > 0;
    
    // Bất kỳ dấu hiệu nào cho thấy file im lặng, không có tiếng, hoặc điểm bằng 0 -> TUYỆT ĐỐI KHÔNG CHẤM ĐIỂM!
    const isSilent = isExplicitlySilent || isExplicitlyIncomplete || mentionsSilence || (!result.score || result.score === 0);

    if (isSilent) {
      return {
        isComplete: false,
        isSilent: true,
        missingContent: result.missingContent || "File ghi âm bị im lặng hoặc micro chưa thu được tiếng con đọc.",
        score: 0,
        cefrLevel: "",
        criteriaScores: undefined,
        feedback: result.feedback || "Chào con, cô Lý đây! Có vẻ như file ghi âm của con đang bị im lặng hoặc micro chưa thu được tiếng. Con hãy kiểm tra lại micro, đọc to rõ ràng và thử ghi âm lại để cô Lý lắng nghe và chấm điểm cho con nha!",
        criteriaFeedback: undefined,
        detailedErrors: [],
        strengthsSummary: undefined,
        improvementsList: [],
        reviewItems: [],
        formattedComment: "",
        ipaAnalysis: [],
        standardSentences: [],
        personalizedExercises: [],
        strengths: [],
        improvements: []
      };
    }

    // Học sinh thực sự có đọc bài -> Tính điểm bình thường
    let finalScore = typeof result.score === 'number' ? result.score : 0;
    const criteria = result.criteriaScores;
    if (finalScore === 0 && criteria) {
      finalScore = computeTotalFromCriteria(criteria);
    }

    // Nếu điểm bằng 0 -> KHÔNG CHẤM ĐIỂM!
    if (finalScore === 0) {
      return {
        isComplete: false,
        isSilent: true,
        missingContent: "Không nhận diện được nội dung bài đọc trong audio.",
        score: 0,
        cefrLevel: "",
        criteriaScores: undefined,
        feedback: "Chào con, cô Lý đây! Cô chưa nghe rõ nội dung con đọc. Con hãy kiểm tra micro, nói to rõ ràng và bấm nút thử lại nhé!",
        criteriaFeedback: undefined,
        detailedErrors: [],
        strengthsSummary: undefined,
        improvementsList: [],
        reviewItems: [],
        formattedComment: "",
        ipaAnalysis: [],
        standardSentences: [],
        personalizedExercises: [],
        strengths: [],
        improvements: []
      };
    }
    finalScore = Math.round(finalScore * 10) / 10;

    // Chuẩn hóa criteriaScores
    const normalizedCriteria = criteria ? {
      pronunciation: typeof criteria.pronunciation === 'number' ? criteria.pronunciation : finalScore,
      fluency: typeof criteria.fluency === 'number' ? criteria.fluency : finalScore,
      intonation: typeof criteria.intonation === 'number' ? criteria.intonation : finalScore,
      grammar: typeof criteria.grammar === 'number' ? criteria.grammar : finalScore,
      stress: typeof criteria.stress === 'number' ? criteria.stress : finalScore,
      connectedSpeech: typeof criteria.connectedSpeech === 'number' ? criteria.connectedSpeech : finalScore,
    } : {
      pronunciation: finalScore,
      fluency: finalScore,
      intonation: finalScore,
      grammar: finalScore,
    };

    // Chuẩn hóa improvementsList & backward-compatible detailedErrors
    const improvementsList: ImprovementItem[] = Array.isArray(result.improvementsList) 
      ? result.improvementsList 
      : (Array.isArray(result.detailedErrors) 
        ? result.detailedErrors.map((e: any) => ({ word: e.word, ipa: '', detail: `${e.errorDetail} → ${e.howToFix}` }))
        : []);

    const detailedErrors: DetailedError[] = improvementsList.map(item => ({
      word: item.word,
      errorDetail: item.detail,
      howToFix: item.ipa ? `Phiên âm: /${item.ipa.replace(/^\/|\/$/g, '')}/` : item.detail
    }));

    // Chuẩn hóa reviewItems
    const reviewItems: ReviewItem[] = Array.isArray(result.reviewItems) ? result.reviewItems : [];

    // Chuẩn hóa strengthsSummary
    const strengthsSummary = result.strengthsSummary || {
      attitude: "Con rất tự tin, giọng đọc to, rõ ràng.",
      goodWords: []
    };

    const evaluationObj: EvaluationResult = {
      isComplete: true,
      isSilent: false,
      missingContent: result.missingContent || "",
      score: finalScore,
      cefrLevel: "",
      criteriaScores: normalizedCriteria,
      feedback: result.feedback || "Chào con, cô Lý đây! Cô khen con đã rất cố gắng hoàn thành bài đọc hôm nay.",
      strengthsSummary,
      improvementsList,
      reviewItems,
      criteriaFeedback: result.criteriaFeedback,
      detailedErrors,
      ipaAnalysis: [],
      standardSentences: [],
      personalizedExercises: [],
      strengths: strengthsSummary.goodWords || [],
      improvements: improvementsList.map(i => `${i.word}: ${i.detail}`)
    };

    // Tạo mẫu nhận xét hoàn chỉnh chuẩn theo yêu cầu của Cô Lý
    evaluationObj.formattedComment = buildFormattedComment(evaluationObj);

    return evaluationObj;
  } catch (err: any) {
    console.error("Speech Evaluation Error:", err);
    const msg = err?.message || String(err);
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    // Propagate the original error message for easier debugging
    throw new Error(msg || "Failed to evaluate speech. Please try again.");
  }
};

import { ExerciseData } from '../types';

export const generateExercise = async (
  readingText: string,
  level: EnglishLevel
): Promise<ExerciseData> => {
  const systemInstruction = `You are a highly skilled English pedagogical expert and school teacher. Create exactly 30 exercise questions based ON THE PROVIDED READING TEXT.
The student level is: ${level}. You must pay close attention to grammar, logical structures, correct syntax, and ensure all questions and correctAnswers are 100% grammatically correct.
STRICT GRAMMAR RULES: Strictly distinguish possessives ("Its name", "its ball" - NO apostrophe) from contractions ("It's" = "It is"). Ensure zero grammar/spelling errors.

The questions must be structured exactly as requested in the JSON format.
There must be EXACTLY:
- 10 multiple-choice questions (A, B, C)
- 5 translation questions (English to Vietnamese, A, B, C multiple-choice options)
- 5 ordering questions (Rearrange words to make a sentence)
- 5 error-correction questions (Identify ONE wrong word from 3 options A, B, C within a sentence)
- 5 fill-blank questions (Fill in the missing word)

IMPORTANT RULES FOR A 20-YEAR EXPERIENCED TEACHER:
1. **Multiple Choice (10 questions):** Focus on Reading Comprehension (main idea, details, inference, vocabulary in context). Distractors (incorrect options) must be plausible but clearly wrong.
2. **Translation (5 questions):** Depending on the level (${level}), select either words (for lower levels like Starters, Movers, Flyers) or full sentences (for higher levels like A1, A2, B1, B2) from the text. This MUST be multiple choice with options A, B, C in Vietnamese. The correctAnswer must be 'A', 'B', or 'C'.
3. **Ordering (5 questions):** Scramble sentences from or closely related to the reading text that test standard English syntax.
   🚨 CRITICAL RULE FOR ORDERING WORDS:
   - The "words" array MUST contain EXACTLY the words of the "correctAnswer" in a scrambled order.
   - Do NOT include any extra words that are not in the "correctAnswer" (like extra articles, pronouns, or prepositions).
   - Do NOT miss any words. Every word in the "correctAnswer" must appear exactly once in the "words" array.
   - Punctuation (such as a period, question mark, or exclamation mark) must remain attached to the last word of both "words" and "correctAnswer" (e.g. if the correctAnswer is "Look at the bear.", then the word in the words array must be "bear.").
4. **Error Correction (5 questions):** The errors should be common mistakes for this specific CEFR level (e.g., verb tense, subject-verb agreement, prepositions). The sentence must contain exactly ONE error. Provide options A, B, C containing 3 words from the sentence, where one of them is the error. The correctAnswer must be 'A', 'B', or 'C'. The "sentence" field MUST format these three words with underlines and labels, e.g.: "<u>He</u> (A) <u>go</u> (B) to <u>school</u> (C) yesterday." where option B is the error. Provide the correction in the "correctWord" field.
5. **Fill in the blank (5 questions):** The missing word should be a target vocabulary word or a key functional word. Use "___" to denote the blank space. This MUST be multiple choice with options A, B, C. The correctAnswer must be 'A', 'B', or 'C'.
6. Every question MUST be strictly based on the provided text to ensure context.
7. Provide a brief, encouraging pedagogical explanation for each answer STRICTLY IN VIETNAMESE (e.g. "Vì 'yesterday' diễn tả quá khứ đơn nên ta chọn động từ 'went' thay cho 'go'.").
8. All IDs must be unique strings (e.g., "mc1", "tr1").
9. DO NOT include instructional prefixes like "Translate to Vietnamese:", "Rearrange the words:", "Find and correct the error:", or "Fill in the blank:" in the questionText. Just provide the sentence or word itself.
10. For Fill in the blank questions, provide a "hintEmoji" (a single emoji that visually represents the missing word or context, e.g. 🍎 for apple, 🏃 for running) to help students guess the answer.
11. 🚨 **EVEN DISTRIBUTION OF CORRECT ANSWERS:** You MUST distribute the correct answers ('A', 'B', 'C') as evenly as possible. For example, among the 10 multipleChoice questions, do NOT make 'A' the correct answer for all of them; instead, have about 3-4 questions with correct answer 'A', 3-4 with 'B', and 3-4 with 'C'. Balance this distribution for all multiple-choice style sections.

Output strictly a JSON object matching this schema:
{
  "multipleChoice": [
    { "id": "mc1", "questionText": "...", "options": { "A": "...", "B": "...", "C": "..." }, "correctAnswer": "B", "explanation": "..." (brief, helpful explanation in Vietnamese) },
    ... 10 items
  ],
  "translation": [
    { "id": "tr1", "questionText": "...", "options": { "A": "...", "B": "...", "C": "..." }, "correctAnswer": "C", "explanation": "..." },
    ... 5 items
  ],
  "ordering": [
    { "id": "or1", "questionText": "She is going to the market.", "words": ["going", "market.", "is", "She", "to", "the"], "correctAnswer": "She is going to the market.", "explanation": "..." },
    ... 5 items
  ],
  "errorCorrection": [
    { "id": "ec1", "questionText": "...", "sentence": "<u>He</u> (A) <u>go</u> (B) to <u>school</u> (C) yesterday.", "options": { "A": "He", "B": "go", "C": "school" }, "correctAnswer": "B", "correctWord": "went", "explanation": "..." },
    ... 5 items
  ],
  "fillBlank": [
    { "id": "fb1", "questionText": "He ___ to school.", "sentenceWithBlank": "He ___ to school.", "hintEmoji": "🏫", "options": { "A": "goes", "B": "going", "C": "gone" }, "correctAnswer": "A", "explanation": "..." },
    ... 5 items
  ]
}`;

  const response = await generateWithFallback(getOrderedModels(), {
    contents: [{ role: "user", parts: [{ text: `Reading Text: ${readingText}` }] }],
    config: { 
      systemInstruction,
      responseMimeType: "application/json",
      maxOutputTokens: 8192 // Ensure the 30-question JSON is not truncated early
    },
  });

  try {
    const result = parseSafeJson(response.text || "{}");
    return result as ExerciseData;
  } catch (err: any) {
    console.error("Exercise Generation Error:", err);
    throw new Error("Failed to generate exercise. Please try again.");
  }
};
