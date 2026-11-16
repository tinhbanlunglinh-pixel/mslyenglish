import React, { useState } from 'react';
import App from './App';
import { LoginGate } from './components/classroom/LoginGate';
import { TeacherPanel } from './components/classroom/TeacherPanel';
import { StudentHome } from './components/classroom/StudentHome';
import { Session, getSession, logout } from './services/classroom';

type View = 'login' | 'teacher' | 'student' | 'studio';

const GUEST_KEY = 'msly_guest_mode';

/** Điều hướng: Đăng nhập → (GV) Bảng giáo viên / (HS) Bài cô giao → Phòng luyện nói tự do */
export default function Root() {
  const [session, setSession] = useState<Session | null>(() => getSession());
  const [view, setView] = useState<View>(() => {
    const s = getSession();
    const hasJoinLink = (() => { try { return new URLSearchParams(location.search).has('lop'); } catch { return false; } })();
    if (s?.role === 'teacher') return 'teacher';
    if (s?.role === 'student' && !hasJoinLink) return 'student';
    try { if (!hasJoinLink && localStorage.getItem(GUEST_KEY) === '1') return 'studio'; } catch { /* bỏ qua */ }
    return 'login';
  });

  const doLogout = () => {
    logout();
    try { localStorage.removeItem(GUEST_KEY); } catch { /* bỏ qua */ }
    setSession(null);
    setView('login');
  };

  if (view === 'login') {
    return (
      <LoginGate
        onLogin={s => {
          setSession(s);
          setView(s.role === 'teacher' ? 'teacher' : 'student');
          try { if (location.search) history.replaceState(null, '', location.pathname); } catch { /* bỏ qua */ }
        }}
        onGuest={() => {
          try { localStorage.setItem(GUEST_KEY, '1'); } catch { /* bỏ qua */ }
          setView('studio');
        }}
      />
    );
  }

  if (view === 'teacher' && session?.role === 'teacher') {
    return <TeacherPanel onOpenStudio={() => setView('studio')} onLogout={doLogout} />;
  }

  if (view === 'student' && session?.role === 'student') {
    return <StudentHome session={session} onLogout={doLogout} onOpenStudio={() => setView('studio')} />;
  }

  // key buộc phòng luyện nói làm mới khi đổi người dùng
  const studioKey = session?.role === 'student' ? `${session.code}-${session.sid}` : session?.role || 'guest';
  return (
    <React.Fragment key={studioKey}>
      <App
        session={session}
        onLogout={doLogout}
        onBackToTeacher={() => setView(session?.role === 'student' ? 'student' : 'teacher')}
        onJoinClass={doLogout}
      />
    </React.Fragment>
  );
}
