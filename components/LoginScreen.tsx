import React, { useState, useEffect } from 'react';
import { UserRole, AuthUser, ClassRoom, Student } from '../types';
import { login, loginStudentSimple } from '../services/authService';
import { getClasses, getStudents } from '../services/assignmentService';
import { StudentLeaderboardHonor } from './student/StudentLeaderboardHonor';
import { VisitCounter } from './VisitCounter';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  // Default to student role
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Student specific selection state
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [studentClassName, setStudentClassName] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [classStudents, setClassStudents] = useState<Student[]>([]);

  // Load classes & students on mount
  useEffect(() => {
    const cls = getClasses();
    setClasses(cls);
    if (cls.length > 0) {
      setStudentClassName(cls[0].name);
      const stds = getStudents(cls[0].id);
      setClassStudents(stds);
    }
  }, []);

  // When class changes, update student list for suggestions
  const handleClassChange = (className: string) => {
    setStudentClassName(className);
    setErrorMsg('');
    const clsObj = classes.find(c => c.name === className);
    if (clsObj) {
      const stds = getStudents(clsObj.id);
      setClassStudents(stds);
    } else {
      setClassStudents([]);
    }
  };

  // Switch role tabs - clear credentials
  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      let result;
      if (selectedRole === 'student') {
        // Student login: Just Name and Class, NO password!
        result = loginStudentSimple(studentName, studentClassName);
      } else {
        // Teacher login: Mrs. Dung and password 88889999
        result = login(username, password, 'teacher');
      }

      setIsLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMsg(result.error || 'Đăng nhập không thành công. Vui lòng thử lại!');
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 flex flex-col justify-center items-center p-3 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Background Glow Decorations */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container: 2-column on desktop (Login Card + Honor Board Leaderboard), 1-column on mobile */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start relative z-10 my-auto">
        {/* Left Column: Login Card (col-span-12 lg:col-span-5) */}
        <div className="w-full lg:col-span-5 bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 relative animate-fade-in">
          {/* Top Header Card */}
        <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-600 p-6 sm:p-8 text-center text-white relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 bg-white rounded-2xl p-2 shadow-xl flex items-center justify-center transform hover:rotate-6 transition-transform">
            <span className="text-3xl sm:text-4xl">🎓</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase font-display">
            ENGLISH MRS. DUNG
          </h1>
          <p className="text-xs sm:text-sm text-brand-100 font-medium mt-1">
            Hệ Thống Dạy & Học Tiếng Anh Thông Minh
          </p>
        </div>

        {/* Form Container */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Role Selection Tabs */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
              1. Chọn Vai Trò Đăng Nhập
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                className={`py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  selectedRole === 'student'
                    ? 'bg-white text-emerald-700 shadow-md scale-102 ring-2 ring-emerald-500/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="text-base">🎒</span>
                <span>Học Sinh</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('teacher')}
                className={`py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  selectedRole === 'teacher'
                    ? 'bg-white text-brand-700 shadow-md scale-102 ring-2 ring-brand-500/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="text-base">👩‍🏫</span>
                <span>Giáo Viên</span>
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {selectedRole === 'student' ? (
              // STUDENT LOGIN: SIMPLY CLASS & NAME, NO PASSWORD!
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. Chọn Lớp Học Của Con
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm pointer-events-none">
                      🏫
                    </span>
                    <select
                      value={studentClassName}
                      onChange={e => handleClassChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm font-bold bg-white text-slate-800 cursor-pointer"
                    >
                      {classes.length === 0 ? (
                        <option value="Lớp 6A1">Lớp 6A1</option>
                      ) : (
                        classes.map(c => (
                          <option key={c.id} value={c.name}>
                            {c.name} {c.description ? `(${c.description})` : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. Nhập Họ Và Tên Của Con
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm pointer-events-none">
                      🎒
                    </span>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={e => setStudentName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Minh Anh"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>

                  {/* Quick click suggestions if class has student list */}
                  {classStudents.length > 0 && (
                    <div className="mt-2.5">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1">
                        Hoặc bấm chọn nhanh tên của con:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {classStudents.slice(0, 8).map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setStudentName(s.name);
                              setErrorMsg('');
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                              studentName === s.name
                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                                : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{s.avatar || '👤'}</span>
                            <span>{s.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 leading-relaxed">
                  <span className="text-base">✨</span>
                  <span>Con chỉ cần nhập tên và lớp là có thể vào học ngay, <b>không cần mật khẩu</b>!</span>
                </div>
              </div>
            ) : (
              // TEACHER LOGIN: USERNAME & PASSWORD, NO AUTOFILL
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên đăng nhập Giáo Viên
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm pointer-events-none">
                      👩‍🏫
                    </span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Nhập tên đăng nhập..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm transition-all font-medium"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu Giáo Viên
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm pointer-events-none">
                      🔒
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm transition-all font-medium"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 text-sm"
                      tabIndex={-1}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-shake">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-2xl font-black text-sm text-white shadow-xl transition-all flex items-center justify-center gap-2 ${
                selectedRole === 'teacher'
                  ? 'bg-brand-600 hover:bg-brand-700 active:scale-98 shadow-brand-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-emerald-500/30'
              } disabled:opacity-50`}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : selectedRole === 'student' ? (
                <>
                  <span>🚀</span>
                  <span>VÀO HỌC NGAY</span>
                </>
              ) : (
                <>
                  <span>🔐</span>
                  <span>ĐĂNG NHẬP GIÁO VIÊN</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Leaderboard of Hardworking Top Students (col-span-12 lg:col-span-7) */}
      <div className="w-full lg:col-span-7 space-y-4 animate-fade-in">
        <StudentLeaderboardHonor
          initialClassId={studentClassName || 'ALL'}
          title="BẢNG DANH SÁCH THÀNH TÍCH HỌC SINH CHĂM CHỈ ĐANG DẪN ĐẦU ĐIỂM CAO NHẤT"
          subtitle="Tuyên dương các con nỗ lực làm bài tập về nhà chăm chỉ và đạt điểm số cao nhất lớp Mrs. Dung!"
        />

        {/* Real-time Learning Visit Statistics */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
          <VisitCounter compact={false} />
        </div>
      </div>
    </div>
  </div>
  );
};
