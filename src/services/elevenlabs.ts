// ============================================================
// 🎙️ ElevenLabs — giọng đọc AI thứ hai (cạnh Leda của Gemini)
// Key do cô tự dán, CHỈ lưu trên máy cô (localStorage), gọi thẳng API ElevenLabs.
// ============================================================
const KEY = 'el_api_key';
const VOICE = 'el_voice_id';
const PROVIDER = 'tts_provider';

export type TtsProvider = 'gemini' | 'elevenlabs';

/** Giọng mặc định: Rachel — nữ, Anh Mỹ, ấm và rõ (giọng có sẵn của ElevenLabs) */
export const DEFAULT_EL_VOICE = '21m00Tcm4TlvDq8ikWAM';

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } },
  set: (k: string, v: string) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* bỏ qua */ } },
};

export const getElKey = () => ls.get(KEY);
export const setElKey = (k: string) => ls.set(KEY, k.trim());
export const getElVoice = () => ls.get(VOICE) || DEFAULT_EL_VOICE;
export const setElVoice = (v: string) => ls.set(VOICE, v);
export const getTtsProvider = (): TtsProvider => (ls.get(PROVIDER) === 'elevenlabs' && getElKey() ? 'elevenlabs' : 'gemini');
export const setTtsProvider = (p: TtsProvider) => ls.set(PROVIDER, p);

export interface ElVoice { voice_id: string; name: string; accent?: string; gender?: string; description?: string }

const elError = async (r: Response) => {
  let msg = `ElevenLabs lỗi ${r.status}`;
  try {
    const j = await r.json();
    const d = j?.detail;
    const s = typeof d === 'string' ? d : d?.message || d?.status || '';
    if (s) msg += `: ${s}`;
  } catch { /* bỏ qua */ }
  if (r.status === 401) msg = 'Key ElevenLabs không đúng hoặc thiếu quyền (cần quyền Text to Speech và Voices).';
  if (r.status === 429) msg = 'ElevenLabs đang giới hạn lượt — đợi một lát rồi thử lại.';
  if (/quota|credit/i.test(msg)) msg = 'Tài khoản ElevenLabs đã hết ký tự trong tháng.';
  return new Error(msg);
};

/** Danh sách giọng trong tài khoản (ưu tiên giọng Anh Mỹ) */
export const listElVoices = async (key = getElKey()): Promise<ElVoice[]> => {
  const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } });
  if (!r.ok) throw await elError(r);
  const j = await r.json();
  const vs: ElVoice[] = (j.voices || []).map((v: any) => ({
    voice_id: v.voice_id, name: v.name,
    accent: v.labels?.accent, gender: v.labels?.gender, description: v.labels?.description || v.labels?.descriptive,
  }));
  const us = (v: ElVoice) => (/american|us/i.test(v.accent || '') ? 0 : 1);
  return vs.sort((a, b) => us(a) - us(b) || a.name.localeCompare(b.name));
};

/** Ký tự còn lại trong tháng */
export const elRemaining = async (key = getElKey()): Promise<number | null> => {
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key } });
    if (!r.ok) return null;
    const j = await r.json();
    return Math.max(0, (j.character_limit || 0) - (j.character_count || 0));
  } catch { return null; }
};

const toB64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Đọc văn bản bằng ElevenLabs → MP3 base64 */
export const elSpeak = async (text: string, level = ''): Promise<string> => {
  const key = getElKey();
  if (!key) throw new Error('Chưa có key ElevenLabs.');
  const slow = ['Starters', 'Movers'].includes(level);
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${getElVoice()}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: text.replace(/\s+\n/g, '\n').trim(),
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: slow ? 0.88 : 0.95 },
    }),
  });
  if (!r.ok) throw await elError(r);
  return toB64(await r.arrayBuffer());
};
