import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { LessonCard } from './LessonCard';
import {
  LogOut, Mic, Square, Volume2, RefreshCw, Send, ArrowLeft, Languages, CheckCircle2, Clock, Sparkles, BookOpen,
} from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import {
  Assignment, StudentSession, Submission, listenAssignments, listenMySubmissions, submitRecording,
  buildParentReport, listenCallName, DEFAULT_CALL_NAME,
} from '../../services/classroom';
import { fetchLessonAudio } from '../../services/classroom';
import { speakWithBrowser, stopBrowserTTS, EnglishLevel } from '../../services/geminiService';
import { useRecorder } from '../../hooks/useRecorder';

interface Props {
  session: StudentSession;
  onLogout: () => void;
  onOpenStudio: () => void;
}

const MAX_SECONDS = 120;

export const StudentHome: React.FC<Props> = ({ session, onLogout, onOpenStudio }) => {
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [subs, setSubs] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [callName, setCallName] = useState(DEFAULT_CALL_NAME);

  useEffect(() => listenAssignments(session.code, a => { setAssignments(a); setLoading(false); }), [session.code]);
  useEffect(() => listenMySubmissions(session, setSubs), [session.code, session.sid]);
  useEffect(() => listenCallName(setCallName), []);

  const lessons = (Object.entries(assignments) as [string, Assignment][])
    .filter(([, a]) => !!a.readingText)
    .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

  const open = openId ? assignments[openId] : null;

  return (
    <div className="min-h-screen bg-emerald-50/40">
      <header className="bg-brand-green border-b border-brand-green-dark sticky top-0 z-40 shadow-lg">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-16 sm:h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <BrandLogo className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-black tracking-tight text-brand-yellow uppercase truncate">Ms Lý English</h1>
              <p className="text-[11px] text-emerald-100 font-bold truncate">🎒 {session.name} · {session.className}</p>
            </div>
          </div>
          <button onClick={onLogout} className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-white/15 text-white text-xs font-bold hover:bg-white/25">
            <LogOut size={14} /> Thoát lớp
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        {open && openId ? (
          <LessonRunner
            key={openId}
            session={session} aid={openId} a={open} sub={subs[openId]} callName={callName}
            onBack={() => setOpenId(null)}
          />
        ) : (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-brand-green-dark uppercase tracking-tight">Bài cô giao</h2>
              <p className="text-sm text-slate-500">Con bấm vào bài, nghe mẫu, đọc to rồi nộp bài cho cô nhé.</p>
            </div>

            {loading ? (
              <p className="text-center text-slate-400 py-10">Đang tải bài...</p>
            ) : lessons.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 p-8 text-center text-slate-400">
                <BookOpen size={44} className="mx-auto mb-3 text-emerald-200" />
                Cô chưa giao bài nào. Con quay lại sau nhé!
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lessons.map(([id, a]) => {
                  const s = subs[id];
                  return (
                    <li key={id}>
                      <button onClick={() => setOpenId(id)}
                        className="w-full text-left bg-white rounded-3xl shadow-lg border-4 border-emerald-100 hover:border-brand-green overflow-hidden transition-all">
                        {a.image && <img src={a.image} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} className="w-full aspect-[2/1] object-cover bg-slate-100" />}
                        <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-black text-slate-800">{a.topic}</p>
                          <span className="shrink-0 text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{a.level}</span>
                        </div>
                        {a.note && <p className="text-xs text-slate-500 mt-1">{a.note}</p>}
                        <div className="mt-3 text-xs font-black">
                          {!s ? (
                            <span className="text-amber-700 flex items-center gap-1"><Mic size={13} /> Chưa làm</span>
                          ) : s.status === 'graded' && s.result ? (
                            <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 size={13} />
                              {s.result.isSilent ? 'Cô chưa nghe được tiếng con, con nộp lại nhé' : `Cô đã chấm: ${s.result.score.toFixed(1)}/10`}</span>
                          ) : (
                            <span className="text-sky-700 flex items-center gap-1"><Clock size={13} /> Đã nộp — chờ cô chấm</span>
                          )}
                        </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="text-center pt-4">
              <button onClick={onOpenStudio} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-green underline underline-offset-4">
                <Sparkles size={14} /> Luyện nói tự do với AI (cần API key riêng)
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ---------------- Làm 1 bài ----------------
const LessonRunner: React.FC<{
  session: StudentSession; aid: string; a: Assignment; sub?: Submission; callName: string; onBack: () => void;
}> = ({ session, aid, a, sub, callName, onBack }) => {
  const loadAudio = useMemo(() => (a.hasAudio ? () => fetchLessonAudio(session.code, aid) : undefined), [a.hasAudio, session.code, aid]);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<{ b64: string; dur: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [redo, setRedo] = useState(false);

  const onCaptured = useCallback((b64: string, dur: number) => setCaptured({ b64, dur }), []);
  const rec = useRecorder(a.readingText || '', a.level as EnglishLevel, setError, onCaptured);

  // Đếm giờ + tự dừng khi quá dài
  useEffect(() => {
    if (!rec.isRecording) { setElapsed(0); return; }
    const t0 = Date.now();
    const iv = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      setElapsed(s);
      if (s >= MAX_SECONDS) rec.stopRecording();
    }, 250);
    return () => clearInterval(iv);
  }, [rec.isRecording]);

  useEffect(() => () => stopBrowserTTS(), []);

  const silent = rec.evaluation?.isSilent;

  const send = async () => {
    if (!captured) return;
    setSending(true); setError(null);
    try {
      await submitRecording(session, aid, a, captured.b64, captured.dur);
      setCaptured(null); setRedo(false);
    } catch (e: any) { setError(e.message || 'Chưa nộp được, con thử lại nhé.'); } finally { setSending(false); }
  };

  const graded = sub?.status === 'graded' && sub.result;
  const showRecorder = !sub || redo || (graded && sub.result!.isSilent);

  return (
    <div className="space-y-4">
      <button onClick={() => { stopBrowserTTS(); onBack(); }} className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-brand-green">
        <ArrowLeft size={16} /> Danh sách bài
      </button>

      <LessonCard a={a} loadAudio={loadAudio} />

      {/* Kết quả cô chấm */}
      {graded && !redo && !sub!.result!.isSilent && (
        <div className="bg-white rounded-3xl shadow-xl border-4 border-amber-200 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black text-amber-800 flex items-center gap-1.5"><CheckCircle2 size={18} /> Nhận xét của cô</p>
            <span className="text-2xl font-black text-brand-green-dark">{sub!.result!.score.toFixed(1)}<span className="text-sm text-slate-400">/10</span></span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{sub!.report || buildParentReport(sub!.result!, callName)}</p>
          <button onClick={() => { setRedo(true); setCaptured(null); }} className="text-xs font-bold text-slate-500 underline underline-offset-4">Con muốn đọc lại và nộp lại</button>
        </div>
      )}

      {sub && sub.status !== 'graded' && !redo && (
        <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-4 text-sm font-bold text-sky-800 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5"><Clock size={16} /> Con đã nộp bài. Cô sẽ chấm và gửi nhận xét sớm nhé!</span>
          <button onClick={() => { setRedo(true); setCaptured(null); }} className="text-xs underline underline-offset-4">Nộp lại</button>
        </div>
      )}

      {/* Ghi âm & nộp */}
      {showRecorder && (
        <div className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 p-5 space-y-4 text-center">
          {graded && sub!.result!.isSilent && !redo && (
            <p className="text-sm font-bold text-red-600">Cô chưa nghe được tiếng con trong bài trước. Con kiểm tra micro rồi đọc lại nhé!</p>
          )}
          {!rec.isRecording && !rec.isEvaluating && !captured && (
            <>
              <p className="text-sm text-slate-500">Con bấm nút, đọc to rõ cả bài, đọc xong bấm Dừng.</p>
              <button onClick={() => { stopBrowserTTS(); rec.startRecording(); }}
                className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform">
                <Mic size={40} />
              </button>
              <p className="text-xs font-black text-rose-600 uppercase">Bắt đầu đọc</p>
            </>
          )}
          {rec.isRecording && (
            <>
              <div className="h-3 w-full max-w-xs mx-auto bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${rec.audioLevel}%` }} />
              </div>
              <p className="text-2xl font-black text-slate-700 tabular-nums">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</p>
              <button onClick={rec.stopRecording}
                className="mx-auto w-24 h-24 rounded-full bg-slate-800 text-white shadow-xl flex items-center justify-center animate-pulse">
                <Square size={36} />
              </button>
              <p className="text-xs font-black text-slate-600 uppercase">Đọc xong thì bấm Dừng</p>
            </>
          )}
          {rec.isEvaluating && <p className="text-sm font-bold text-slate-500 flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Đang xử lý...</p>}
          {!rec.isRecording && !rec.isEvaluating && silent && !captured && (
            <p className="text-sm font-bold text-red-600">{rec.evaluation?.feedback}</p>
          )}
          {captured && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-600">Con nghe lại bài đọc của mình:</p>
              {rec.recordedAudioUrl && <audio src={rec.recordedAudioUrl} controls className="mx-auto w-full max-w-md" />}
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={send} disabled={sending}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-brand-green text-white font-black shadow-lg disabled:opacity-60">
                  {sending ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />} {sending ? 'Đang gửi cho cô...' : 'Nộp bài cho cô'}
                </button>
                <button onClick={() => { setCaptured(null); rec.clearRecordedAudio(); }} disabled={sending}
                  className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black">Đọc lại</button>
              </div>
            </div>
          )}
          {error && <p role="alert" className="text-sm font-bold text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
};
