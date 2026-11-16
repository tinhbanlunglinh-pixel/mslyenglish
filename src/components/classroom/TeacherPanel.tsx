import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Copy, Check, LogOut, Mic, Users, BookOpen, Trash2, KeyRound, ChevronDown, ChevronRight, X, RefreshCw,
} from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import {
  Assignment, ClassData, LessonResult, StudentInfo, addAssignment, changeTeacherPassword, createClass, deleteClass,
  listenClass, listenTeacherClasses, removeAssignment, removeStudent,
} from '../../services/classroom';

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
  const [tab, setTab] = useState<'students' | 'assign'>('students');
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

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
            <div className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 p-10 text-center text-slate-400">
              <Users size={48} className="mx-auto mb-3 text-emerald-200" />
              Tạo lớp đầu tiên để nhận mã lớp gửi cho học sinh.
            </div>
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
                {([['students', 'Kết quả học sinh', Users], ['assign', 'Giao chủ đề', BookOpen]] as const).map(([k, label, Icon]) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all ${
                      tab === k ? 'bg-brand-green text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <Icon size={16} /> {label}
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
              ) : (
                <AssignTab code={selected} data={data} onError={setError} />
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

// ---------------- Giao chủ đề ----------------
const AssignTab: React.FC<{ code: string; data: ClassData; onError: (m: string) => void }> = ({ code, data, onError }) => {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('Starters');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const list = (Object.entries(data.assignments) as [string, Assignment][]).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

  return (
    <div className="space-y-4">
      <form
        onSubmit={async e => {
          e.preventDefault(); setBusy(true);
          try { await addAssignment(code, topic, level, note); setTopic(''); setNote(''); }
          catch (err: any) { onError(err.message); } finally { setBusy(false); }
        }}
        className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 p-4 sm:p-5 space-y-3"
      >
        <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">Giao chủ đề luyện nói cho cả lớp</p>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Chủ đề hoặc từ vựng, VD: My family, Animals at the zoo"
          className="w-full px-3 py-2.5 text-sm border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green" />
        <div className="flex flex-wrap gap-2">
          {LEVELS.map(l => (
            <button type="button" key={l} onClick={() => setLevel(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black border ${level === l ? 'bg-brand-green text-white border-brand-green' : 'border-slate-200 text-slate-600'}`}>
              {l}
            </button>
          ))}
        </div>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Lời nhắn cho học sinh (không bắt buộc)"
          className="w-full px-3 py-2.5 text-sm border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green" />
        <button disabled={busy} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-green text-white font-black text-sm disabled:opacity-60">
          {busy ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />} Giao chủ đề
        </button>
      </form>

      <div className="bg-white rounded-3xl shadow-xl border-4 border-emerald-100 p-3">
        {list.length === 0 ? (
          <p className="text-sm text-slate-400 p-3">Chưa giao chủ đề nào. Học sinh vẫn có thể tự chọn chủ đề để học.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map(([id, a]) => (
              <li key={id} className="flex items-center justify-between gap-3 px-2 py-2.5">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{a.topic} <span className="text-xs font-black text-emerald-600 ml-1">{a.level}</span></p>
                  {a.note && <p className="text-xs text-slate-500 truncate">{a.note}</p>}
                </div>
                <button title="Bỏ chủ đề" onClick={() => removeAssignment(code, id)} className="p-1.5 text-slate-300 hover:text-red-600"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
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
