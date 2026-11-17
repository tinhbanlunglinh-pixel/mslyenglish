// ============================================================
// 🖼️🎙️ Ảnh minh hoạ + giọng đọc AI cho bài nói (dùng API key của cô)
// Ảnh: Imagen (nếu key hỗ trợ) → nén JPEG 800px; không được thì dùng ảnh Pollinations.
// Giọng đọc: Gemini TTS → WAV 16 kHz mono (base64) để lưu Firebase; lỗi thì trả null
// (học sinh vẫn nghe bằng giọng đọc của trình duyệt).
// ============================================================
import { generateImage, generateAudio, BROWSER_TTS_SIGNAL, EnglishLevel } from '../services/geminiService';
import { pcmToWav } from './audioUtils';

const IMG_STYLE = ', cute colorful children\'s picture book illustration, bright cheerful colors, no text, no letters';

const compressImage = (src: string, maxW = 800, quality = 0.78): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Ảnh lỗi'));
    img.src = src;
  });

/** Tạo ảnh minh hoạ. Trả về data URI (đã nén) hoặc URL ảnh; null nếu không tạo được. */
export const makeLessonImage = async (prompt: string, topic: string): Promise<string | null> => {
  const base = (prompt || `An illustration for an English lesson about ${topic}`).replace(/photorealistic|8k|DSLR[^,]*|National Geographic[^,]*/gi, '');
  try {
    const out = await generateImage(base.slice(0, 380) + IMG_STYLE, '16:9');
    if (out.startsWith('data:')) return await compressImage(out);
    return null; // ảnh dự phòng có watermark → không dùng, giữ ảnh hiện tại
  } catch {
    return null;
  }
};

const blobToBase64 = (b: Blob): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] || '');
    r.onerror = rej;
    r.readAsDataURL(b);
  });

/** Tạo giọng đọc AI. Trả về WAV 16 kHz base64; null nếu key không tạo được (dùng giọng trình duyệt). */
export const makeLessonAudio = async (text: string, level: string): Promise<string | null> => {
  const url = await generateAudio(text, level as EnglishLevel);
  if (!url || url === BROWSER_TTS_SIGNAL) return null;
  try {
    const buf = await (await fetch(url)).arrayBuffer();
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new Ctx();
    const decoded = await ctx.decodeAudioData(buf);
    ctx.close();
    const rate = 16000;
    const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
    const srcNode = off.createBufferSource();
    srcNode.buffer = decoded;
    srcNode.connect(off.destination);
    srcNode.start();
    const rendered = await off.startRendering();
    return await blobToBase64(pcmToWav(rendered.getChannelData(0), rate));
  } catch {
    return null;
  } finally {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }
};

/** WAV base64 → URL phát được */
export const wavB64ToUrl = (b64: string): string => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
};
