import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Languages, RefreshCw, Volume2, RotateCcw } from 'lucide-react';
import { stopBrowserTTS } from '../../services/geminiService';
import { wavB64ToUrl } from '../../utils/lessonMedia';
import type { VocabItem } from '../../services/classroom';

export interface LessonView {
  topic: string;
  level: string;
  readingText?: string;
  translation?: string;
  vocabulary?: VocabItem[];
  image?: string;
}

// ---------------- Giọng Anh Mỹ của trình duyệt ----------------
const US_VOICE_HINTS = ['Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Zira', 'Microsoft Guy', 'Samantha', 'Alex', 'en-US'];
let cachedVoice: SpeechSynthesisVoice | null | undefined;
const usVoice = (): SpeechSynthesisVoice | null => {
  if (cachedVoice) return cachedVoice;
  const vs = window.speechSynthesis?.getVoices() || [];
  const us = vs.filter(v => v.lang.replace('_', '-').toLowerCase() === 'en-us');
  for (const h of US_VOICE_HINTS) {
    const v = us.find(x => x.name.includes(h));
    if (v) return (cachedVoice = v);
  }
  return (cachedVoice = us[0] || null);
};
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = undefined; };
}

/** Tốc độ chuẩn theo trình độ (giọng máy) — nhân với tốc độ cô/HS chọn */
const baseRate = (level: string) => (['Starters', 'Movers'].includes(level) ? 0.85 : ['Flyers', 'A1'].includes(level) ? 0.92 : 1);

