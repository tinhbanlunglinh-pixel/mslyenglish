import React, { useState, useEffect } from 'react';
import { UserRole, AuthUser } from './types';
import { hasApiKey } from './services/geminiService';
import { initCloudSync } from './services/assignmentService';
import { isFirebaseConfigured } from './services/firebaseService';
import { getCurrentUser, logout } from './services/authService';
import { LoginScreen } from './components/LoginScreen';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { SettingsModal } from './components/SettingsModal';
import { LearningHistory } from './components/LearningHistory';
import { VisitCounter } from './components/VisitCounter';

interface LogoProps {
  className?: string;
  color?: string;
}

const MrsDungLogo = ({ className = "w-16 h-16", color = "currentColor" }: LogoProps) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <g stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M35 80C25 75 20 62 20 50C20 38 25 25 35 20" />
        {[28, 38, 48, 58, 68].map(y => <path key={`l-${y}`} d={`M20 ${y} L14 ${y - 4}`} />)}
        <path d="M65 80C75 75 80 62 80 50C80 38 75 25 65 20" />
        {[28, 38, 48, 58, 68].map(y => <path key={`r-${y}`} d={`M80 ${y} L86 ${y - 4}`} />)}
      </g>
      <path d="M50 30C50 30 65 30 70 25C70 45 70 70 50 88C30 70 30 45 30 25C35 30 50 30 50 30Z" fill="white" stroke={color} strokeWidth="1.5" />
      <g fill="#0f172a">
        <circle cx="50" cy="46" r="3" />
        <circle cx="43" cy="48" r="3.5" />
        <circle cx="57" cy="48" r="3.5" />
        <path d="M43 52 C38 52 38 65 43 68 L46 68 V55 L50 55 L50 68 H54 V55 L57 55 V68 L60 68 C65 65 65 52 60 52 H43Z" />
        <path d="M50 40 C50 40 51 39 51 38 C51 37 50.5 36.5 50 36.5 C49.5 36.5 49 37 49 38 C49 39 50 40 50 40Z" fill="#ef4444" />
      </g>
    </svg>
  </div>
);

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const user = getCurrentUser();
    if (user) return user.role;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mrs_dung_user_role') as UserRole;
      if (saved === 'teacher' || saved === 'student') return saved;
    }
    return 'teacher'; // default role
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const cleanupCloudSync = initCloudSync();
    return () => {
      cleanupCloudSync();
    };
  }, []);

  useEffect(() => {
    const valid = hasApiKey();
    setHasKey(valid);
    if (!valid && currentRole === 'teacher' && currentUser) {
      // Prompt settings on launch for teacher if no key configured
      setShowSettings(true);
    }
  }, [currentRole, currentUser]);

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('mrs_dung_user_role', role);
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    if (user.role === 'student' && user.name) {
      localStorage.setItem('mrs_dung_selected_student', user.name);
      if (user.className) {
        localStorage.setItem('mrs_dung_selected_class', user.className);
      }
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
  };

  // If not logged in, show Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col font-serif text-slate-900">
      {/* Header */}
      <header className="bg-brand-700 border-b-4 border-brand-800 sticky top-0 z-50 shadow-xl font-sans">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-4">
            <MrsDungLogo className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl p-1 sm:p-1.5 shadow-lg" color="#16a34a" />
            <div className="flex flex-col">
              <h1 className="text-base sm:text-xl md:text-2xl font-black text-highlight-400 uppercase tracking-tighter font-display leading-tight">
                ENGLISH MRS. DUNG
              </h1>
              <span className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-[0.1em] sm:tracking-[0.2em] opacity-90 hidden xs:block">
                English with Heart
              </span>
            </div>
          </div>

          {/* Center: Role Switcher / Student Identity */}
          {currentUser.role === 'teacher' ? (
            <div className="flex items-center bg-brand-800/80 p-1 rounded-2xl border border-white/10 shadow-inner">
              <button
                onClick={() => handleRoleChange('teacher')}
                className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all ${
                  currentRole === 'teacher'
                    ? 'bg-brand-500 text-white shadow-lg scale-102 ring-2 ring-white/30'
                    : 'text-brand-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-base">👩‍🏫</span>
                <span>Giáo Viên</span>
              </button>

              <button
                onClick={() => handleRoleChange('student')}
                className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all ${
                  currentRole === 'student'
                    ? 'bg-emerald-500 text-white shadow-lg scale-102 ring-2 ring-white/30'
                    : 'text-brand-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-base">🎒</span>
                <span>Xem giao diện HS</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-800/80 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-white/10 text-white shadow-inner">
              <span className="text-base">{currentUser.avatar || '🎒'}</span>
              <span className="text-xs sm:text-sm font-black tracking-wide">Học Sinh: {currentUser.name}</span>
              {currentUser.className && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold hidden sm:inline-block">
                  {currentUser.className}
                </span>
              )}
            </div>
          )}

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            {/* Compact Visit Counter */}
            <div className="hidden lg:block">
              <VisitCounter compact={true} />
            </div>

            {/* Firebase Connected Badge */}
            {isFirebaseConfigured() && (
              <button
                onClick={() => setShowSettings(true)}
                className="hidden sm:flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all"
                title="Đã kết nối Firebase Realtime Database: english-mrs-dung"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden md:inline">🔥 Cloud Sync</span>
                <span className="md:hidden">🔥 Cloud</span>
              </button>
            )}

            {/* History Button */}
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all"
              title="Xem lịch sử học tập"
            >
              <span className="text-base">📊</span>
              <span className="hidden sm:inline">Lịch sử</span>
            </button>

            {/* Settings Button (For teacher) */}
            {currentUser.role === 'teacher' && (
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all"
                title="Cài đặt API & Đồng bộ"
              >
                <span className="text-base">⚙️</span>
                <span className="hidden sm:inline">Cài đặt</span>
                {!hasKey && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" title="Chưa có API key" />
                )}
              </button>
            )}

            {/* User Profile Info & Logout */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
              <div className="hidden sm:flex flex-col text-right text-white leading-tight">
                <span className="text-xs font-black truncate max-w-[120px]">{currentUser.name}</span>
                <span className="text-[9px] text-brand-200 uppercase font-semibold">
                  {currentUser.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-rose-500/80 hover:bg-rose-600 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1 shadow-sm"
                title="Đăng xuất khỏi hệ thống"
              >
                <span>🚪</span>
                <span className="hidden md:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace based on Active Role */}
      <main className="max-w-[1500px] mx-auto px-3 sm:px-6 py-6 sm:py-10 flex-grow w-full relative">
        {currentRole === 'teacher' ? (
          <TeacherDashboard
            onOpenSettings={() => setShowSettings(true)}
            onSwitchToStudent={() => handleRoleChange('student')}
          />
        ) : (
          <StudentDashboard />
        )}
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSaved={() => setHasKey(hasApiKey())}
      />

      {showHistory && (
        <LearningHistory onClose={() => setShowHistory(false)} />
      )}

      {/* Footer with Full Visit Counter and School Information */}
      <footer className="bg-brand-900 text-white border-t-[8px] border-brand-800 pt-16 pb-10 font-sans">
        <div className="max-w-[1500px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start mb-12">
            {/* Brand column */}
            <div className="space-y-4 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="bg-white p-3.5 rounded-2xl w-fit shadow-xl border-2 border-highlight-400">
                <MrsDungLogo className="w-16 h-16" color="#166534" />
              </div>
              <div>
                <h3 className="font-black text-xl text-highlight-400 uppercase leading-none font-display">
                  ENGLISH MRS. DUNG
                </h3>
                <p className="text-brand-100 font-bold text-sm mt-2 opacity-90 italic">
                  “English with Heart. Success with Mrs. Dung”
                </p>
              </div>
            </div>

            {/* Visit Counter Column */}
            <div>
              <VisitCounter compact={false} />
            </div>

            {/* Contact info column */}
            <div className="space-y-3 text-center md:text-left text-sm font-semibold text-brand-100">
              <h4 className="font-black text-highlight-400 text-base uppercase tracking-wider border-b border-white/10 pb-2">
                Thông Tin Liên Hệ
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 justify-center md:justify-start">
                  <span>📍</span>
                  <span>Ngõ 717 Mạc Đăng Doanh, Hải Phòng.</span>
                </li>
                <li className="flex items-center gap-2 justify-center md:justify-start">
                  <span>📞</span>
                  <a href="tel:0364409436" className="hover:text-highlight-400 transition-colors font-bold">
                    Mrs. Dung: 0364409436
                  </a>
                </li>
                <li className="flex items-center gap-2 justify-center md:justify-start">
                  <span>✉️</span>
                  <a href="mailto:nguyendungvn8@gmail.com" className="hover:text-highlight-400 transition-colors">
                    nguyendungvn8@gmail.com
                  </a>
                </li>
                <li className="flex items-center gap-2 justify-center md:justify-start">
                  <span>🌐</span>
                  <a
                    href="https://www.facebook.com/profile.php?id=100054264771359"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-highlight-400 transition-colors underline"
                  >
                    Fanpage Facebook Mrs. Dung
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 text-center text-xs text-brand-300 font-medium">
            © 2026 English Mrs. Dung. Phát triển trên nền tảng Gemini 3.6 & Google Agent Platform. Học Tiếng Anh bằng cả Trái Tim.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
