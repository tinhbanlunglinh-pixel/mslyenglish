import React, { useEffect, useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import {
  ElVoice, TtsProvider, elRemaining, getElKey, getElVoice, getTtsProvider, listElVoices, setElKey, setElVoice, setTtsProvider,
} from '../../services/elevenlabs';

/** Chọn nguồn giọng đọc AI: Leda (Gemini, key Gemini của cô) hoặc ElevenLabs (key ElevenLabs của cô). */
export const VoiceSettings: React.FC<{ onChange?: (p: TtsProvider) => void }> = ({ onChange }) => {
  const [provider, setProvider] = useState<TtsProvider>(getTtsProvider());
  const [key, setKey] = useState(getElKey());
  const [draftKey, setDraftKey] = useState('');
  const [voices, setVoices] = useState<ElVoice[]>([]);
  const [voice, setVoice] = useState(getElVoice());
  const [left, setLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async (k: string) => {
    setBusy(true); setErr(null);
    try {
      setVoices(await listElVoices(k));
      setLeft(await elRemaining(k));
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { if (provider === 'elevenlabs' && key) load(key); }, [provider, key]);

  const pick = (p: TtsProvider) => { setProvider(p); setTtsProvider(p); onChange?.(p); };
  const saveKey = async () => {
    if (!draftKey.trim()) return;
    setElKey(draftKey); setKey(draftKey.trim()); setDraftKey('');
    setTtsProvider('elevenlabs'); setProvider('elevenlabs'); onChange?.('elevenlabs');
  };

  return (
    <div className="rounded-xl bg-white/70 border border-slate-200 p-2.5 space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-black text-slate-500 uppercase mr-1">Nguồn giọng AI</span>
        {([['gemini', 'Leda · Gemini'], ['elevenlabs', 'ElevenLabs']] as const).map(([p, label]) => (
          <button key={p} onClick={() => pick(p)}
            className={`px-2.5 py-1 rounded-lg font-black border ${provider === p ? 'bg-brand-green text-white border-brand-green' : 'border-slate-200 text-slate-600'}`}>{label}</button>
        ))}
      </div>
      {provider === 'elevenlabs' && (
        <div className="space-y-2">
          {!key ? (
            <div className="flex flex-wrap gap-2 items-center">
              <input type="password" value={draftKey} onChange={e => setDraftKey(e.target.value)} placeholder="Dán API key ElevenLabs của cô (sk_...)"
                autoComplete="off" className="flex-1 min-w-[180px] px-2.5 py-1.5 border-2 border-slate-200 rounded-lg" />
              <button onClick={saveKey} className="px-3 py-1.5 rounded-lg bg-brand-green text-white font-black">Lưu key</button>
              <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" className="underline text-slate-500">Lấy key ở đâu?</a>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 font-black text-slate-600"><Check size={14} /> Đã có key ElevenLabs</span>
              {busy ? <RefreshCw size={14} className="animate-spin text-slate-400" /> : (
                <select value={voice} onChange={e => { setVoice(e.target.value); setElVoice(e.target.value); }}
                  className="px-2 py-1.5 border-2 border-slate-200 rounded-lg font-bold max-w-[260px]">
                  {!voices.some(v => v.voice_id === voice) && <option value={voice}>Rachel (mặc định)</option>}
                  {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.name}{v.accent ? ` · ${v.accent}` : ''}{v.gender ? ` · ${v.gender}` : ''}</option>)}
                </select>
              )}
              {left != null && <span className="text-slate-500">Còn {left.toLocaleString('vi-VN')} ký tự tháng này</span>}
              <button onClick={() => { setElKey(''); setKey(''); setVoices([]); setLeft(null); }} className="underline text-slate-400">Đổi key</button>
            </div>
          )}
          {err && <p className="font-bold text-red-600">{err}</p>}
          <p className="text-[11px] text-slate-400">Key ElevenLabs chỉ lưu trên máy này. Mỗi bài tốn số ký tự bằng độ dài bài đọc.</p>
        </div>
      )}
    </div>
  );
};
