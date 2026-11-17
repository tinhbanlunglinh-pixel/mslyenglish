import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Copy, Check, LogOut, Mic, Users, BookOpen, Trash2, KeyRound, ChevronDown, ChevronRight, X, RefreshCw,
  Sparkles, ClipboardCheck, Play, FileText, Zap, AlertTriangle,
} from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { ApiKeyModal } from '../ApiKeyModal';
import { ReportModal } from './ReportModal';
import {
  Assignment, ClassData, LessonResult, StudentInfo, Submission, VocabItem, addAssignment, changeTeacherPassword,
  createClass, deleteClass, fetchRecording, listenCallName, listenClass, listenTeacherClasses, removeAssignment,
  removeStudent, resetToPending, saveCallName, DEFAULT_CALL_NAME,
  SavedLesson, listenLibrary, saveToLibrary, markLibraryUsed, removeFromLibrary, newLibraryId, fetchLibraryAudio,
  listenSampleAudioDone, fetchSampleAudio, saveSampleAudio,
} from '../../services/classroom';
import { LessonCard, RecorderPreview } from './LessonCard';
import { VoiceSettings } from './VoiceSettings';
import { getTtsProvider } from '../../services/elevenlabs';
import { getGeminiKeyPool, setKeyOverride, getApiKeyForProvider as mainKey } from '../../services/geminiService';
import { makeLessonImage, makeLessonAudio } from '../../utils/lessonMedia';
import { SAMPLE_LESSONS, LEVEL_INFO } from '../../data/sampleLessons';

const EMPTY_CLASS: ClassData = { info: null, students: {}, results: {}, assignments: {}, submissions: {} };

type Draft = {
  topic: string; readingText: string; translation: string; vocabulary: VocabItem[];
  origin: 'ai' | 'sample' | 'saved'; libId?: string; sampleId?: string;
  image?: string;
  /** giọng Leda lấy từ kho giọng bài mẫu (không tính là cô sửa bài) */
  sampleAudio?: boolean;
  /** WAV base64; null = chưa có; undefined = đang tải từ kho */
  audio?: string | null;
};
import { generateContent, getAiProvider, getApiKeyForProvider, getSelectedModel, EnglishLevel } from '../../services/geminiService';
import { gradeSubmission, friendlyAiError } from '../../services/grading';

const LEVELS = ['Starters', 'Movers', 'Flyers', 'A1', 'A2', 'B1', 'B2'];

interface Props {
  onOpenStudio: () => void;
  onLogout: () => void;
}

const fmtTime = (t?: number) => {
  if (!t) return '—';
  const d = new Date(t);
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
};

const avg = (nums: number[]) => (nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null);

const scoreColor = (s?: number | null) =>
  s == null ? 'text-slate-300' : s >= 8 ? 'text-emerald-600' : s >= 5 ? 'text-amber-600' : 'text-red-600';

