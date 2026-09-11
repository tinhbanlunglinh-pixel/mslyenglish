import React, { useState, useEffect } from 'react';
import { Assignment, ClassRoom, Student, Submission } from '../../types';
import {
  getClasses,
  getStudents,
  getAssignments,
  calculateDeadlineStatus,
  getStudentSubmission,
  subscribeToSync
} from '../../services/assignmentService';
import { getCurrentUser } from '../../services/authService';
import { StudentLessonView } from './StudentLessonView';
import { StudentLeaderboardHonor } from './StudentLeaderboardHonor';

export const StudentDashboard: React.FC = () => {
  const currentUser = getCurrentUser();
  const isStudentUser = currentUser?.role === 'student';

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassName, setSelectedClassName] = useState<string>(() => {
    if (isStudentUser && currentUser?.className) {
      return currentUser.className;
    }
    return localStorage.getItem('mrs_dung_active_class_name') || 'Lớp 6A1';
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [studentName, setStudentName] = useState<string>(() => {
    if (isStudentUser && currentUser?.name) {
      return currentUser.name;
    }
    return localStorage.getItem('mrs_dung_active_student_name') || '';
  });
  const [customNameInput, setCustomNameInput] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');

  // Helper to format date header
  const formatDateHeader = (dateStr: string) => {
    if (!dateStr || dateStr === 'Chưa cập nhật ngày') return { label: 'Bài tập khác', isToday: false };
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;

      const parts = dateStr.split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;

      if (dateStr === todayStr) {
        return { label: `Hôm nay (Ngày ${formattedDate}) - Mới nhất`, isToday: true };
      }
      if (dateStr === yestStr) {
        return { label: `Hôm qua (Ngày ${formattedDate})`, isToday: false };
      }
      return { label: `Ngày ${formattedDate}`, isToday: false };
    } catch {
      return { label: dateStr, isToday: false };
    }
  };

  // Group assignments by assignedDate, sorted newest date first
  const groupedAssignments = React.useMemo(() => {
    const filtered = assignments.filter(assign => {
      const submission = studentName ? getStudentSubmission(assign.id, studentName) : undefined;
      const hasSubmitted = !!submission;
      if (filterStatus === 'pending') return !hasSubmitted;
      if (filterStatus === 'completed') return hasSubmitted;
      return true;
    });

    const groups: { [dateStr: string]: Assignment[] } = {};
    filtered.forEach(assign => {
      const key = assign.assignedDate || 'Chưa cập nhật ngày';
      if (!groups[key]) groups[key] = [];
      groups[key].push(assign);
    });

    return Object.entries(groups).sort((a, b) => {
      const timeA = new Date(a[0]).getTime();
      const timeB = new Date(b[0]).getTime();
      if (isNaN(timeA) || isNaN(timeB)) return b[0].localeCompare(a[0]);
      return timeB - timeA;
    });
  }, [assignments, studentName, filterStatus]);

  const completedCount = assignments.filter(a => studentName && getStudentSubmission(a.id, studentName)).length;
  const pendingCount = assignments.length - completedCount;

  const refreshData = () => {
    const cls = getClasses();
    setClasses(cls);
    const activeClass = cls.find(c => c.name === selectedClassName) || cls[0];
    if (activeClass) {
      setStudents(getStudents(activeClass.id));
    }
    // Get assignments filtered for this class or ALL (sorted newest first)
    const assignList = getAssignments(selectedClassName);
    setAssignments(assignList);
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribeToSync(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, [selectedClassName]);

  const handleSelectClass = (clsName: string) => {
    setSelectedClassName(clsName);
    localStorage.setItem('mrs_dung_active_class_name', clsName);
    // Reset student if class changes
    setStudentName('');
    localStorage.removeItem('mrs_dung_active_student_name');
  };

  const handleSelectStudent = (name: string) => {
    setStudentName(name);
    localStorage.setItem('mrs_dung_active_student_name', name);
  };

  const handleCustomNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNameInput.trim()) return;
    handleSelectStudent(customNameInput.trim());
    setCustomNameInput('');
  };

  // If a student is actively doing an assignment
  if (selectedAssignment && studentName) {
    return (
      <StudentLessonView
        assignment={selectedAssignment}
        studentName={studentName}
        studentClass={selectedClassName}
        onBack={() => {
          setSelectedAssignment(null);
          refreshData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-brand-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <span>🎒</span> GÓC HỌC TẬP HỌC SINH
            </div>
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight font-display">
              CHÀO MỪNG CON ĐẾN VỚI LỚP MRS. DUNG!
            </h1>
            <p className="text-brand-100 text-sm sm:text-base font-medium mt-1">
              Xem danh sách bài tập cô giao theo ngày, hoàn thành bài tập và nhận ngay chứng nhận điểm cao nhé!
            </p>
          </div>

          {/* Student Status Tag */}
          {studentName ? (
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30 text-right">
              <p className="text-xs text-brand-100 uppercase font-bold">Học sinh đang học:</p>
              <p className="text-lg sm:text-xl font-black text-white">{studentName}</p>
              <p className="text-xs text-highlight-300 font-bold">{selectedClassName}</p>
              {!isStudentUser && (
                <button
                  onClick={() => {
                    setStudentName('');
                    localStorage.removeItem('mrs_dung_active_student_name');
                  }}
                  className="text-[11px] text-white/80 hover:text-white underline mt-1 font-bold inline-block"
                >
                  Đổi bạn khác
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white/20 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/30 text-xs font-bold text-yellow-200">
              ⚠️ Vui lòng chọn lớp và tên con bên dưới để bắt đầu làm bài nhé!
            </div>
          )}
        </div>
      </div>

      {/* Identity Banner / Selector */}
      {isStudentUser ? (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-3xl shadow-sm">
              {currentUser?.avatar || '🎒'}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 mb-1">
                <span>✓ Đã xác thực tài khoản học sinh</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">
                {studentName}
              </h2>
              <p className="text-xs font-bold text-slate-500">
                Lớp: <span className="text-emerald-700 font-black">{selectedClassName}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              🎯 Đang hiển thị danh sách bài tập của lớp {selectedClassName}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-brand-100 space-y-4">
          <h3 className="text-base font-black text-brand-900 uppercase tracking-tight flex items-center gap-2">
            <span>👤</span> CHỌN LỚP VÀ TÊN CỦA CON (CHẾ ĐỘ XEM THỬ)
          </h3>

          {/* Class Selection Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">1. Chọn lớp học của con:</label>
            <div className="flex flex-wrap gap-2">
              {classes.map(c => {
                const isSelected = c.name === selectedClassName;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectClass(c.name)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
                      isSelected
                        ? 'bg-brand-500 border-brand-600 text-white shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-brand-300'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Student Name Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">2. Chọn tên của con trong {selectedClassName}:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {students.map(s => {
                const isSelected = s.name === studentName;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectStudent(s.name)}
                    className={`p-3 rounded-xl text-left font-bold text-sm transition-all border-2 flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <span className="text-lg">{s.avatar || '🎒'}</span>
                    <span className="truncate">{s.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Or Enter Custom Name */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold whitespace-nowrap">Hoặc tự nhập tên:</span>
              <form onSubmit={handleCustomNameSubmit} className="flex gap-2 flex-1 max-w-sm">
                <input
                  type="text"
                  value={customNameInput}
                  onChange={e => setCustomNameInput(e.target.value)}
                  placeholder="Nhập họ tên của con..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl whitespace-nowrap"
                >
                  Xác nhận
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Responsive Layout:
          - Left Column (2/3 width = lg:col-span-8): Danh sách bài tập cập nhật theo ngày, sắp xếp mới nhất
          - Right Column (1/3 width = lg:col-span-4): BẢNG DANH SÁCH THÀNH TÍCH HỌC SINH CHĂM CHỈ ĐANG DẪN ĐẦU ĐIỂM CAO NHẤT
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 2/3 width (lg:col-span-8) - Assignments updated by date, newest first */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-brand-100 space-y-5">
            {/* Header & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-brand-900 uppercase tracking-tight flex items-center gap-2">
                  <span>📚</span> DANH SÁCH BÀI TẬP CẬP NHẬT THEO NGÀY ({assignments.length})
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Bài tập được sắp xếp theo thứ tự ngày mới nhất ở trên cùng • Chú ý thời hạn nộp bài nhé!
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterStatus === 'all'
                      ? 'bg-white text-brand-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({assignments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('pending')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterStatus === 'pending'
                      ? 'bg-white text-amber-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⏳ Chưa làm ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('completed')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterStatus === 'completed'
                      ? 'bg-white text-emerald-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✅ Đã nộp ({completedCount})
                </button>
              </div>
            </div>

            {/* Assignment Groups by Date */}
            {groupedAssignments.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <div className="text-5xl">📖</div>
                <p className="font-bold text-base text-slate-600">
                  {filterStatus === 'pending'
                    ? 'Tuyệt vời! Con đã hoàn thành hết tất cả các bài tập hiện có.'
                    : filterStatus === 'completed'
                    ? 'Con chưa có bài tập nào đã hoàn thành.'
                    : `Hiện chưa có bài tập nào được giao cho ${selectedClassName}`}
                </p>
                <p className="text-xs text-slate-400">Cô Dung sẽ sớm giao thêm bài mới. Hãy quay lại kiểm tra sau nhé!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedAssignments.map(([dateStr, items]) => {
                  const dateInfo = formatDateHeader(dateStr);
                  return (
                    <div key={dateStr} className="space-y-3">
                      {/* Date Group Header */}
                      <div className="flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${dateInfo.isToday ? 'bg-emerald-500 animate-pulse' : 'bg-brand-500'}`} />
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                            <span>📅</span> {dateInfo.label}
                          </h4>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {items.length} bài tập
                        </span>
                      </div>

                      {/* Assignment Cards in this date */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map(assign => {
                          const submission = studentName ? getStudentSubmission(assign.id, studentName) : undefined;
                          const hasSubmitted = !!submission;
                          const deadline = calculateDeadlineStatus(assign.dueDate, hasSubmitted);

                          return (
                            <div
                              key={assign.id}
                              className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                                hasSubmitted
                                  ? 'bg-emerald-50/40 border-emerald-200'
                                  : deadline.isDueSoon
                                  ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-200'
                                  : deadline.isExpired
                                  ? 'bg-rose-50/20 border-rose-200'
                                  : 'bg-white border-slate-200 hover:border-brand-400'
                              }`}
                            >
                              <div>
                                {/* Status badge & dates */}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${deadline.badgeClass}`}>
                                    {deadline.status === 'submitted' && '✅ '}
                                    {deadline.status === 'due_soon' && '⏰ '}
                                    {deadline.status === 'expired' && '⛔ '}
                                    {deadline.status === 'active' && '⏳ '}
                                    {deadline.label}
                                  </span>

                                  <span className="text-xs font-bold text-slate-400">
                                    {assign.targetClassName ? `Lớp: ${assign.targetClassName}` : ''}
                                  </span>
                                </div>

                                {/* Assignment Title */}
                                <h4 className="text-base sm:text-lg font-black text-slate-900 leading-snug line-clamp-2">
                                  {assign.title}
                                </h4>

                                {/* Deadline countdown */}
                                <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                  <span>⏱️ Hạn nộp:</span>
                                  <span className={deadline.isDueSoon ? 'text-amber-700 font-black' : deadline.isExpired ? 'text-rose-600 font-black' : 'text-slate-700'}>
                                    {new Date(assign.dueDate).toLocaleString('vi-VN')} ({deadline.remainingText})
                                  </span>
                                </div>

                                {/* Teacher note */}
                                {assign.teacherNote && (
                                  <p className="mt-2 text-xs text-slate-500 italic bg-white/70 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                                    💬 <strong>Lời dặn:</strong> "{assign.teacherNote}"
                                  </p>
                                )}
                              </div>

                              {/* Bottom Action / Score */}
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                                {hasSubmitted ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">🏆</span>
                                    <div>
                                      <p className="text-xs font-bold text-emerald-800">
                                        Điểm của con: <span className="text-base font-black text-emerald-700">{submission.score.toFixed(1)}/10</span>
                                      </p>
                                      <p className="text-[10px] text-slate-500 font-semibold truncate max-w-[140px]">{submission.evaluation.text}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-slate-400">
                                    Chưa làm bài
                                  </span>
                                )}

                                <button
                                  onClick={() => {
                                    if (!studentName.trim()) {
                                      alert('Con ơi, vui lòng chọn tên của con ở khung phía trên trước khi làm bài nhé!');
                                      return;
                                    }
                                    setSelectedAssignment(assign);
                                  }}
                                  className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 ${
                                    hasSubmitted
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                      : deadline.isDueSoon
                                      ? 'bg-amber-500 hover:bg-amber-600 text-white animate-bounce'
                                      : 'bg-brand-500 hover:bg-brand-600 text-white'
                                  }`}
                                >
                                  {hasSubmitted ? '👀 Xem lại bài' : '🚀 Làm bài ngay'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 1/3 width (lg:col-span-4) - Leaderboard of Hardworking Top Students */}
        <div className="lg:col-span-4 space-y-4">
          <StudentLeaderboardHonor
            initialClassId={selectedClassName}
            compact={true}
            title="BẢNG DANH SÁCH THÀNH TÍCH HỌC SINH CHĂM CHỈ ĐANG DẪN ĐẦU ĐIỂM CAO NHẤT"
            subtitle="Tuyên dương các con nỗ lực làm bài tập về nhà chăm chỉ và đạt điểm số cao nhất lớp Mrs. Dung!"
          />
        </div>
      </div>
    </div>
  );
};
