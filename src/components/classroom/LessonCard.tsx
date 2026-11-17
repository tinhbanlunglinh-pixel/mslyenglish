import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Languages, Square, RefreshCw } from 'lucide-react';
import { speakWithBrowser, stopBrowserTTS, EnglishLevel } from '../../services/geminiService';
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

/** Thẻ bài nói — đúng giao diện học sinh thấy (dùng chung cho HS và cô xem trước). */
export const LessonCard: React.FC<{
  a: LessonView; label?: string;
  /** Có giọng đọc AI: hàm trả về WAV base64 (tải khi bấm nghe lần đầu) */
  loadAudio?: () => Promise<string | null>;
}> = ({ a, label = 'Bài cô giao', loadAudio }) => {
  const [showVi, setShowVi] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  useEffect(() => { setImgOk(true); }, [a.image]);
  useEffect(() => {
    // đổi bài → bỏ file giọng đọc cũ
    return () => {
      audioRef.current?.pause(); audioRef.current = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, [a.readingText, loadAudio]);
  useEffect(() => () => stopBrowserTTS(), []);

  const play = async () => {
    if (speaking) { stopBrowserTTS(); audioRef.current?.pause(); setSpeaking(false); return; }
    if (loadAudio) {
      try {
        if (!audioRef.current) {
          setLoading(true);
          const b64 = await loadAudio();
          if (b64) {
            urlRef.current = wavB64ToUrl(b64);
            audioRef.current = new Audio(urlRef.current);
            audioRef.current.onended = () => setSpeaking(false);
          }
        }
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          setSpeaking(true);
          return;
        }
      } catch { /* không phát được → dùng giọng trình duyệt */ } finally { setLoading(false); }
    }
    speakWithBrowser(a.readingText || '', a.level as EnglishLevel);
    setSpeaking(true);
    // Giọng đọc trình duyệt không báo xong ổn định trên mọi máy → tự tắt trạng thái sau thời lượng ước tính
    const words = (a.readingText || '').split(/\s+/).length;
    setTimeout(() => setSpeaking(false), Math.min(120, words * 0.55 + 2) * 1000);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-2xl border-4 border-emerald-100 overflow-hidden">
      {a.image && imgOk && (
        <div className="bg-emerald-50 aspect-[16/9] sm:aspect-[2/1] overflow-hidden">
          <img src={a.image} alt={a.topic} loading="lazy" onError={() => setImgOk(false)} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="px-5 sm:px-7 py-4 bg-emerald-50/60 border-b-4 border-emerald-50 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{label} · {a.level}</p>
          <h2 className="text-xl sm:text-2xl font-black text-brand-green-dark">{a.topic}</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={play} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-green text-white text-sm font-black disabled:opacity-60">
            {loading ? <RefreshCw size={16} className="animate-spin" /> : speaking ? <Square size={16} /> : <Volume2 size={16} />}
            {loading ? 'Đang tải...' : speaking ? 'Dừng' : 'Nghe mẫu'}
          </button>
          {a.translation && (
            <button onClick={() => setShowVi(v => !v)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-black">
              <Languages size={16} /> {showVi ? 'Ẩn dịch' : 'Xem dịch'}
            </button>
          )}
        </div>
      </div>

      <div className="px-5 sm:px-7 py-5 space-y-4">
        <p className="text-xl sm:text-2xl leading-relaxed font-semibold text-slate-800 whitespace-pre-wrap">{a.readingText}</p>
        {showVi && a.translation && <p className="text-base text-slate-500 italic whitespace-pre-wrap border-l-4 border-emerald-200 pl-3">{a.translation}</p>}
        {a.vocabulary && a.vocabulary.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {a.vocabulary.map((v, i) => (
              <button key={i} onClick={() => speakWithBrowser(v.word, a.level as EnglishLevel)}
                className="text-sm px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 hover:bg-emerald-100">
                {v.emoji} <b>{v.word}</b> {v.ipa && <span className="text-slate-400 text-xs">{v.ipa}</span>} <span className="text-slate-500">· {v.meaning}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
