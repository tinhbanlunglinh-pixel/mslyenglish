import React, { useState } from 'react';
import { GraduationCap, Backpack, LogIn, RefreshCw, KeyRound, Users } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { Session, joinClass, teacherLogin } from '../../services/classroom';

interface Props {
  onLogin: (s: Session) => void;
  onGuest: () => void;
}

export const LoginGate: React.FC<Props> = ({ onLogin, onGuest }) => {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [code, setCode] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('lop')?.toUpperCase() || ''; } catch { return ''; }
  });
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const s = role === 'teacher' ? await teacherLogin(password) : await joinClass(code, name);
      onLogin(s);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const tabClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm sm:text-base transition-all ${
      active ? 'bg-gradient-to-r from-emerald-500 to-brand-green text-white shadow-lg' : 'text-slate-600 hover:bg-slate-200'
    }`;

  return (
    <div className="min-h-screen bg-emerald-50/40 flex flex-col">
      <header className="bg-brand-green border-b border-brand-green-dark shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-16 sm:h-20 flex items-center gap-3">
          <BrandLogo className="w-10 h-10 sm:w-12 sm:h-12" />
          <div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-brand-yellow uppercase">Ms Lý English</h1>
            <p className="hidden sm:block text-[10px] text-emerald-100 font-bold tracking-wider uppercase">Lớp học luyện nói cùng AI</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border-4 border-emerald-100 p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-brand-green-dark uppercase tracking-tight">Vào lớp học</h2>
            <p className="text-sm text-slate-500">Học sinh nhập mã lớp cô giáo đưa. Giáo viên đăng nhập để quản lý lớp.</p>
          </div>

          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button type="button" className={tabClass(role === 'student')} onClick={() => { setRole('student'); setError(null); }}>
              <Backpack size={18} /> Học sinh
            </button>
            <button type="button" className={tabClass(role === 'teacher')} onClick={() => { setRole('teacher'); setError(null); }}>
              <GraduationCap size={18} /> Giáo viên
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {role === 'student' ? (
              <>
                <label className="block space-y-1.5">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Mã lớp</span>
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="VD: K7M2QX"
                    maxLength={8}
                    autoComplete="off"
                    className="w-full px-4 py-3 text-2xl font-black tracking-[0.3em] text-center uppercase border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Họ và tên của con</span>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="VD: Nguyễn Minh Anh"
                    autoComplete="name"
                    className="w-full px-4 py-3 text-base border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green"
                  />
                  <span className="block text-[11px] text-slate-400">Lần sau con nhập đúng họ tên này để giữ kết quả cũ.</span>
                </label>
              </>
            ) : (
              <label className="block space-y-1.5">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Mật khẩu giáo viên</span>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-4 py-3 text-base border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-brand-green"
                  />
                </div>
              </label>
            )}

            {error && (
              <p role="alert" className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 rounded-2xl font-black text-base flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-brand-green text-white shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
            >
              {busy ? <RefreshCw size={20} className="animate-spin" /> : role === 'teacher' ? <Users size={20} /> : <LogIn size={20} />}
              {busy ? 'Đang kết nối...' : role === 'teacher' ? 'Vào bảng giáo viên' : 'Vào lớp'}
            </button>
          </form>

          <button onClick={onGuest} className="w-full text-xs font-bold text-slate-400 hover:text-brand-green underline underline-offset-4">
            Học tự do không cần vào lớp
          </button>
        </div>
      </main>
    </div>
  );
};
