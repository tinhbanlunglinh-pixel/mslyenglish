import React, { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { ClassRoom, Student, MonthlyReport, MonthlySessionConfig, StudentMonthlyScore } from '../../types';
import {
  getClasses,
  getStudents,
  getMonthlyReports,
  saveMonthlyReport,
  calculateStudentMonthlyAverage,
  getClassSchedule,
  subscribeToSync
} from '../../services/assignmentService';

// Pastel session colors matching the sample image exactly (8 pastel colors for 8 sessions)
const SESSION_PALETTES = [
  { bgHeader: 'bg-yellow-200 border-yellow-300 text-yellow-900', light: 'bg-yellow-50/50' },
  { bgHeader: 'bg-orange-200 border-orange-300 text-orange-900', light: 'bg-orange-50/50' },
  { bgHeader: 'bg-pink-200 border-pink-300 text-pink-900', light: 'bg-pink-50/50' },
  { bgHeader: 'bg-purple-200 border-purple-300 text-purple-900', light: 'bg-purple-50/50' },
  { bgHeader: 'bg-emerald-200 border-emerald-300 text-emerald-900', light: 'bg-emerald-50/50' },
  { bgHeader: 'bg-sky-200 border-sky-300 text-sky-900', light: 'bg-sky-50/50' },
  { bgHeader: 'bg-amber-200 border-amber-300 text-amber-900', light: 'bg-amber-50/50' },
  { bgHeader: 'bg-teal-200 border-teal-300 text-teal-900', light: 'bg-teal-50/50' },
];

// Date format conversion helpers
const convertDMYtoYMD = (dmy: string): string => {
  if (!dmy) return '';
  const parts = dmy.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dmy;
};

const convertYMDtoDMY = (ymd: string): string => {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return ymd;
};

/**
 * Helper to generate 8 sessions according to class schedule (or standard 8 sessions across 4 weeks)
 */
const generate8SessionsFromSchedule = (
  classId: string,
  month: number,
  year: number
): MonthlySessionConfig[] => {
  const schedule = classId ? getClassSchedule(classId) : null;
  const daysInMonth = new Date(year, month, 0).getDate();
  const matchedDates: string[] = [];

  if (schedule && schedule.slots && schedule.slots.length > 0) {
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const jsDay = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const appDayOfWeek = jsDay === 0 ? 1 : jsDay + 1; // 1 = Sun, 2 = Mon, ..., 7 = Sat
      if (schedule.slots.some(s => s.dayOfWeek === appDayOfWeek)) {
        matchedDates.push(`${String(d).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`);
      }
    }
  }

  // If fewer than 8 dates found (or class has no schedule set), distribute 8 dates evenly across the 4 weeks
  if (matchedDates.length < 8) {
    const fallbackDays = [3, 6, 10, 13, 17, 20, 24, 27];
    for (const d of fallbackDays) {
      if (matchedDates.length >= 8) break;
      const validDay = Math.min(d, daysInMonth);
      const str = `${String(validDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      if (!matchedDates.includes(str)) {
        matchedDates.push(str);
      }
    }
    for (let d = 1; d <= daysInMonth && matchedDates.length < 8; d++) {
      const str = `${String(d).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      if (!matchedDates.includes(str)) {
        matchedDates.push(str);
      }
    }
  }

  // Sort dates chronologically
  matchedDates.sort((a, b) => {
    const [da, ma, ya] = a.split('/').map(Number);
    const [db, mb, yb] = b.split('/').map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });

  const final8 = matchedDates.slice(0, 8);

  return final8.map((dateStr, idx) => ({
    id: `s_buoi_${idx + 1}`,
    name: `Buổi ${idx + 1}`,
    date: dateStr,
    columns: [
      { key: 'video', label: 'Video' },
      { key: 'btvn', label: 'BTVN' },
      { key: 'oldLesson', label: 'Bài cũ' }
    ]
  }));
};

export const MonthlyReportAggregator: React.FC = () => {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // Default August
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [centerName, setCenterName] = useState<string>('ENGLISH MRS. DUNG');
  const [isEditingCenter, setIsEditingCenter] = useState(false);

  // Sessions in this report (Exactly 8 sessions)
  const [sessions, setSessions] = useState<MonthlySessionConfig[]>([]);

  // Student scores table
  const [studentScores, setStudentScores] = useState<StudentMonthlyScore[]>([]);

  // Export states
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Modal: Edit all 8 session dates
  const [showEditDatesModal, setShowEditDatesModal] = useState(false);
  const [tempDates, setTempDates] = useState<{ id: string; name: string; date: string }[]>([]);

  // Quick edit single session date
  const [editingSingleSession, setEditingSingleSession] = useState<{ id: string; name: string; date: string } | null>(null);
  const [singleDateInput, setSingleDateInput] = useState('');

  // Load classes & report
  const refresh = () => {
    const cls = getClasses();
    setClasses(cls);
    const activeClassId = selectedClassId || (cls.length > 0 ? cls[0].id : '');
    setSelectedClassId(activeClassId);
  };

  useEffect(() => {
    refresh();
    const unsub = subscribeToSync(() => refresh());
    return () => unsub();
  }, []);

  // When class, month, or year changes -> load or initialize report with 8 sessions
  useEffect(() => {
    if (!selectedClassId) {
      setSessions([]);
      setStudentScores([]);
      return;
    }

    const currentClass = classes.find(c => c.id === selectedClassId);
    const allReports = getMonthlyReports(selectedClassId);
    const existing = allReports.find(r => r.month === selectedMonth && r.year === selectedYear);

    const classStudents = getStudents(selectedClassId);

    if (existing) {
      if (existing.centerName && !existing.centerName.includes('FUTURE STARS')) {
        setCenterName(existing.centerName);
      } else {
        setCenterName('ENGLISH MRS. DUNG');
      }

      // Ensure report has exactly 8 sessions
      let activeSessions: MonthlySessionConfig[];
      if (existing.sessions && existing.sessions.length === 8) {
        activeSessions = existing.sessions;
      } else {
        activeSessions = generate8SessionsFromSchedule(selectedClassId, selectedMonth, selectedYear);
      }
      setSessions(activeSessions);

      // Merge existing scores with any newly added students
      const mergedScores: StudentMonthlyScore[] = classStudents.map(std => {
        const found = existing.studentScores?.find(s => s.studentId === std.id || s.studentName === std.name);
        if (found) {
          const studentScoresObj = { ...(found.scores || {}) };
          // Map older keys s_day_i or s_i to s_buoi_i
          for (let i = 1; i <= 8; i++) {
            const buoiKey = `s_buoi_${i}`;
            if (!studentScoresObj[buoiKey]) {
              const fallbackVal = studentScoresObj[`s_day_${i}`] || studentScoresObj[`s_${i}`];
              if (fallbackVal) {
                studentScoresObj[buoiKey] = fallbackVal;
              }
            }
          }
          return {
            ...found,
            studentId: std.id,
            studentName: std.name,
            englishName: std.englishName || found.englishName || '',
            scores: studentScoresObj
          };
        }
        return {
          studentId: std.id,
          studentName: std.name,
          englishName: std.englishName || '',
          scores: {},
          averageScore: 0
        };
      });

      // Recalculate average
      mergedScores.forEach(s => {
        s.averageScore = calculateStudentMonthlyAverage(s.scores);
      });

      setStudentScores(mergedScores);
    } else {
      // Create initial 8 sessions from schedule for this class
      const initial8 = generate8SessionsFromSchedule(selectedClassId, selectedMonth, selectedYear);
      setSessions(initial8);

      const initialScores: StudentMonthlyScore[] = classStudents.map(std => ({
        studentId: std.id,
        studentName: std.name,
        englishName: std.englishName || '',
        scores: {},
        averageScore: 0
      }));

      setStudentScores(initialScores);
    }
  }, [selectedClassId, selectedMonth, selectedYear, classes]);

  // Student filter inside monthly view
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState<'ALL' | 'NO_BTVN' | 'EXCELLENT'>('ALL');

  const currentClass = classes.find(c => c.id === selectedClassId);

  // Handle inline score change using studentId
  const handleScoreChange = (
    studentId: string,
    sessionId: string,
    columnKey: string,
    rawVal: string
  ) => {
    const studentIndex = studentScores.findIndex(s => s.studentId === studentId);
    if (studentIndex === -1) return;
    const updated = [...studentScores];
    const student = { ...updated[studentIndex] };
    const scores = { ...(student.scores || {}) };
    const sessionCols = { ...(scores[sessionId] || {}) };

    const trimmed = rawVal.trim().replace(',', '.');

    if (trimmed === '' || trimmed === 'x' || trimmed === 'X') {
      sessionCols[columnKey] = trimmed.toLowerCase() as any;
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num) && num >= 0 && num <= 10) {
        sessionCols[columnKey] = num;
      } else {
        sessionCols[columnKey] = trimmed as any;
      }
    }

    scores[sessionId] = sessionCols;
    student.scores = scores;
    student.averageScore = calculateStudentMonthlyAverage(scores);
    updated[studentIndex] = student;
    setStudentScores(updated);
  };

  // Save report
  const handleSaveReport = () => {
    if (!selectedClassId || !currentClass) return;
    const report: MonthlyReport = {
      id: `report_${selectedClassId}_${selectedYear}_${selectedMonth}`,
      classId: selectedClassId,
      className: currentClass.name,
      month: selectedMonth,
      year: selectedYear,
      centerName,
      sessions,
      studentScores,
      updatedAt: new Date().toISOString()
    };
    saveMonthlyReport(report);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  // Date editing handlers
  const handleOpenEditDates = () => {
    setTempDates(sessions.map(s => ({ id: s.id, name: s.name, date: s.date })));
    setShowEditDatesModal(true);
  };

  const handleSaveEditDates = () => {
    const updated = sessions.map(s => {
      const match = tempDates.find(t => t.id === s.id);
      return match ? { ...s, date: match.date } : s;
    });
    setSessions(updated);
    setShowEditDatesModal(false);
  };

  const handleDirectSyncWithSchedule = () => {
    if (!confirm('Đặt lại ngày của 8 buổi học theo lịch học của lớp trong tháng?')) return;
    const scheduleSessions = generate8SessionsFromSchedule(selectedClassId, selectedMonth, selectedYear);
    const updated = sessions.map((s, idx) => ({
      ...s,
      date: scheduleSessions[idx]?.date || s.date
    }));
    setSessions(updated);
  };

  const handleOpenSingleDateEdit = (s: MonthlySessionConfig) => {
    setEditingSingleSession({ id: s.id, name: s.name, date: s.date });
    setSingleDateInput(s.date);
  };

  const handleSaveSingleDate = () => {
    if (!editingSingleSession) return;
    setSessions(sessions.map(s => (s.id === editingSingleSession.id ? { ...s, date: singleDateInput.trim() || s.date } : s)));
    setEditingSingleSession(null);
  };

  // Table horizontal scrolling helpers
  const scrollTable = (offset: number) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };
  const scrollToStart = () => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };
  const scrollToEnd = () => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTo({ left: tableScrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  };
  const scrollToDay = (sessionIndex: number) => {
    if (tableScrollRef.current) {
      // 3 columns * approx 60px = 180px per session
      const targetX = Math.max(0, (sessionIndex - 1) * 180);
      tableScrollRef.current.scrollTo({ left: targetX, behavior: 'smooth' });
    }
  };

  // Export as Image PNG (capturing full width cleanly)
  const handleExportImage = async () => {
    if (!reportRef.current) return;
    try {
      setIsExportingImage(true);
      const fullWidth = Math.max(reportRef.current.scrollWidth, 1200);
      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: fullWidth,
        style: {
          width: `${fullWidth}px`,
          maxWidth: 'none',
          overflow: 'visible'
        }
      });
      const link = document.createElement('a');
      link.download = `Bao_Cao_Hoc_Tap_Thang_${selectedMonth}_${currentClass?.name || 'Lop'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('Không thể xuất ảnh báo cáo. Vui lòng thử lại.');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Export as Excel (.xlsx)
  const handleExportExcel = () => {
    if (!currentClass) return;

    // Build headers
    const headerRow1 = ['LỚP', 'HỌ VÀ TÊN', 'E.NAME'];
    sessions.forEach(s => {
      s.columns.forEach(col => {
        headerRow1.push(`${s.name} (${s.date}) - ${col.label}`);
      });
    });
    headerRow1.push('ĐIỂM TB');

    // Build rows
    const dataRows = studentScores.map(std => {
      const row: any[] = [currentClass.name, std.studentName, std.englishName || ''];
      sessions.forEach(s => {
        s.columns.forEach(col => {
          const val = std.scores?.[s.id]?.[col.key];
          row.push(val !== undefined && val !== '' ? val : '');
        });
      });
      row.push(std.averageScore > 0 ? std.averageScore.toFixed(2).replace('.', ',') : '');
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headerRow1, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Báo cáo Tháng ${selectedMonth}`);
    XLSX.writeFile(wb, `Bao_cao_thang_${selectedMonth}_${currentClass.name}.xlsx`);
  };

  // Sort students for Ranking
  const rankedStudents = [...studentScores]
    .filter(s => s.averageScore > 0)
    .sort((a, b) => b.averageScore - a.averageScore);

  const top1 = rankedStudents[0];
  const top2 = rankedStudents[1];
  const top3 = rankedStudents[2];

  const otherStudents = rankedStudents.slice(3);

  // Divide other students into 2 columns
  const half = Math.ceil(otherStudents.length / 2);
  const otherCol1 = otherStudents.slice(0, half);
  const otherCol2 = otherStudents.slice(half);

  // Filter student scores based on search & filter tab
  const displayedStudentScores = studentScores.filter(std => {
    const matchSearch = !studentSearch.trim() ||
      std.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (std.englishName && std.englishName.toLowerCase().includes(studentSearch.toLowerCase()));
    if (!matchSearch) return false;

    if (studentFilter === 'NO_BTVN') {
      return sessions.some(s => {
        const val = std.scores?.[s.id]?.['btvn'];
        return val === undefined || val === '' || val === 'x' || val === 0;
      });
    }
    if (studentFilter === 'EXCELLENT') {
      return std.averageScore >= 8.0;
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Action & Filter Toolbar (Not printed in image) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-brand-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Picker */}
          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Chọn Lớp Học
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white text-slate-800 focus:border-brand-500 outline-none shadow-sm"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Month Picker */}
          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Tháng
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white text-slate-800 focus:border-brand-500 outline-none shadow-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>

          {/* Year Picker */}
          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Năm
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white text-slate-800 focus:border-brand-500 outline-none shadow-sm"
            >
              {[2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenEditDates}
            className="px-3.5 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs sm:text-sm rounded-xl border border-brand-200 transition-all flex items-center gap-1.5 shadow-sm"
            title="Chỉnh sửa ngày học cho từng buổi trong 8 buổi"
          >
            <span>🗓️</span> Sửa Ngày 8 Buổi
          </button>

          <button
            onClick={handleDirectSyncWithSchedule}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs sm:text-sm rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 shadow-sm"
            title="Tự động điền ngày 8 buổi học theo lịch học của lớp"
          >
            <span>🔄</span> Theo Lịch Học
          </button>

          <button
            onClick={handleSaveReport}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span>💾</span> {saveSuccessMsg ? '✓ Đã Lưu Báo Cáo!' : 'Lưu Báo Cáo'}
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span>📊</span> Xuất Excel
          </button>

          <button
            onClick={handleExportImage}
            disabled={isExportingImage}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>📸</span> {isExportingImage ? 'Đang xuất ảnh...' : 'Xuất Ảnh Báo Cáo (Gửi Zalo)'}
          </button>
        </div>
      </div>

      {/* Main Report Container to be exported as Image */}
      <div
        ref={reportRef}
        className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 overflow-x-auto min-w-[1100px]"
      >
        {/* Report Top Header (Identical to image) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 relative">
          {/* Logo & Center Badge */}
          <div className="flex items-center gap-3 w-1/4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-2xl shadow-sm">
              👩‍🏫
            </div>
            <div>
              <h3 className="font-black text-sm text-brand-900 leading-tight font-display">
                {centerName}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                English with Heart
              </p>
              <button
                onClick={() => {
                  const newName = prompt('Nhập tên lớp học / thương hiệu:', centerName);
                  if (newName && newName.trim()) setCenterName(newName.trim());
                }}
                className="text-[10px] text-brand-600 hover:underline font-bold"
              >
                ✏️ Đổi tên
              </button>
            </div>
          </div>

          {/* Main Title Center */}
          <div className="text-center flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-blue-900 tracking-tight uppercase font-display mb-2">
              BÁO CÁO KẾT QUẢ HỌC TẬP THÁNG {selectedMonth}
            </h1>
            <div className="flex items-center justify-center gap-3">
              <span className="px-4 py-1 rounded-full bg-brand-700 text-white font-black text-xs uppercase tracking-wider shadow-sm">
                ★ {centerName} ★
              </span>
              <span className="px-4 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs uppercase tracking-wider shadow-sm">
                {currentClass ? currentClass.name : 'LỚP HỌC'}
              </span>
            </div>
          </div>

          {/* Right Trophy / Graduation Cap Decoration */}
          <div className="w-1/4 flex justify-end items-center gap-2">
            <div className="text-right">
              <span className="text-3xl">🎓</span>
              <span className="text-3xl">🏆</span>
            </div>
          </div>
        </div>

        {/* Horizontal Scroll Controls & Helper Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 border border-slate-200 rounded-2xl text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">📅</span>
            <div>
              <span className="font-bold text-slate-800">
                Báo cáo tháng: <span className="text-blue-700 font-black">8 buổi học</span>
              </span>
              <span className="text-slate-500 text-[11px] ml-1.5 hidden lg:inline">
                (Tự động theo lịch học & cô có thể bấm nút ✏️ để sửa ngày bất kỳ lúc nào)
              </span>
            </div>
          </div>

          {/* Quick Jump & Edit Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenEditDates}
              className="px-2.5 py-1 bg-brand-100 hover:bg-brand-200 text-brand-800 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1"
            >
              <span>✏️</span> Sửa ngày 8 buổi
            </button>
            <button
              type="button"
              onClick={() => scrollToDay(1)}
              className="px-2.5 py-1 bg-blue-100/80 hover:bg-blue-200 text-blue-800 rounded-lg font-bold text-[11px] transition-all"
            >
              Buổi 1-4
            </button>
            <button
              type="button"
              onClick={() => scrollToDay(5)}
              className="px-2.5 py-1 bg-purple-100/80 hover:bg-purple-200 text-purple-800 rounded-lg font-bold text-[11px] transition-all"
            >
              Buổi 5-8
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={scrollToStart}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95"
              title="Về buổi đầu tiên"
            >
              ⏮️ Buổi 1
            </button>
            <button
              type="button"
              onClick={() => scrollTable(-350)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1"
              title="Cuộn sang trái"
            >
              <span>◀️</span> Trái
            </button>
            <button
              type="button"
              onClick={() => scrollTable(350)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1"
              title="Cuộn sang phải"
            >
              Phải <span>▶️</span>
            </button>
            <button
              type="button"
              onClick={scrollToEnd}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95"
              title="Đến buổi cuối cùng"
            >
              Buổi 8 ⏭️
            </button>
          </div>
        </div>

        {/* Search & Filter students in month */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="Tìm học sinh theo tên hoặc E.Name trong tháng..."
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:border-brand-500 outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Lọc danh sách:</span>
            <button
              type="button"
              onClick={() => setStudentFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                studentFilter === 'ALL'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Tất cả ({studentScores.length})
            </button>
            <button
              type="button"
              onClick={() => setStudentFilter('NO_BTVN')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 ${
                studentFilter === 'NO_BTVN'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              <span>⚠️</span> Chưa làm BTVN
            </button>
            <button
              type="button"
              onClick={() => setStudentFilter('EXCELLENT')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 ${
                studentFilter === 'EXCELLENT'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span>⭐</span> Điểm cao (≥ 8.0)
            </button>
          </div>
        </div>

        {/* Matrix Table with Sticky Columns and Horizontal Scroll */}
        <div
          ref={tableScrollRef}
          className="border-2 border-slate-300 rounded-2xl overflow-x-auto overflow-y-visible shadow-sm bg-white relative max-w-full"
          style={{ scrollbarWidth: 'thin' }}
        >
          <table className="border-collapse text-center text-xs min-w-full">
            {/* Header Row 1: Class & Sessions */}
            <thead>
              <tr className="border-b border-slate-300 font-black text-xs">
                {/* Class Column Header (Sticky Left) */}
                <th
                  rowSpan={2}
                  className="sticky left-0 z-30 bg-emerald-200 border-r border-slate-300 py-2 px-2 text-emerald-900 w-[50px] min-w-[50px]"
                >
                  {currentClass ? currentClass.name : 'LỚP'}
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-[50px] z-30 bg-slate-100 border-r border-slate-300 py-2 px-3 text-slate-800 text-left w-[160px] min-w-[160px]"
                >
                  HỌ VÀ TÊN
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-[210px] z-30 bg-slate-100 border-r-2 border-slate-400 py-2 px-2 text-slate-800 w-[95px] min-w-[95px] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.1)]"
                >
                  E.NAME
                </th>

                {/* Session Columns (8 Sessions) */}
                {sessions.map((s, sIdx) => {
                  const palette = SESSION_PALETTES[sIdx % SESSION_PALETTES.length];
                  return (
                    <th
                      key={s.id}
                      colSpan={s.columns.length}
                      className={`${palette.bgHeader} border-r border-slate-300 py-2 px-2 group relative whitespace-nowrap`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-black">{s.name}</span>
                        <span className="text-[10px] opacity-90 font-bold">({s.date})</span>
                        <button
                          type="button"
                          onClick={() => handleOpenSingleDateEdit(s)}
                          title="Sửa ngày buổi học này"
                          className="opacity-70 group-hover:opacity-100 text-blue-800 hover:text-blue-950 text-xs font-bold transition-opacity ml-1 bg-white/60 hover:bg-white px-1.5 py-0.5 rounded shadow-xs"
                        >
                          ✏️
                        </button>
                      </div>
                    </th>
                  );
                })}

                {/* Final Column: ĐIỂM TB (Sticky Right) */}
                <th
                  rowSpan={2}
                  className="sticky right-0 z-30 bg-yellow-200 border-l-2 border-slate-400 py-2 px-3 text-amber-900 font-black w-[85px] min-w-[85px] shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]"
                >
                  ĐIỂM TB
                </th>
              </tr>

              {/* Header Row 2: Sub-columns under each session */}
              <tr className="border-b-2 border-slate-300 text-[10px] font-bold text-slate-700 bg-slate-50">
                {sessions.map((s, sIdx) => {
                  const palette = SESSION_PALETTES[sIdx % SESSION_PALETTES.length];
                  return s.columns.map((col, cIdx) => (
                    <th
                      key={`${s.id}_${col.key}`}
                      className={`py-1.5 px-1.5 border-r border-slate-300 ${palette.light} text-center font-bold whitespace-nowrap`}
                      style={{ minWidth: col.key === 'online' ? '65px' : '55px' }}
                    >
                      {col.label}
                    </th>
                  ));
                })}
              </tr>
            </thead>

            {/* Table Body: Student Rows */}
            <tbody className="divide-y divide-slate-200">
              {displayedStudentScores.length === 0 ? (
                <tr>
                  <td colSpan={sessions.reduce((acc, s) => acc + s.columns.length, 0) + 4} className="py-8 text-center text-slate-400 font-medium">
                    {studentScores.length === 0
                      ? 'Chưa có học sinh nào trong lớp. Vui lòng vào tab "Quản Lý Học Sinh" để thêm học sinh.'
                      : 'Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.'}
                  </td>
                </tr>
              ) : (
                displayedStudentScores.map((std, sIdx) => (
                  <tr key={std.studentId} className="hover:bg-blue-50/30 transition-colors">
                    {/* STT (Sticky Left) */}
                    <td className="sticky left-0 z-20 bg-white py-2 px-2 border-r border-slate-200 font-bold text-slate-400 text-[11px] w-[50px] min-w-[50px]">
                      {String(sIdx + 1).padStart(2, '0')}
                    </td>
                    {/* Họ và Tên (Sticky Left) */}
                    <td className="sticky left-[50px] z-20 bg-white py-2 px-3 border-r border-slate-200 font-black text-slate-800 text-left text-xs whitespace-nowrap w-[160px] min-w-[160px]">
                      {std.studentName}
                    </td>
                    {/* E.NAME (Sticky Left) */}
                    <td className="sticky left-[210px] z-20 bg-white py-2 px-2 border-r-2 border-slate-400 font-bold text-emerald-800 text-xs w-[95px] min-w-[95px] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                      {std.englishName || <span className="text-slate-300">—</span>}
                    </td>

                    {/* Scores per session columns */}
                    {sessions.map((s, sessIdx) => {
                      const palette = SESSION_PALETTES[sessIdx % SESSION_PALETTES.length];
                      return s.columns.map(col => {
                        const val = std.scores?.[s.id]?.[col.key];
                        const displayVal = val !== undefined && val !== '' ? (typeof val === 'number' ? String(val).replace('.', ',') : String(val)) : '';
                        const isAbsent = displayVal.toLowerCase() === 'x';
                        const isZero = displayVal === '0';

                        return (
                          <td
                            key={`${std.studentId}_${s.id}_${col.key}`}
                            className={`p-0 border-r border-slate-200 ${palette.light}`}
                          >
                            <input
                              type="text"
                              value={displayVal}
                              onChange={e => handleScoreChange(std.studentId, s.id, col.key, e.target.value)}
                              placeholder="-"
                              className={`w-full h-8 text-center font-bold text-xs bg-transparent outline-none focus:bg-yellow-100 transition-colors ${
                                isAbsent ? 'text-rose-500 font-black' : isZero ? 'text-slate-400' : 'text-slate-800'
                              }`}
                            />
                          </td>
                        );
                      });
                    })}

                    {/* ĐIỂM TB Column (Sticky Right) */}
                    <td className="sticky right-0 z-20 bg-amber-50 py-2 px-2 border-l-2 border-slate-400 font-black text-xs text-blue-900 w-[85px] min-w-[85px] shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                      {std.averageScore > 0 ? (
                        <span className={`inline-block px-2 py-0.5 rounded-lg ${
                          std.averageScore >= 9.0 ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' :
                          std.averageScore >= 8.0 ? 'bg-emerald-100 text-emerald-900' :
                          'text-slate-800'
                        }`}>
                          {std.averageScore.toFixed(2).replace('.', ',')}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Section: Podium Ranking (Left) & Other Students (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
          {/* Left Column (5/12): BẢNG XẾP HẠNG HỌC SINH XUẤT SẮC */}
          <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Header Bar */}
            <div className="bg-blue-900 text-white text-center py-2.5 px-4 font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2">
              <span>★</span>
              <span>BẢNG XẾP HẠNG HỌC SINH XUẤT SẮC</span>
              <span>★</span>
            </div>

            {/* Podium (Top 1, 2, 3) */}
            <div className="p-4 grid grid-cols-3 gap-3 flex-1 items-end">
              {/* Hạng 1 (Center or Left depending on layout, here Top 1 in yellow card) */}
              <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-3 text-center flex flex-col items-center justify-between min-h-[190px] shadow-sm">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-white font-black text-xl shadow-md border-2 border-white mb-2 relative">
                  1
                  <span className="absolute -bottom-2 text-xs">🎗️</span>
                </div>
                {top1 ? (
                  <>
                    <h4 className="font-black text-xs text-slate-900 leading-tight line-clamp-2">
                      {top1.studentName}
                    </h4>
                    <p className="text-[11px] font-bold text-amber-800 mt-0.5">
                      {top1.englishName || '—'}
                    </p>
                    <div className="mt-2 text-xl font-black text-rose-600 font-display">
                      {top1.averageScore.toFixed(2).replace('.', ',')}
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-slate-300 italic">Chưa có dữ liệu</span>
                )}
              </div>

              {/* Hạng 2 (Silver) */}
              <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-3 text-center flex flex-col items-center justify-between min-h-[170px] shadow-sm">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 flex items-center justify-center text-white font-black text-lg shadow-md border-2 border-white mb-2 relative">
                  2
                  <span className="absolute -bottom-2 text-xs">🎗️</span>
                </div>
                {top2 ? (
                  <>
                    <h4 className="font-black text-xs text-slate-900 leading-tight line-clamp-2">
                      {top2.studentName}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                      {top2.englishName || '—'}
                    </p>
                    <div className="mt-2 text-lg font-black text-rose-600 font-display">
                      {top2.averageScore.toFixed(2).replace('.', ',')}
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-slate-300 italic">Chưa có dữ liệu</span>
                )}
              </div>

              {/* Hạng 3 (Bronze) */}
              <div className="bg-orange-50/60 border-2 border-orange-300 rounded-2xl p-3 text-center flex flex-col items-center justify-between min-h-[155px] shadow-sm">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center text-white font-black text-base shadow-md border-2 border-white mb-2 relative">
                  3
                  <span className="absolute -bottom-2 text-xs">🎗️</span>
                </div>
                {top3 ? (
                  <>
                    <h4 className="font-black text-xs text-slate-900 leading-tight line-clamp-2">
                      {top3.studentName}
                    </h4>
                    <p className="text-[11px] font-bold text-amber-900 mt-0.5">
                      {top3.englishName || '—'}
                    </p>
                    <div className="mt-2 text-lg font-black text-rose-600 font-display">
                      {top3.averageScore.toFixed(2).replace('.', ',')}
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-slate-300 italic">Chưa có dữ liệu</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (7/12): DANH SÁCH HỌC VIÊN KHÁC */}
          <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Header Bar */}
            <div className="bg-blue-900 text-white text-center py-2.5 px-4 font-black text-sm tracking-wider uppercase">
              DANH SÁCH HỌC VIÊN KHÁC
            </div>

            {/* 2-Column List of Other Students */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 flex-1 overflow-y-auto max-h-[220px]">
              {otherStudents.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-xs text-slate-400 italic">
                  Chưa có thêm học viên nào khác có điểm trong danh sách.
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {otherCol1.map(std => (
                      <div
                        key={std.studentId}
                        className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 border-b border-slate-100 text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-black text-slate-800">{std.studentName}</span>{' '}
                          {std.englishName && (
                            <span className="text-[11px] text-slate-500 font-bold">({std.englishName})</span>
                          )}
                        </div>
                        <span className="font-black text-blue-900 shrink-0 font-mono">
                          {std.averageScore.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    {otherCol2.map(std => (
                      <div
                        key={std.studentId}
                        className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 border-b border-slate-100 text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-black text-slate-800">{std.studentName}</span>{' '}
                          {std.englishName && (
                            <span className="text-[11px] text-slate-500 font-bold">({std.englishName})</span>
                          )}
                        </div>
                        <span className="font-black text-blue-900 shrink-0 font-mono">
                          {std.averageScore.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Legend (Exact match to sample image) */}
        <div className="pt-3 border-t-2 border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-600">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className="text-blue-600 text-base">▶️</span>
              <span>Video BTVN: 0 - 10 điểm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-600 text-base">📖</span>
              <span>BTVN: 0 - 10 điểm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 text-base">📝</span>
              <span>Kiểm tra bài cũ: 0 - 10 điểm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-500 text-base">🏆</span>
              <span>Điểm thi đua trên lớp: 0 - 10 điểm</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-blue-900 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200">
            <span>⭐</span>
            <span className="font-black">Điểm TB tính từ các ô điểm có dữ liệu • Làm tròn 2 chữ số thập phân</span>
          </div>
        </div>
      </div>

      {/* Modal: Chỉnh Sửa Ngày Cho 8 Buổi Học */}
      {showEditDatesModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-brand-900">🗓️ Chỉnh Sửa Ngày Cho 8 Buổi Học</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tháng {selectedMonth}/{selectedYear} • Lớp {currentClass?.name || ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditDatesModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-2xl border border-blue-100">
              <span className="text-xs text-blue-900 font-bold">Lấy ngày tự động theo lịch của lớp:</span>
              <button
                type="button"
                onClick={() => {
                  const sched = generate8SessionsFromSchedule(selectedClassId, selectedMonth, selectedYear);
                  setTempDates(sched.map(s => ({ id: s.id, name: s.name, date: s.date })));
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all"
              >
                🔄 Đặt Lại Theo Lịch
              </button>
            </div>

            {/* List 8 sessions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tempDates.map((item, idx) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-brand-900">{item.name}</label>
                    <span className="text-[10px] text-slate-400 font-bold font-mono">{item.date}</span>
                  </div>
                  <div className="space-y-1">
                    <input
                      type="date"
                      value={convertDMYtoYMD(item.date)}
                      onChange={e => {
                        const newD = convertYMDtoDMY(e.target.value);
                        setTempDates(tempDates.map((t, i) => (i === idx ? { ...t, date: newD } : t)));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 outline-none focus:border-brand-500"
                    />
                    <input
                      type="text"
                      value={item.date}
                      onChange={e => {
                        const val = e.target.value;
                        setTempDates(tempDates.map((t, i) => (i === idx ? { ...t, date: val } : t)));
                      }}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-100 text-[11px] font-medium bg-white text-slate-600 outline-none focus:border-brand-400"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditDatesModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEditDates}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-xl text-sm shadow-md transition-all"
              >
                💾 Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sửa Ngày Cho 1 Buổi Học Riêng Lẻ */}
      {editingSingleSession && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-brand-900">
                ✏️ Đổi Ngày Học: {editingSingleSession.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSingleSession(null)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Chọn từ lịch:</label>
                <input
                  type="date"
                  value={convertDMYtoYMD(singleDateInput)}
                  onChange={e => setSingleDateInput(convertYMDtoDMY(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white text-slate-800 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Hoặc nhập ngày (DD/MM/YYYY):</label>
                <input
                  type="text"
                  value={singleDateInput}
                  onChange={e => setSingleDateInput(e.target.value)}
                  placeholder="VD: 15/08/2026"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white text-slate-800 outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSingleSession(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveSingleDate}
                className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm shadow-md"
              >
                💾 Cập Nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