const speakUS = (text: string, rate: number, h: { onBoundary?: (i: number) => void; onEnd?: () => void } = {}) => {
  if (!('speechSynthesis' in window)) { h.onEnd?.(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  const v = usVoice();
  if (v) u.voice = v;
  u.rate = rate;
  u.onboundary = e => h.onBoundary?.(e.charIndex);
  u.onend = () => h.onEnd?.();
  u.onerror = () => h.onEnd?.();
  window.speechSynthesis.speak(u);
};

/** Đọc một từ (giọng Anh Mỹ, chậm vừa) */
export const sayWord = (w: string) => {
  stopBrowserTTS();
  setTimeout(() => speakUS(w, 0.8), 30);
};

const SPEEDS = [0.5, 0.75, 1, 1.25];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------------- Thanh phát bài đọc ----------------
const AudioBar: React.FC<{ text: string; level: string; loadAudio?: () => Promise<string | null> }> = ({ text, level, loadAudio }) => {
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState(0);        // 0..1
  const [dur, setDur] = useState(0);        // giây (chỉ giọng AI)
  const [mode, setMode] = useState<'ai' | 'tts'>(loadAudio ? 'ai' : 'tts');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const tokenRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Câu & vị trí ký tự (giọng máy đọc từng câu để tua được)
  const sentences = useMemo(() => {
    const out: { s: string; start: number }[] = [];
    const re = /[^.!?\n]+[.!?]*["')\]]*\s*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) if (m[0].trim()) out.push({ s: m[0], start: m.index });
    return out.length ? out : [{ s: text, start: 0 }];
  }, [text]);
  const total = Math.max(1, text.length);
  const curIdx = useRef(0);

  // đổi bài → dừng & dọn
  useEffect(() => {
    setMode(loadAudio ? 'ai' : 'tts');
    return () => {
      tokenRef.current++;
      stopBrowserTTS();
      audioRef.current?.pause(); audioRef.current = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setPlaying(false); setPos(0); setDur(0);
    };
  }, [text, loadAudio]);

  const ensureAudio = async (): Promise<HTMLAudioElement | null> => {
    if (audioRef.current) return audioRef.current;
    if (!loadAudio) return null;
    setLoading(true);
    try {
      const b64 = await loadAudio();
      if (!b64) { setMode('tts'); return null; }
      urlRef.current = wavB64ToUrl(b64);
      const a = new Audio(urlRef.current);
      a.preservesPitch = true;
      a.onloadedmetadata = () => setDur(a.duration || 0);
      a.ontimeupdate = () => a.duration && setPos(a.currentTime / a.duration);
      a.onended = () => { setPlaying(false); setPos(1); };
      audioRef.current = a;
      return a;
    } catch { setMode('tts'); return null; } finally { setLoading(false); }
  };

  // --- giọng máy: đọc từ câu i ---
  const ttsFrom = (i: number) => {
    const tk = ++tokenRef.current;
    stopBrowserTTS();
    const run = (k: number) => {
      if (tk !== tokenRef.current) return;
      if (k >= sentences.length) { setPlaying(false); setPos(1); return; }
      curIdx.current = k;
      const { s, start } = sentences[k];
      setPos(start / total);
      speakUS(s, baseRate(level) * speedRef.current, {
        onBoundary: ci => tk === tokenRef.current && setPos((start + ci) / total),
        onEnd: () => run(k + 1),
      });
    };
    setTimeout(() => run(i), 40);
    setPlaying(true);
  };
  const idxAt = (p: number) => {
    const c = p * total;
    let k = 0;
    sentences.forEach((x, j) => { if (x.start <= c) k = j; });
    return k;
  };

  const toggle = async () => {
    if (playing) {
      tokenRef.current++; stopBrowserTTS(); audioRef.current?.pause(); setPlaying(false); return;
    }
    if (mode === 'ai') {
      const a = await ensureAudio();
      if (a) {
        a.playbackRate = speed;
        if (a.ended || pos >= 0.999) a.currentTime = 0;
        await a.play().catch(() => {});
        setPlaying(true);
        return;
      }
    }
    ttsFrom(pos >= 0.999 ? 0 : idxAt(pos));
  };

  const seek = async (p: number) => {
    setPos(p);
    if (mode === 'ai') {
      const a = await ensureAudio();
      if (a && a.duration) { a.currentTime = p * a.duration; return; }
    }
    if (playing) ttsFrom(idxAt(p));
  };

  const changeSpeed = (s: number) => {
    setSpeed(s); speedRef.current = s;
    if (audioRef.current) audioRef.current.playbackRate = s;
    if (playing && mode === 'tts') ttsFrom(curIdx.current);
  };

  const restart = () => { seek(0); if (!playing) toggle(); };

  return (
    <div className="rounded-2xl bg-white border-2 border-emerald-100 p-3 sm:p-4 space-y-2">
      <div className="flex items-center gap-3">
        <button onClick={toggle} disabled={loading} aria-label={playing ? 'Tạm dừng' : 'Nghe mẫu'}
          className="shrink-0 w-12 h-12 rounded-full bg-brand-green text-white flex items-center justify-center shadow-md hover:brightness-110 disabled:opacity-60">
          {loading ? <RefreshCw size={20} className="animate-spin" /> : playing ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <input type="range" min={0} max={1000} value={Math.round(pos * 1000)}
            onChange={e => seek(Number(e.target.value) / 1000)} aria-label="Kéo để tua bài đọc"
            className="w-full h-2 accent-[var(--color-brand-green)] cursor-pointer" />
          <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-0.5">
            <span>{mode === 'ai' && dur ? `${fmt(pos * dur)} / ${fmt(dur)}` : `Câu ${Math.min(sentences.length, idxAt(pos) + 1)}/${sentences.length}`}</span>
            <span>{mode === 'ai' ? 'Giọng Leda (AI) · Anh Mỹ (US)' : 'Giọng Anh Mỹ (US)'}</span>
          </div>
        </div>
        <button onClick={restart} title="Nghe lại từ đầu" className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-brand-green hover:bg-slate-50">
          <RotateCcw size={18} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-black text-slate-500 uppercase mr-1">Tốc độ</span>
        {SPEEDS.map(s => (
          <button key={s} onClick={() => changeSpeed(s)}
            className={`px-2.5 py-1 rounded-lg text-xs font-black border ${speed === s ? 'bg-brand-green text-white border-brand-green' : 'border-slate-200 text-slate-600 hover:border-emerald-300'}`}>
            {s === 1 ? '1x' : `${s}x`}
          </button>
        ))}
      </div>
    </div>
  );
};

// ---------------- Thẻ từ vựng ----------------
const VocabGrid: React.FC<{ items: VocabItem[] }> = ({ items }) => (
  <div className="space-y-2">
    <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">📚 Từ vựng — bấm 🔊 để nghe phát âm</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {items.map((v, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl bg-emerald-50/70 border-2 border-emerald-100 p-3">
          <span className="shrink-0 w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl">{v.emoji || '📖'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black text-slate-800 leading-tight break-words">{v.word}</p>
            {v.ipa && <p className="text-sm font-semibold text-emerald-600">{v.ipa}</p>}
            {v.meaning && <p className="text-base text-slate-600 leading-snug">{v.meaning}</p>}
          </div>
          <button onClick={() => sayWord(v.word)} aria-label={`Nghe phát âm ${v.word}`}
            className="shrink-0 w-11 h-11 rounded-full bg-brand-green text-white flex items-center justify-center shadow hover:brightness-110 active:scale-95">
            <Volume2 size={20} />
          </button>
        </div>
      ))}
    </div>
  </div>
);

/** Thẻ bài nói — đúng giao diện học sinh thấy (dùng chung cho HS và cô xem trước). */
export const LessonCard: React.FC<{
  a: LessonView; label?: string;
  /** Có giọng đọc AI: hàm trả về WAV base64 (tải khi bấm nghe lần đầu) */
  loadAudio?: () => Promise<string | null>;
}> = ({ a, label = 'Bài cô giao', loadAudio }) => {
  const [showVi, setShowVi] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => { setImgOk(true); }, [a.image]);

  return (
    <div className="bg-white rounded-[2rem] shadow-2xl border-4 border-emerald-100 overflow-hidden">
      {a.image && imgOk && (
        <div className="bg-emerald-50 aspect-[16/9] overflow-hidden">
          <img src={a.image} alt={a.topic} loading="lazy" onError={() => setImgOk(false)} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="px-5 sm:px-7 py-4 bg-emerald-50/60 border-b-4 border-emerald-50 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{label} · {a.level}</p>
          <h2 className="text-xl sm:text-2xl font-black text-brand-green-dark">{a.topic}</h2>
        </div>
        {a.translation && (
          <button onClick={() => setShowVi(v => !v)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-black">
            <Languages size={16} /> {showVi ? 'Ẩn dịch' : 'Xem dịch'}
          </button>
        )}
      </div>

      <div className="px-5 sm:px-7 py-5 space-y-5">
        {a.readingText && <AudioBar text={a.readingText} level={a.level} loadAudio={loadAudio} />}
        <p className="text-xl sm:text-2xl leading-relaxed font-semibold text-slate-800 whitespace-pre-wrap">{a.readingText}</p>
        {showVi && a.translation && <p className="text-base sm:text-lg text-slate-500 italic whitespace-pre-wrap border-l-4 border-emerald-200 pl-3">{a.translation}</p>}
        {a.vocabulary && a.vocabulary.length > 0 && <VocabGrid items={a.vocabulary} />}
      </div>
    </div>
  );
};