export const TeacherPanel: React.FC<Props> = ({ onOpenStudio, onLogout }) => {
  const [classes, setClasses] = useState<Record<string, { name: string; createdAt: number }>>({});
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<ClassData | null>(null);
  const [newClass, setNewClass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'students' | 'assign' | 'grade'>('students');
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  // API key Gemini của cô (chỉ lưu trên máy cô)
  const [apiKey, setApiKey] = useState(() => getApiKeyForProvider());
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [callName, setCallName] = useState(DEFAULT_CALL_NAME);
  useEffect(() => listenCallName(setCallName), []);

  // ---- Tự động chấm bài nộp (chạy trên máy cô) ----
  const [autoGrade, setAutoGrade] = useState(() => {
    try { return localStorage.getItem('msly_auto_grade') !== '0'; } catch { return true; }
  });
  const [gradingKey, setGradingKey] = useState<string | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const gradingRef = useRef(false);
  const failedRef = useRef<Set<string>>(new Set());

  const runGrade = async (aid: string, sid: string) => {
    if (!selected || !data || gradingRef.current) return;
    const a = data.assignments[aid];
    if (!a) return;
    gradingRef.current = true;
    setGradingKey(`${aid}/${sid}`);
    setGradeError(null);
    try {
      await gradeSubmission(selected, aid, sid, a, callName);
      failedRef.current.delete(`${selected}/${aid}/${sid}`);
    } catch (e: any) {
      failedRef.current.add(`${selected}/${aid}/${sid}`);
      setGradeError(`${data.submissions[aid]?.[sid]?.name || 'Bài nộp'}: ${e.message}`);
    } finally {
      gradingRef.current = false;
      setGradingKey(null);
    }
  };

  const pendingList = useMemo(() => {
    if (!data) return [] as { aid: string; sid: string }[];
    const out: { aid: string; sid: string; t: number }[] = [];
    Object.entries(data.submissions || {}).forEach(([aid, bySid]) => {
      if (!data.assignments[aid]?.readingText) return;
      Object.entries(bySid || {}).forEach(([sid, s]) => {
        if ((s as Submission).status === 'pending') out.push({ aid, sid, t: (s as Submission).submittedAt || 0 });
      });
    });
    return out.sort((x, y) => x.t - y.t);
  }, [data]);

  useEffect(() => {
    if (!autoGrade || !apiKey || gradingRef.current || !selected) return;
    const next = pendingList.find(p => !failedRef.current.has(`${selected}/${p.aid}/${p.sid}`));
    if (next) runGrade(next.aid, next.sid);
  }, [pendingList, autoGrade, apiKey, gradingKey, selected]);

  useEffect(() => listenTeacherClasses(
    c => { setClasses(c); setLoadingClasses(false); },
    e => { setError(e.message); setLoadingClasses(false); },
  ), []);

  // Tự chọn lớp đầu tiên
  useEffect(() => {
    const codes = Object.keys(classes);
    if (!selected && codes.length) setSelected(codes.sort((a, b) => (classes[b].createdAt || 0) - (classes[a].createdAt || 0))[0]);
    if (selected && !classes[selected]) setSelected(codes[0] || null);
  }, [classes, selected]);

  useEffect(() => {
    if (!selected) { setData(null); return; }
    setData(null);
    return listenClass(selected, setData, e => setError(e.message));
  }, [selected]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const code = await createClass(newClass);
      setNewClass('');
      setSelected(code);
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500); } catch { /* bỏ qua */ }
  };

  const rows = useMemo(() => {
    if (!data) return [];
    return (Object.entries(data.students) as [string, StudentInfo][]).map(([sid, st]) => {
      const lessons = Object.entries(data.results[sid] || {})
        .map(([id, r]) => ({ id, ...(r as LessonResult) }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const speak = lessons.map(l => l.speakingScore).filter((n): n is number => typeof n === 'number');
      const ex = lessons.map(l => l.exerciseScore).filter((n): n is number => typeof n === 'number');
      return {
        sid, name: st.name, lastActive: st.lastActive || st.joinedAt, lessons,
        speakAvg: avg(speak), exAvg: avg(ex), submitted: lessons.filter(l => l.submitted).length,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [data]);

  const shareLink = selected ? `${window.location.origin}/?lop=${selected}` : '';
  const sortedCodes = Object.keys(classes).sort((a, b) => (classes[b].createdAt || 0) - (classes[a].createdAt || 0));

  return (
    <div className="min-h-screen bg-emerald-50/40">
      <header className="bg-brand-green border-b border-brand-green-dark sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 sm:h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <BrandLogo className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-black tracking-tight text-brand-yellow uppercase truncate">Bảng giáo viên</h1>
              <p className="hidden sm:block text-[10px] text-emerald-100 font-bold tracking-wider uppercase">Ms Lý English · theo dõi lớp trực tiếp</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button onClick={onOpenStudio} className="flex items-center gap-1.5 bg-brand-yellow text-slate-900 font-black text-xs sm:text-sm px-3 py-2 rounded-xl hover:brightness-95">
              <Mic size={16} /> <span className="hidden sm:inline">Phòng luyện nói</span>
            </button>
            <button onClick={() => setShowKeyModal(true)} title="API key Gemini của cô (dùng để tạo bài và chấm bài)"
              className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-black ${apiKey ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-amber-400 text-slate-900 animate-pulse'}`}>
              <Zap size={16} /> <span className="hidden md:inline">{apiKey ? 'API key' : 'Nhập API key'}</span>
            </button>
            <button onClick={() => setShowPass(true)} title="Đổi mật khẩu" className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25">
              <KeyRound size={18} />
            </button>
            <button onClick={onLogout} title="Đăng xuất" className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Danh sách lớp */}
        <aside className="lg:col-span-4 space-y-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 p-4 space-y-3">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">Tạo lớp mới</p>
            <div className="flex gap-2">
              <input value={newClass} onChange={e => setNewClass(e.target.value)} placeholder="VD: Lớp 3A – Thứ 2,4"
                className="flex-1 min-w-0 px-3 py-2.5 text-sm border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green" />
              <button disabled={busy} className="shrink-0 flex items-center gap-1 px-3 rounded-xl bg-brand-green text-white font-black text-sm disabled:opacity-60">
                {busy ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />} Tạo
              </button>
            </div>
          </form>

          <div className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 p-3 space-y-1">
            <p className="px-2 pt-1 pb-2 text-xs font-black text-emerald-600 uppercase tracking-wider">Lớp của cô ({sortedCodes.length})</p>
            {loadingClasses && <p className="px-2 py-3 text-sm text-slate-400">Đang tải...</p>}
            {!loadingClasses && sortedCodes.length === 0 && (
              <p className="px-2 py-3 text-sm text-slate-400">Chưa có lớp nào. Cô tạo lớp ở ô phía trên nhé.</p>
            )}
            {sortedCodes.map(code => (
              <button key={code} onClick={() => setSelected(code)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-all ${
                  selected === code ? 'bg-emerald-100 text-brand-green-dark' : 'hover:bg-slate-50 text-slate-700'}`}>
                <span className="font-bold text-sm truncate">{classes[code].name}</span>
                <span className="font-mono font-black text-xs tracking-widest bg-white border border-emerald-200 rounded-lg px-2 py-0.5">{code}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Chi tiết lớp */}
        <section className="lg:col-span-8 space-y-4 min-w-0">
          {error && (
            <div role="alert" className="flex items-start justify-between gap-2 text-sm font-bold text-red-700 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <span>{error}</span>
              <button onClick={() => setError(null)}><X size={16} /></button>
            </div>
          )}

          {!selected ? (
            <>
            <div className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 p-6 sm:p-8 text-center text-slate-400">
              <Users size={48} className="mx-auto mb-3 text-emerald-200" />
              Cô chưa có lớp nào. Tạo lớp ở ô "Tạo lớp mới" để nhận mã lớp gửi học sinh — kho bài soạn sẵn ở ngay bên dưới.
            </div>
            <AssignTab code={null} data={EMPTY_CLASS} onError={setError} hasKey={!!apiKey} onNeedKey={() => setShowKeyModal(true)} />
              </>
          ) : (
            <>
              <div className="bg-gradient-to-br from-brand-green to-emerald-600 rounded-3xl shadow-xl p-5 sm:p-6 text-white space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-wider text-emerald-100">Lớp đang xem</p>
                    <h2 className="text-xl sm:text-2xl font-black truncate">{classes[selected]?.name}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black uppercase tracking-wider text-emerald-100">Mã lớp</p>
                    <button onClick={() => copy(selected, 'code')} className="flex items-center gap-2 font-mono text-2xl sm:text-3xl font-black tracking-[0.25em] text-brand-yellow">
                      {selected} {copied === 'code' ? <Check size={18} /> : <Copy size={18} className="opacity-70" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button onClick={() => copy(shareLink, 'link')} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl font-bold max-w-full">
                    {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
                    <span className="truncate">{copied === 'link' ? 'Đã chép link' : 'Chép link vào lớp gửi phụ huynh'}</span>
                  </button>
                  <span className="bg-white/15 px-3 py-2 rounded-xl font-bold">{rows.length} học sinh</span>
                  <span className="bg-white/15 px-3 py-2 rounded-xl font-bold">{rows.reduce((n, r) => n + r.lessons.length, 0)} bài đã học</span>
                </div>
              </div>

              <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow border border-emerald-100">
                {([['students', 'Kết quả', Users], ['assign', 'Giao bài nói', BookOpen], ['grade', 'Chấm & báo cáo', ClipboardCheck]] as const).map(([k, label, Icon]) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl font-black text-xs sm:text-sm transition-all ${
                      tab === k ? 'bg-brand-green text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <Icon size={16} className="shrink-0" /> {label}
                    {k === 'grade' && pendingList.length > 0 && (
                      <span className="absolute -top-1.5 -right-1 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center">{pendingList.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {!data ? (
                <p className="text-center text-slate-400 py-10">Đang tải dữ liệu lớp...</p>
              ) : tab === 'students' ? (
                <StudentsTable rows={rows} expanded={expanded} setExpanded={setExpanded}
                  onRemove={async (sid, name) => {
                    if (confirm(`Xoá học sinh "${name}" và toàn bộ kết quả của con khỏi lớp?`)) await removeStudent(selected, sid);
                  }} />
              ) : tab === 'assign' ? (
                <AssignTab code={selected} data={data} onError={setError} hasKey={!!apiKey} onNeedKey={() => setShowKeyModal(true)} />
              ) : (
                <GradeTab
                  code={selected} className={classes[selected]?.name || ''} data={data} hasKey={!!apiKey}
                  onNeedKey={() => setShowKeyModal(true)} callName={callName}
                  autoGrade={autoGrade}
                  setAutoGrade={v => { setAutoGrade(v); try { localStorage.setItem('msly_auto_grade', v ? '1' : '0'); } catch { /* bỏ qua */ } }}
                  gradingKey={gradingKey} gradeError={gradeError}
                  onGrade={(aid, sid) => { failedRef.current.delete(`${selected}/${aid}/${sid}`); runGrade(aid, sid); }}
                  onRetry={async (aid, sid) => { failedRef.current.delete(`${selected}/${aid}/${sid}`); await resetToPending(selected, aid, sid); }}
                />
              )}

              <div className="text-right">
                <button
                  onClick={async () => {
                    if (confirm(`Xoá lớp "${classes[selected]?.name}" (mã ${selected})? Toàn bộ kết quả của lớp sẽ mất và không khôi phục được.`)) {
                      try { await deleteClass(selected); setSelected(null); } catch (e: any) { setError(e.message); }
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-600"
                >
                  <Trash2 size={14} /> Xoá lớp này
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      {showPass && <ChangePasswordModal onClose={() => setShowPass(false)} />}

      <ApiKeyModal
        show={showKeyModal}
        currentApiKey={apiKey}
        initialProvider={getAiProvider()}
        initialModel={getSelectedModel()}
        onSave={k => { setApiKey(k); setShowKeyModal(false); failedRef.current.clear(); setGradeError(null); }}
        onClose={() => setShowKeyModal(false)}
      />
    </div>
  );
};

// ---------------- Bảng kết quả ----------------
type Row = {
  sid: string; name: string; lastActive?: number; speakAvg: number | null; exAvg: number | null; submitted: number;
  lessons: (LessonResult & { id: string })[];
};

const StudentsTable: React.FC<{
  rows: Row[]; expanded: string | null; setExpanded: (s: string | null) => void; onRemove: (sid: string, name: string) => void;
}> = ({ rows, expanded, setExpanded, onRemove }) => {
  if (!rows.length) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 p-8 text-center text-slate-400 text-sm">
        Chưa có học sinh nào vào lớp. Cô gửi mã lớp hoặc link cho học sinh nhé.
      </div>
    );
  }
  return (
    <div className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-emerald-50 text-[11px] uppercase tracking-wider text-emerald-700">
            <tr>
              <th className="text-left px-4 py-3 font-black">Học sinh</th>
              <th className="px-2 py-3 font-black">Số bài</th>
              <th className="px-2 py-3 font-black">Điểm nói TB</th>
              <th className="px-2 py-3 font-black">Bài tập TB</th>
              <th className="px-2 py-3 font-black">Đã nộp</th>
              <th className="px-2 py-3 font-black whitespace-nowrap">Hoạt động</th>
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <React.Fragment key={r.sid}>
                <tr className="border-t border-emerald-50 hover:bg-emerald-50/40 cursor-pointer" onClick={() => setExpanded(expanded === r.sid ? null : r.sid)}>
                  <td className="px-4 py-3 font-bold text-slate-800">
                    <span className="inline-flex items-center gap-1.5">
                      {expanded === r.sid ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{r.name}
                    </span>
                  </td>
                  <td className="text-center px-2 font-bold">{r.lessons.length}</td>
                  <td className={`text-center px-2 font-black ${scoreColor(r.speakAvg)}`}>{r.speakAvg ?? '—'}</td>
                  <td className={`text-center px-2 font-black ${scoreColor(r.exAvg)}`}>{r.exAvg ?? '—'}</td>
                  <td className="text-center px-2 font-bold">{r.submitted}</td>
                  <td className="text-center px-2 text-xs text-slate-500 whitespace-nowrap">{fmtTime(r.lastActive)}</td>
                  <td className="px-2 text-right">
                    <button title="Xoá học sinh" onClick={e => { e.stopPropagation(); onRemove(r.sid, r.name); }} className="p-1.5 text-slate-300 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
                {expanded === r.sid && (
                  <tr className="bg-slate-50/70">
                    <td colSpan={7} className="px-4 py-3">
                      {r.lessons.length === 0 ? (
                        <p className="text-xs text-slate-400">Con chưa học bài nào.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {r.lessons.map(l => (
                            <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs bg-white rounded-xl border border-slate-100 px-3 py-2">
                              <span className="font-bold text-slate-700 min-w-[140px] flex-1">{l.topic || '(không tên)'}</span>
                              <span className="text-slate-500">{l.level}</span>
                              <span>Nói: <b className={scoreColor(l.speakingScore)}>{l.speakingScore ?? '—'}</b></span>
                              <span>Bài tập: <b className={scoreColor(l.exerciseScore)}>{l.exerciseScore ?? '—'}</b></span>
                              {l.submitted && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black">Đã nộp</span>}
                              <span className="text-slate-400">{fmtTime(l.submittedAt || l.createdAt)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------- Giao bài nói (cô tạo bằng AI) ----------------
const AssignTab: React.FC<{
  code: string | null; data: ClassData; onError: (m: string) => void; hasKey: boolean; onNeedKey: () => void;
}> = ({ code, data, onError, hasKey, onNeedKey }) => {
  const [mode, setMode] = useState<'library' | 'generate' | 'useInput'>('library');
  const [input, setInput] = useState('');
  const [level, setLevel] = useState('Starters');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'' | 'gen' | 'save'>('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [library, setLibrary] = useState<Record<string, SavedLesson>>({});
  const [peek, setPeek] = useState<string | null>(null);
  useEffect(() => listenLibrary(setLibrary), []);
  const [sampleDone, setSampleDone] = useState<Record<string, boolean>>({});
  useEffect(() => listenSampleAudioDone(setSampleDone), []);
  const [bulk, setBulk] = useState<{ running: boolean; done: number; total: number; current?: string; msg?: string } | null>(null);
  const bulkStop = useRef(false);
  const sampleIds = Object.keys(SAMPLE_LESSONS);
  const sampleHave = sampleIds.filter(id => sampleDone[id]).length;

  /** Tạo giọng Leda cho mọi bài mẫu còn thiếu (key của cô), lần lượt từng bài */
  const runBulk = async () => {
    const useEl = getTtsProvider() === 'elevenlabs';
    // Danh sách key Gemini: key chính trước, rồi bảng key dự phòng
    const keys = useEl ? [''] : Array.from(new Set([mainKey(), ...getGeminiKeyPool()].filter(Boolean)));
    if (!useEl && !keys.length) { onNeedKey(); return; }
    const todo = sampleIds.filter(id => !sampleDone[id]);
    if (!todo.length) return;
    bulkStop.current = false;
    let done = 0, fails = 0, lastErr = '', ki = 0, i = 0;
    if (!useEl) setKeyOverride(keys[0]);
    setBulk({ running: true, done: 0, total: todo.length });
    try {
      while (i < todo.length && !bulkStop.current) {
        const id = todo[i];
        const l = SAMPLE_LESSONS[id];
        const keyNote = !useEl && keys.length > 1 ? ` · key ${ki + 1}/${keys.length}` : '';
        setBulk({ running: true, done, total: todo.length, current: `${l.level} · ${l.topic}${keyNote}` });
        const b64 = await makeLessonAudio(l.readingText, l.level).catch((e: any) => { lastErr = e?.message || ''; return null; });
        let ok = false;
        if (b64) { try { await saveSampleAudio(id, b64); ok = true; } catch { /* lỗi mạng */ } }
        if (ok) { done++; fails = 0; i++; }
        else if (!useEl && ki < keys.length - 1) {
          // key này hết lượt → sang key kế tiếp, làm lại đúng bài này
          ki++; setKeyOverride(keys[ki]); fails = 0; continue;
        } else if (++fails >= 2) {
          setBulk({ running: false, done, total: todo.length,
            msg: (lastErr ? `Tạm dừng: ${lastErr} ` : `Tạm dừng: ${keys.length > 1 ? `cả ${keys.length} key` : 'key của cô'} đều đang hết lượt tạo giọng. `) + 'Bài đã tạo được giữ lại — lúc khác cô bấm lại để làm tiếp.' });
          return;
        }
        await new Promise(res => setTimeout(res, 2500));
      }
      setBulk({ running: false, done, total: todo.length,
        msg: bulkStop.current ? 'Đã dừng. Bài đã tạo được giữ lại.' : `Xong: đã tạo giọng AI cho ${done} bài mẫu.` });
    } finally { setKeyOverride(null); }
  };
  const list = (Object.entries(data.assignments) as [string, Assignment][]).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

  const samples = Object.entries(SAMPLE_LESSONS).filter(([, l]) => l.level === level);
  const mine = (Object.entries(library) as [string, SavedLesson][])
    .filter(([, l]) => l.level === level)
    .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
  const countMine = (lv: string) => (Object.values(library) as SavedLesson[]).filter(l => l.level === lv).length;

  const [media, setMedia] = useState<'' | 'img' | 'audio'>('');

  const openLesson = (l: { topic: string; level: string; readingText: string; translation?: string; vocabulary?: VocabItem[]; image?: string; hasAudio?: boolean }, origin: Draft['origin'], id: string) => {
    setLevel(l.level);
    setSavedMsg(null);
    setDraft({
      topic: l.topic, readingText: l.readingText, translation: l.translation || '', vocabulary: l.vocabulary || [],
      image: l.image, audio: (origin === 'saved' && l.hasAudio) || (origin === 'sample' && sampleDone[id]) ? undefined : null,
      sampleAudio: origin === 'sample' && !!sampleDone[id],
      origin, libId: origin === 'saved' ? id : undefined, sampleId: origin === 'sample' ? id : undefined,
    });
    if (origin === 'sample' && sampleDone[id]) {
      fetchSampleAudio(id).then(b64 => setDraft(d => (d && d.sampleId === id ? { ...d, audio: b64 } : d))).catch(() => {});
    }
    if (origin === 'saved' && l.hasAudio) {
      fetchLibraryAudio(id).then(b64 => setDraft(d => (d && d.libId === id ? { ...d, audio: b64 } : d))).catch(() => {});
    }
    setTimeout(() => document.getElementById('assign-draft')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  /** Tạo ảnh / giọng đọc AI cho bản nháp hiện tại (key của cô); bài của cô thì lưu luôn vào kho */
  const addImage = async () => {
    if (!draft) return;
    if (!hasKey) { onNeedKey(); return; }
    const d0 = draft;
    setMedia('img');
    try {
      const img = await makeLessonImage('', d0.topic + ': ' + d0.readingText.slice(0, 200));
      if (!img) { onError('Key của cô chưa tạo được ảnh AI (key miễn phí thường không có quyền tạo ảnh). Bài vẫn giữ ảnh hiện tại.'); return; }
      setDraft(d => (d && d.readingText === d0.readingText ? { ...d, image: img } : d));
      if (d0.libId) await saveToLibrary(d0.libId, { ...d0, level, image: img, audio: undefined }, false).catch(() => {});
    } finally { setMedia(''); }
  };
  const addAudio = async () => {
    if (!draft) return;
    if (!hasKey && getTtsProvider() !== 'elevenlabs') { onNeedKey(); return; }
    const d0 = draft;
    setMedia('audio');
    try {
      const b64 = await makeLessonAudio(d0.readingText, level).catch((e: any) => { onError(e?.message || 'Chưa tạo được giọng đọc AI.'); return undefined; });
      if (b64 === undefined) return;
      if (!b64) { onError('Chưa tạo được giọng đọc AI (hết lượt hoặc key chưa hỗ trợ). Học sinh vẫn nghe bằng giọng đọc của máy.'); return; }
      const sameSample = !!d0.sampleId && SAMPLE_LESSONS[d0.sampleId]?.readingText === d0.readingText.trim();
      setDraft(d => (d && d.readingText === d0.readingText ? { ...d, audio: b64, sampleAudio: sameSample } : d));
      if (d0.libId) await saveToLibrary(d0.libId, { ...d0, level, audio: b64 }, false).catch(() => {});
      if (sameSample) await saveSampleAudio(d0.sampleId!, b64).catch(() => {});
    } finally { setMedia(''); }
  };

  const generate = async () => {
    if (!hasKey) { onNeedKey(); return; }
    if (!input.trim()) { onError(mode === 'generate' ? 'Cô nhập chủ đề hoặc từ vựng trước nhé.' : 'Cô dán đoạn văn tiếng Anh trước nhé.'); return; }
    setBusy('gen'); setSavedMsg(null);
    let made = false;
    try {
      const r = await generateContent(input.trim(), level as EnglishLevel, mode === 'useInput' ? 'useInput' : 'generate');
      const lesson = { topic: r.topicName || input.trim().slice(0, 60), level, readingText: r.readingText, translation: r.translation, vocabulary: r.vocabulary || [] };
      // Tạo đến đâu lưu đến đấy: bấm "Tạo lại" thì ghi đè bản nháp AI chưa giao, không sinh bài rác.
      const reuse = draft?.origin === 'ai' && draft.libId ? draft.libId : null;
      const lid = reuse || newLibraryId();
      made = true;
      setDraft({ ...lesson, origin: 'ai', libId: lid, image: undefined, audio: null });
      try { await saveToLibrary(lid, { ...lesson, image: undefined, audio: null }, !reuse); } catch { onError('Bài đã tạo nhưng chưa lưu được vào kho (mất mạng?).'); }
      setBusy('');
      // Ảnh + giọng đọc AI tạo ngay sau bài (dùng key của cô), tự lưu vào kho
      setMedia('img');
      const img = await makeLessonImage(r.prompt, lesson.topic);
      if (img) {
        setDraft(d => (d && d.libId === lid ? { ...d, image: img } : d));
        await saveToLibrary(lid, { ...lesson, image: img }, false).catch(() => {});
      }
      setMedia('audio');
      const b64 = await makeLessonAudio(lesson.readingText, level).catch((e: any) => { onError(`Bài đã tạo, nhưng chưa tạo được giọng: ${e?.message || ''}`); return null; });
      if (b64) {
        setDraft(d => (d && d.libId === lid && d.readingText === lesson.readingText ? { ...d, audio: b64 } : d));
        await saveToLibrary(lid, { ...lesson, image: img || undefined, audio: b64 }, false).catch(() => {});
      }
    } catch (e: any) {
      if (!made) onError(friendlyAiError(e));
    } finally { setBusy(''); setMedia(''); }
  };

  const assign = async () => {
    if (!draft) return;
    if (!code) { onError('Cô tạo lớp trước (ô Tạo lớp mới) rồi mới giao bài được nhé. Bài trong kho vẫn giữ nguyên.'); return; }
    if (!draft.readingText.trim()) { onError('Bài đọc đang trống.'); return; }
    setBusy('save');
    try {
      await addAssignment(code, draft.topic, level, note, { ...draft, audio: draft.audio || null });
      // Cập nhật kho: bài của cô lưu cả phần cô sửa; bài mẫu cô đã sửa thì lưu thành bài mới của cô.
      try {
        const lesson = { ...draft, level };
        if (draft.libId) {
          await saveToLibrary(draft.libId, lesson, false);
          await markLibraryUsed(draft.libId, library[draft.libId]?.usedCount || 0);
        } else if (draft.sampleId) {
          const s = SAMPLE_LESSONS[draft.sampleId];
          if (s && (s.readingText !== draft.readingText.trim() || s.topic !== draft.topic.trim() || s.translation !== draft.translation.trim() || (!!draft.audio && !draft.sampleAudio))) {
            const lid = newLibraryId();
            await saveToLibrary(lid, { ...lesson, audio: draft.audio || null }, true);
            await markLibraryUsed(lid, 0);
          }
        }
      } catch { /* lỗi lưu kho không chặn việc giao bài */ }
      setDraft(null); setInput(''); setNote('');
      setSavedMsg('Đã giao bài cho cả lớp. Học sinh mở app là thấy ngay, không cần API key.');
    } catch (e: any) { onError(e.message); } finally { setBusy(''); }
  };

  const draftAudio = draft?.audio;
  const draftLoadAudio = useMemo(() => (draftAudio ? async () => draftAudio : undefined), [draftAudio]);
  const peekLoaders = useRef<Record<string, () => Promise<string | null>>>({});
  const peekLoader = (id: string) => (peekLoaders.current[id] ||= () => fetchLibraryAudio(id));
  const samplePeekLoader = (id: string) => (peekLoaders.current['S' + id] ||= () => fetchSampleAudio(id));

  const wc = (t: string) => t.split(/\s+/).filter(Boolean).length;
  const lessonRow = (id: string, l: { topic: string; readingText: string; theme?: string; usedCount?: number; image?: string; hasAudio?: boolean }, origin: Draft['origin']) => (
    <li key={id} className="px-2 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setPeek(peek === id ? null : id)} className="min-w-0 text-left flex-1 flex items-center gap-3">
          {l.image ? <img src={l.image} alt="" loading="lazy" onError={e => { e.currentTarget.style.visibility = 'hidden'; }} className="w-14 h-10 sm:w-16 sm:h-11 rounded-lg object-cover shrink-0 bg-slate-100" />
            : <span className="w-14 h-10 sm:w-16 sm:h-11 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center text-lg">📖</span>}
          <span className="min-w-0">
          <p className="font-bold text-slate-800 truncate">{l.topic}</p>
          <p className="text-xs text-slate-500 truncate">
            {origin === 'sample' ? (l.theme || 'Bài mẫu') : 'Cô đã tạo'} · {wc(l.readingText)} từ
            {l.usedCount ? ` · đã giao ${l.usedCount} lần` : ''}{l.hasAudio || (origin === 'sample' && sampleDone[id]) ? ' · 🎙️ giọng AI' : ''}
          </p>
          <p className="text-[11px] font-bold text-emerald-600">{peek === id ? '▲ Thu gọn' : '▼ Xem như học sinh'}</p>
          </span>
        </button>
        <button onClick={() => openLesson(origin === 'sample' ? SAMPLE_LESSONS[id] : library[id], origin, id)}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-green text-white text-xs font-black">Xem & giao</button>
        {origin === 'saved' && (
          <button title="Xoá khỏi kho (không ảnh hưởng bài đã giao)"
            onClick={() => { if (confirm(`Xoá bài "${l.topic}" khỏi kho của cô? Bài đã giao cho lớp vẫn giữ nguyên.`)) removeFromLibrary(id); }}
            className="shrink-0 p-1.5 text-slate-300 hover:text-red-600"><Trash2 size={14} /></button>
        )}
      </div>
      {peek === id && (
        <div className="mt-3">
          <LessonCard label="Học sinh sẽ thấy" a={origin === 'sample' ? SAMPLE_LESSONS[id] : library[id]}
            loadAudio={origin === 'saved' ? (library[id]?.hasAudio ? peekLoader(id) : undefined) : (sampleDone[id] ? samplePeekLoader(id) : undefined)} />
          <div className="mt-3"><RecorderPreview /></div>
        </div>
      )}
    </li>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">Chọn bài nói và giao cho cả lớp</p>
          {!hasKey && mode !== 'library' && (
            <button onClick={onNeedKey} className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Zap size={14} /> Cô nhập API key Gemini để tạo bài
            </button>
          )}
        </div>
        <div className="flex gap-1 sm:gap-2 bg-slate-100 p-1 rounded-xl text-xs sm:text-sm">
          {([['library', '📚 Kho bài'], ['generate', '💡 AI tạo bài'], ['useInput', '📝 Đoạn văn của cô']] as const).map(([m, label]) => (
            <button type="button" key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 px-1 rounded-lg font-black ${mode === m ? 'bg-white shadow text-brand-green-dark' : 'text-slate-500'}`}>{label}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map(l => (
            <button type="button" key={l} onClick={() => setLevel(l)} title={LEVEL_INFO[l]?.desc}
              className={`px-3 py-1.5 rounded-lg text-xs font-black border ${level === l ? 'bg-brand-green text-white border-brand-green' : 'border-slate-200 text-slate-600'}`}>
              {l}{mode === 'library' && <span className="ml-1 opacity-70">{5 + countMine(l)}</span>}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400">{LEVEL_INFO[level]?.label} — {LEVEL_INFO[level]?.desc}</p>
        {mode === 'library' ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-amber-50 border border-emerald-100 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-700">🎙️ Giọng AI cho bài mẫu: <span className="text-emerald-700">{sampleHave}/{sampleIds.length}</span> bài đã có</p>
                {bulk?.running ? (
                  <button onClick={() => { bulkStop.current = true; }} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-600">Dừng</button>
                ) : sampleHave < sampleIds.length ? (
                  <button onClick={runBulk} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-green text-white text-xs font-black">
                    <Sparkles size={14} /> Tạo giọng cho {sampleIds.length - sampleHave} bài còn thiếu
                  </button>
                ) : <span className="text-xs font-black text-emerald-700">✓ Đủ cả {sampleIds.length} bài</span>}
              </div>
              <VoiceSettings />
              {bulk?.running && (
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-white overflow-hidden"><div className="h-full bg-brand-green transition-all" style={{ width: `${(bulk.done / Math.max(1, bulk.total)) * 100}%` }} /></div>
                  <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> {bulk.done}/{bulk.total} · đang tạo: {bulk.current}</p>
                </div>
              )}
              {bulk?.msg && !bulk.running && <p className="text-[11px] font-bold text-slate-600">{bulk.msg}</p>}
              <p className="text-[11px] text-slate-400">Tạo xong thì mọi lớp nghe giọng này, không cần tạo lại. Bài nào đã có giọng thì giữ nguyên.</p>
            </div>
            <div className="rounded-2xl border border-emerald-100">
              <p className="px-3 pt-2.5 text-[11px] font-black text-emerald-700 uppercase tracking-wider">⭐ Bài mẫu chuẩn ({samples.length})</p>
              <ul className="divide-y divide-slate-100 px-1">
                {samples.map(([id, l]) => lessonRow(id, l, 'sample'))}
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-100">
              <p className="px-3 pt-2.5 text-[11px] font-black text-amber-700 uppercase tracking-wider">✍️ Bài cô đã tạo ({mine.length})</p>
              {mine.length === 0 ? (
                <p className="px-3 py-3 text-xs text-slate-400">Chưa có. Mỗi bài cô tạo bằng AI sẽ tự lưu vào đây để dùng lại cho lớp khác.</p>
              ) : (
                <ul className="divide-y divide-slate-100 px-1">
                  {mine.map(([id, l]) => lessonRow(id, l, 'saved'))}
                </ul>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Giao bài từ kho không cần API key. Bài mẫu soạn theo chủ đề và độ khó của Cambridge YLE (Starters–Flyers) và CEFR (A1–B2).</p>
          </div>
        ) : mode === 'generate' ? (
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Chủ đề hoặc từ vựng, VD: My family; cake, picture, seven"
            className="w-full px-3 py-2.5 text-sm border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green" />
        ) : (
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={5} placeholder="Dán đoạn văn tiếng Anh cô muốn học sinh đọc (giữ nguyên từng chữ)"
            className="w-full px-3 py-2.5 text-sm border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green" />
        )}
        {mode !== 'library' && (
          <button onClick={generate} disabled={!!busy}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-brand-green text-white font-black text-sm disabled:opacity-60">
            {busy === 'gen' ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {busy === 'gen' ? 'AI đang soạn bài...' : draft?.origin === 'ai' ? 'Tạo lại bài khác' : 'Tạo bài bằng AI'}
          </button>
        )}
        {savedMsg && <p className="text-sm font-bold text-emerald-700 flex items-center gap-1"><Check size={16} /> {savedMsg}</p>}
      </div>

      {draft && (
        <div id="assign-draft" className="bg-white rounded-3xl shadow-xl border-4 border-amber-200 p-4 sm:p-5 space-y-3 scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black text-amber-700 uppercase tracking-wider">Xem lại và sửa trước khi giao · {level}</p>
            <span className="text-[11px] font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
              {draft.origin === 'sample' ? '⭐ Bài mẫu chuẩn' : '✓ Đã lưu vào kho của cô'}
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-black text-slate-500 uppercase">👀 Học sinh sẽ thấy bài như thế này</p>
            <LessonCard label="Học sinh sẽ thấy" a={{ ...draft, level }} loadAudio={draftLoadAudio} />
            <RecorderPreview />
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs">
            <span className={`px-2.5 py-1 rounded-full font-black ${draft.image ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
              {draft.image ? '🖼️ Có ảnh' : '🖼️ Chưa có ảnh'}
            </span>
            <span className={`px-2.5 py-1 rounded-full font-black ${draft.audio ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
              {draft.audio ? '🎙️ Giọng AI' : draft.audio === undefined ? '🎙️ Đang tải giọng đọc…' : '🔈 Giọng đọc của máy'}
            </span>
            {media ? (
              <span className="flex items-center gap-1 font-black text-emerald-700"><RefreshCw size={14} className="animate-spin" />
                {media === 'img' ? 'Đang tạo ảnh bằng key của cô…' : 'Đang tạo giọng đọc AI…'}</span>
            ) : (
              <>
                <button onClick={addImage} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-black text-slate-700 hover:border-emerald-300">
                  {draft.image ? 'Tạo ảnh khác (AI)' : '+ Tạo ảnh (AI)'}</button>
                {draft.sampleId && draft.image !== SAMPLE_LESSONS[draft.sampleId]?.image && (
                  <button onClick={() => setDraft({ ...draft, image: SAMPLE_LESSONS[draft.sampleId!]?.image })} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-black text-slate-700">Dùng ảnh gốc</button>
                )}
                {draft.image && <button onClick={() => setDraft({ ...draft, image: undefined })} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-black text-slate-500">Bỏ ảnh</button>}
                {draft.audio !== undefined && (
                  <button onClick={addAudio} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-black text-slate-700 hover:border-emerald-300">
                    {draft.audio ? 'Tạo lại giọng AI' : '+ Tạo giọng AI'}</button>
                )}
              </>
            )}
            <span className="basis-full text-[11px] text-slate-400">Ảnh dùng key Gemini; giọng AI dùng nguồn cô chọn trong Kho bài (Leda hoặc ElevenLabs). Không có giọng AI thì học sinh nghe bằng giọng đọc có sẵn của máy.</span>
          </div>
          <details className="rounded-2xl border border-slate-100 px-3 py-2 group" open={draft.origin === 'ai'}>
            <summary className="cursor-pointer text-[11px] font-black text-slate-500 uppercase py-1">✏️ Sửa nội dung bài</summary>
            <div className="space-y-3 pt-2">
          <label className="block space-y-1">
            <span className="text-[11px] font-black text-slate-500 uppercase">Tên bài</span>
            <input value={draft.topic} onChange={e => setDraft({ ...draft, topic: e.target.value })}
              className="w-full px-3 py-2 text-sm font-bold border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green" />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-black text-slate-500 uppercase">Bài đọc học sinh sẽ đọc to</span>
            <textarea value={draft.readingText} onChange={e => setDraft({ ...draft, readingText: e.target.value, audio: draft.audio ? null : draft.audio, sampleAudio: false })} rows={6}
              className="w-full px-3 py-2 text-base leading-relaxed border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green" />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-black text-slate-500 uppercase">Bản dịch tiếng Việt</span>
            <textarea value={draft.translation} onChange={e => setDraft({ ...draft, translation: e.target.value })} rows={3}
              className="w-full px-3 py-2 text-sm border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green" />
          </label>
          {draft.vocabulary.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {draft.vocabulary.map((v, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
                  {v.emoji} <b>{v.word}</b> {v.ipa && <span className="text-slate-400">{v.ipa}</span>} — {v.meaning}
                </span>
              ))}
            </div>
          )}
            </div>
          </details>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Lời nhắn cho học sinh (không bắt buộc), VD: Hạn nộp tối thứ Năm"
            className="w-full px-3 py-2.5 text-sm border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green" />
          <div className="flex flex-wrap gap-2">
            <button onClick={assign} disabled={!!busy} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-green text-white font-black text-sm disabled:opacity-60">
              {busy === 'save' ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />} {code ? 'Giao bài cho lớp' : 'Giao bài (cần tạo lớp trước)'}
            </button>
            <button onClick={() => setDraft(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-black text-sm">Đóng</button>
          </div>
        </div>
      )}

      {code && (

      <div className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 p-3">
        <p className="px-2 pt-1 pb-2 text-xs font-black text-emerald-600 uppercase tracking-wider">Bài đã giao ({list.length})</p>
        {list.length === 0 ? (
          <p className="text-sm text-slate-400 p-3">Chưa giao bài nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map(([id, a]) => {
              const subs = Object.values(data.submissions[id] || {}) as Submission[];
              return (
                <li key={id} className="flex items-center justify-between gap-3 px-2 py-2.5">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{a.topic} <span className="text-xs font-black text-emerald-600 ml-1">{a.level}</span></p>
                    <p className="text-xs text-slate-500 truncate">
                      {a.readingText ? `${subs.length} bài nộp · ${subs.filter(s => s.status === 'graded').length} đã chấm` : 'Chỉ giao chủ đề (HS tự tạo bài, cần API key riêng)'}
                      {a.note ? ` · ${a.note}` : ''}
                    </p>
                  </div>
                  <button title="Xoá bài (xoá cả bài nộp)"
                    onClick={() => { if (confirm(`Xoá bài "${a.topic}" và toàn bộ bài nộp của bài này?`)) removeAssignment(code, id); }}
                    className="p-1.5 text-slate-300 hover:text-red-600"><Trash2 size={14} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      )}
    </div>
  );
};

// ---------------- Chấm bài & báo cáo ----------------
const GradeTab: React.FC<{
  code: string; className: string; data: ClassData; hasKey: boolean; onNeedKey: () => void; callName: string;
  autoGrade: boolean; setAutoGrade: (v: boolean) => void; gradingKey: string | null; gradeError: string | null;
  onGrade: (aid: string, sid: string) => void; onRetry: (aid: string, sid: string) => void;
}> = (p) => {
  const [report, setReport] = useState<{ aid: string; sid: string } | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState(p.callName);
  useEffect(() => setNameDraft(p.callName), [p.callName]);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const rows = useMemo(() => {
    const out: { aid: string; sid: string; a: Assignment; s: Submission }[] = [];
    Object.entries(p.data.submissions || {}).forEach(([aid, bySid]) => {
      const a = p.data.assignments[aid];
      if (!a) return;
      Object.entries(bySid || {}).forEach(([sid, s]) => out.push({ aid, sid, a, s: s as Submission }));
    });
    return out.sort((x, y) => (y.s.submittedAt || 0) - (x.s.submittedAt || 0));
  }, [p.data]);

  const listen = async (aid: string, sid: string) => {
    const k = `${aid}/${sid}`;
    setPlaying(k);
    try {
      const b64 = await fetchRecording(p.code, aid, sid);
      if (!b64) throw new Error('none');
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' })));
    } catch { setPlaying(null); alert('Không tải được file ghi âm.'); }
  };

  const open = report ? rows.find(r => r.aid === report.aid && r.sid === report.sid) : null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={p.autoGrade} onChange={e => p.setAutoGrade(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
            Tự động chấm bài mới khi cô mở bảng này
          </label>
          {!p.hasKey && (
            <button onClick={p.onNeedKey} className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Zap size={14} /> Nhập API key để chấm
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-slate-500">Xưng hô trong lời nhận xét:</span>
          <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} className="w-32 px-2 py-1.5 border-2 border-emerald-100 rounded-lg text-sm font-bold" />
          {nameDraft.trim() !== p.callName && (
            <button onClick={() => saveCallName(nameDraft)} className="px-3 py-1.5 rounded-lg bg-brand-green text-white text-xs font-black">Lưu</button>
          )}
        </div>
        {p.gradingKey && (
          <p className="text-sm font-bold text-emerald-700 flex items-center gap-2"><RefreshCw size={14} className="animate-spin" /> Đang chấm bài của {p.data.submissions[p.gradingKey.split('/')[0]]?.[p.gradingKey.split('/')[1]]?.name}...</p>
        )}
        {p.gradeError && <p className="text-sm font-bold text-red-600 flex items-start gap-1.5"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> {p.gradeError}</p>}
        <p className="text-[11px] text-slate-400">Bài được chấm trên máy của cô bằng API key của cô; key không gửi cho học sinh.</p>
      </div>

      {audioUrl && (
        <div className="bg-white rounded-2xl shadow border border-emerald-100 p-3 flex items-center gap-3">
          <span className="text-xs font-black text-slate-500 shrink-0">🎧 {playing && p.data.submissions[playing.split('/')[0]]?.[playing.split('/')[1]]?.name}</span>
          <audio src={audioUrl} controls autoPlay className="w-full h-9" />
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400 p-6 text-center">Chưa có bài nộp. Khi học sinh nộp bài cô giao, bài sẽ hiện ở đây.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map(({ aid, sid, a, s }) => {
              const k = `${aid}/${sid}`;
              return (
                <li key={k} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 truncate">{a.topic} · {a.level} · {fmtTime(s.submittedAt)}{s.duration ? ` · ${Math.round(s.duration)}s` : ''}</p>
                  </div>
                  {s.status === 'graded' && s.result ? (
                    <span className={`text-lg font-black ${scoreColor(s.result.isSilent ? 0 : s.result.score)}`}>{s.result.isSilent ? 'Im lặng' : s.result.score.toFixed(1)}</span>
                  ) : s.status === 'error' ? (
                    <span className="text-xs font-black text-red-600" title={s.error}>Lỗi chấm</span>
                  ) : (
                    <span className="text-xs font-black px-2 py-1 rounded-full bg-amber-100 text-amber-800">{p.gradingKey === k ? 'Đang chấm…' : 'Chờ chấm'}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <button onClick={() => listen(aid, sid)} title="Nghe bài đọc" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Play size={16} /></button>
                    {s.status === 'graded' && s.result ? (
                      <button onClick={() => setReport({ aid, sid })} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-brand-green text-white text-xs font-black">
                        <FileText size={14} /> Báo cáo
                      </button>
                    ) : null}
                    {(s.status === 'error' || s.status === 'graded') && (
                      <button onClick={() => p.onRetry(aid, sid)} title="Chấm lại" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><RefreshCw size={16} /></button>
                    )}
                    {s.status === 'pending' && !p.autoGrade && (
                      <button onClick={() => (p.hasKey ? p.onGrade(aid, sid) : p.onNeedKey())} disabled={!!p.gradingKey}
                        className="px-3 py-2 rounded-lg bg-brand-green text-white text-xs font-black disabled:opacity-50">Chấm</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {open && open.s.result && (
        <ReportModal
          code={p.code} aid={open.aid} sid={open.sid}
          studentName={open.s.name} className={p.className} lessonTopic={open.a.topic} level={open.a.level}
          result={open.s.result} report={open.s.report || ''} callName={p.callName} gradedAt={open.s.gradedAt}
          onClose={() => setReport(null)}
        />
      )}
    </div>
  );
};


// ---------------- Đổi mật khẩu ----------------
const ChangePasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [oldP, setOldP] = useState('');
  const [newP, setNewP] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={async e => {
          e.preventDefault(); setBusy(true);
          try { await changeTeacherPassword(oldP, newP); setMsg({ ok: true, text: 'Đã đổi mật khẩu. Lần sau cô dùng mật khẩu mới nhé.' }); setOldP(''); setNewP(''); }
          catch (err: any) { setMsg({ ok: false, text: err.message }); } finally { setBusy(false); }
        }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-black text-brand-green-dark">Đổi mật khẩu giáo viên</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <input type="password" value={oldP} onChange={e => setOldP(e.target.value)} placeholder="Mật khẩu hiện tại" autoComplete="current-password"
          className="w-full px-3 py-2.5 text-sm border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green" />
        <input type="password" value={newP} onChange={e => setNewP(e.target.value)} placeholder="Mật khẩu mới (ít nhất 6 ký tự)" autoComplete="new-password"
          className="w-full px-3 py-2.5 text-sm border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green" />
        {msg && <p className={`text-sm font-bold ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
        <button disabled={busy} className="w-full py-2.5 rounded-xl bg-brand-green text-white font-black disabled:opacity-60">Lưu mật khẩu mới</button>
      </form>
    </div>
  );
};
