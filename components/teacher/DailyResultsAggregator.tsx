import React, { useState, useEffect } from 'react';
import { Submission, DailySummary, Student } from '../../types';
import {
  getClasses,
  getStudents,
  getAssignments,
  getDailySummary,
  getTodayString,
  subscribeToSync
} from '../../services/assignmentService';

interface StudentResultItem {
  id: string;
  studentId?: string;
  studentName: string;
  englishName?: string;
  className: string;
  phone?: string;
  hasSubmitted: boolean;
  submission?: Submission;
}

export const DailyResultsAggregator: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('ALL');
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [classes, setClasses] = useState(getClasses());
  const [assignments, setAssignments] = useState(getAssignments());
  const [searchStudent, setSearchStudent] = useState('');
  const [viewDetailSubmission, setViewDetailSubmission] = useState<Submission | null>(null);

  // Filter & Zalo states
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<'ALL' | 'NOT_DONE' | 'DONE'>('ALL');
  const [copiedZaloMsg, setCopiedZaloMsg] = useState(false);

  const refresh = () => {
    setClasses(getClasses());
    setAssignments(getAssignments());
    const data = getDailySummary(selectedDate, selectedClassId, selectedAssignmentId);
    setSummary(data);
  };

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToSync(() => {
      refresh();
    });
    return () => unsubscribe();
  }, [selectedDate, selectedClassId, selectedAssignmentId]);

  const setDateOffset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  // Selected class students (or all students if ALL classes)
  const targetClassObj = classes.find(c => c.name === selectedClassId || c.id === selectedClassId);
  const classStudents = getStudents(targetClassObj?.id || (selectedClassId !== 'ALL' ? selectedClassId : undefined));

  // Build unified roster
  const rosterItems: StudentResultItem[] = [];
  const matchedSubIds = new Set<string>();

  classStudents.forEach(std => {
    const sub = (summary?.submissions || []).find(s =>
      !matchedSubIds.has(s.id) &&
      (s.studentId === std.id || s.studentName.trim().toLowerCase() === std.name.trim().toLowerCase())
    );
    if (sub) {
      matchedSubIds.add(sub.id);
      rosterItems.push({
        id: `std_sub_${std.id}_${sub.id}`,
        studentId: std.id,
        studentName: std.name,
        englishName: std.englishName,
        className: std.className || sub.studentClass,
        phone: std.phone,
        hasSubmitted: true,
        submission: sub
      });
    } else {
      rosterItems.push({
        id: `std_nosub_${std.id}`,
        studentId: std.id,
        studentName: std.name,
        englishName: std.englishName,
        className: std.className,
        phone: std.phone,
        hasSubmitted: false
      });
    }
  });

  // Any remaining submissions not matched to a known student
  (summary?.submissions || []).forEach(sub => {
    if (!matchedSubIds.has(sub.id)) {
      rosterItems.push({
        id: `sub_only_${sub.id}`,
        studentId: sub.studentId,
        studentName: sub.studentName,
        className: sub.studentClass,
        hasSubmitted: true,
        submission: sub
      });
    }
  });

  const notDoneList = rosterItems.filter(item => !item.hasSubmitted);
  const doneList = rosterItems.filter(item => item.hasSubmitted);

  const filteredRoster = rosterItems.filter(item => {
    const matchSearch =
      item.studentName.toLowerCase().includes(searchStudent.toLowerCase()) ||
      item.className.toLowerCase().includes(searchStudent.toLowerCase()) ||
      (item.englishName && item.englishName.toLowerCase().includes(searchStudent.toLowerCase()));
    if (!matchSearch) return false;

    if (submissionStatusFilter === 'NOT_DONE') return !item.hasSubmitted;
    if (submissionStatusFilter === 'DONE') return item.hasSubmitted;
    return true;
  });

  // Copy Zalo list for not done
  const handleCopyNotDoneZalo = () => {
    if (notDoneList.length === 0) {
      alert('Tuyệt vời! Tất cả học sinh đã nộp bài tập.');
      return;
    }
    const className = targetClassObj ? targetClassObj.name : (selectedClassId !== 'ALL' ? selectedClassId : 'các lớp');
    const assignObj = assignments.find(a => a.id === selectedAssignmentId);
    const assignTitle = assignObj ? (assignObj.title || assignObj.topic) : 'Bài tập tiếng Anh';

    let text = `📢 THÔNG BÁO NHẮC NHỞ NỘP BÀI TẬP\n`;
    text += `🏫 Lớp: ${className}\n`;
    text += `📝 Bài tập: ${assignTitle}\n`;
    text += `📅 Ngày: ${selectedDate === 'ALL' ? 'Tất cả các ngày' : selectedDate}\n\n`;
    text += `Danh sách các bạn chưa nộp bài (${notDoneList.length} bạn):\n`;
    notDoneList.forEach((item, idx) => {
      text += `${idx + 1}. ${item.studentName} ${item.englishName ? `(${item.englishName})` : ''}\n`;
    });
    text += `\nKính nhờ quý phụ huynh nhắc nhở các con vào làm bài và nộp bài giúp cô nhé! Cô cảm ơn quý phụ huynh! ❤️`;

    navigator.clipboard.writeText(text);
    setCopiedZaloMsg(true);
    setTimeout(() => setCopiedZaloMsg(false), 3000);
  };

  const handleCopyIndividualReminder = (item: StudentResultItem) => {
    const assignObj = assignments.find(a => a.id === selectedAssignmentId);
    const assignTitle = assignObj ? (assignObj.title || assignObj.topic) : 'Bài tập tiếng Anh';
    let text = `Dạ cô Dung xin gửi lời chào đến phụ huynh em ${item.studentName}${item.englishName ? ` (${item.englishName})` : ''} ạ!\n`;
    text += `Hiện tại con chưa hoàn thành bài tập "${assignTitle}". Nhờ phụ huynh nhắc con mở app làm bài và nộp bài sớm giúp cô nhé! Cô cảm ơn phụ huynh nhiều ạ! ❤️`;
    navigator.clipboard.writeText(text);
    alert(`Đã copy tin nhắn nhắc nhở cho phụ huynh em ${item.studentName}!`);
  };

  const exportCSV = () => {
    if (filteredRoster.length === 0) {
      alert('Chưa có dữ liệu danh sách để xuất file.');
      return;
    }

    const headers = ['STT', 'Họ Tên Học Sinh', 'E.NAME', 'Lớp', 'Trạng Thái', 'Bài Tập', 'Thời Gian Nộp', 'Điểm Số (/10)', 'Số Câu Đúng (/50)', 'Xếp Loại'];
    const rows = filteredRoster.map((item, idx) => {
      const s = item.submission;
      if (s) {
        return [
          idx + 1,
          `"${item.studentName}"`,
          `"${item.englishName || ''}"`,
          `"${item.className}"`,
          '"Đã nộp bài"',
          `"${s.assignmentTitle || s.topic}"`,
          `"${new Date(s.submittedAt).toLocaleString('vi-VN')}"`,
          s.score.toFixed(1),
          `${s.totalCorrect}/${s.totalQuestions}`,
          `"${s.evaluation.text}"`
        ];
      }
      return [
        idx + 1,
        `"${item.studentName}"`,
        `"${item.englishName || ''}"`,
        `"${item.className}"`,
        '"Chưa nộp bài"',
        `"${selectedAssignmentId !== 'ALL' ? (assignments.find(a => a.id === selectedAssignmentId)?.title || 'Bài tập') : 'Chưa nộp'}"`,
        '"—"',
        '"—"',
        '"—"',
        '"Chưa làm bài"'
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ket_Qua_Hoc_Tap_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Filters Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-brand-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📊</span>
              <h2 className="text-xl sm:text-2xl font-black text-brand-900">Tổng Hợp Kết Quả Học Tập Theo Ngày</h2>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Theo dõi số bài nộp, điểm số trung bình và chi tiết kết quả của từng học sinh.
            </p>
          </div>

          <button
            onClick={exportCSV}
            disabled={!summary || summary.submissions.length === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
          >
            <span>📥</span> Xuất File Báo Cáo (CSV/Excel)
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">📅 Ngày nộp bài</label>
            <input
              type="date"
              value={selectedDate === 'ALL' ? '' : selectedDate}
              onChange={e => setSelectedDate(e.target.value || 'ALL')}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:border-brand-500 outline-none bg-slate-50"
            />
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={() => setDateOffset(0)}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg ${selectedDate === getTodayString() ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => setDateOffset(-1)}
                className="flex-1 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                Hôm qua
              </button>
              <button
                onClick={() => setSelectedDate('ALL')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg ${selectedDate === 'ALL' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Tất cả
              </button>
            </div>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">🏫 Chọn Lớp Học</label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:border-brand-500 outline-none bg-slate-50"
            >
              <option value="ALL">-- Tất cả các lớp --</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Assignment Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">📝 Chọn Bài Tập</label>
            <select
              value={selectedAssignmentId}
              onChange={e => setSelectedAssignmentId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:border-brand-500 outline-none bg-slate-50"
            >
              <option value="ALL">-- Tất cả bài tập --</option>
              {assignments.map(a => (
                <option key={a.id} value={a.id}>{a.title} ({a.assignedDate})</option>
              ))}
            </select>
          </div>

          {/* Search student */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">🔍 Tìm học sinh</label>
            <input
              type="text"
              value={searchStudent}
              onChange={e => setSearchStudent(e.target.value)}
              placeholder="Nhập tên học sinh..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-brand-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-2xl shrink-0">
              📝
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-brand-900">{summary.totalSubmitted}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số bài đã nộp</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-brand-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shrink-0">
              📈
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-blue-600">
                {summary.totalSubmitted > 0 ? summary.averageScore.toFixed(1) : '—'}
                <span className="text-xs font-normal text-slate-400">/10</span>
              </p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Điểm trung bình</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-brand-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl shrink-0">
              🏆
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-amber-500">
                {summary.totalSubmitted > 0 ? summary.highestScore.toFixed(1) : '—'}
                <span className="text-xs font-normal text-slate-400">/10</span>
              </p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Điểm cao nhất</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-brand-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shrink-0">
              🎯
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600">{summary.submissionRate}%</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỉ lệ hoàn thành</p>
            </div>
          </div>
        </div>
      )}

      {/* Submissions & Roster Table */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-brand-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h3 className="text-base font-black text-brand-900 uppercase tracking-tight">
              DANH SÁCH THEO LỚP: {selectedClassId === 'ALL' ? 'Tất Cả Các Lớp' : selectedClassId} ({filteredRoster.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSubmissionStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  submissionStatusFilter === 'ALL'
                    ? 'bg-white text-brand-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({rosterItems.length})
              </button>
              <button
                type="button"
                onClick={() => setSubmissionStatusFilter('NOT_DONE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  submissionStatusFilter === 'NOT_DONE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <span>⚠️ Chưa làm bài</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  submissionStatusFilter === 'NOT_DONE' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-900'
                }`}>
                  {notDoneList.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSubmissionStatusFilter('DONE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  submissionStatusFilter === 'DONE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span>✅ Đã nộp</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  submissionStatusFilter === 'DONE' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {doneList.length}
                </span>
              </button>
            </div>

            {/* Quick Copy Zalo Button */}
            {notDoneList.length > 0 && (
              <button
                type="button"
                onClick={handleCopyNotDoneZalo}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                title="Sao chép danh sách các bạn chưa làm để dán gửi Zalo phụ huynh"
              >
                <span>📋</span>
                <span>{copiedZaloMsg ? '✓ Đã Copy Danh Sách!' : 'Copy DS Chưa Nộp (Zalo)'}</span>
              </button>
            )}
          </div>
        </div>

        {filteredRoster.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <div className="text-4xl mb-2">
              {submissionStatusFilter === 'NOT_DONE' ? '🎉' : '📭'}
            </div>
            <p className="font-bold text-base">
              {submissionStatusFilter === 'NOT_DONE'
                ? 'Tuyệt vời! Tất cả học sinh trong bộ lọc đã nộp bài đầy đủ!'
                : 'Chưa có dữ liệu nào phù hợp với bộ lọc đã chọn'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {submissionStatusFilter !== 'ALL' ? (
                <button
                  onClick={() => setSubmissionStatusFilter('ALL')}
                  className="text-brand-600 hover:underline font-bold"
                >
                  Bấm vào đây để xem tất cả học sinh
                </button>
              ) : (
                'Khi học sinh làm bài xong và nộp, kết quả sẽ xuất hiện tự động tại đây!'
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-3">STT</th>
                  <th className="py-3 px-3">Học Sinh</th>
                  <th className="py-3 px-3">E.NAME</th>
                  <th className="py-3 px-3">Lớp</th>
                  <th className="py-3 px-3">Trạng Thái</th>
                  <th className="py-3 px-3">Thời Gian Nộp</th>
                  <th className="py-3 px-3 text-center">Số Câu Đúng</th>
                  <th className="py-3 px-3 text-center">Điểm Số</th>
                  <th className="py-3 px-3 text-center">Đánh Giá</th>
                  <th className="py-3 px-3 text-right">Chi Tiết / Nhắc Nhở</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.map((item, idx) => {
                  const s = item.submission;
                  const isHigh = s ? s.score >= 8.5 : false;
                  const isExemplary = s ? s.score >= 9.0 : false;
                  return (
                    <tr
                      key={item.id || idx}
                      className={`transition-colors ${
                        !item.hasSubmitted
                          ? 'bg-rose-50/20 hover:bg-rose-50/40'
                          : isExemplary
                          ? 'bg-amber-50/40 hover:bg-amber-50/70 font-semibold'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-3 text-xs text-slate-400 font-bold">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          {isExemplary && <span title="Điểm xuất sắc">⭐</span>}
                          <span className={`font-black text-sm ${isExemplary ? 'text-amber-950' : 'text-slate-800'}`}>
                            {item.studentName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-xs font-bold text-emerald-800">
                        {item.englishName || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold">
                          {item.className}
                        </span>
                      </td>
                      {/* Trạng Thái */}
                      <td className="py-3.5 px-3">
                        {item.hasSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                            <span>✅</span> Đã nộp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs">
                            <span>⚠️</span> Chưa làm
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-500">
                        {s ? (
                          <>
                            {new Date(s.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(s.submittedAt).toLocaleDateString('vi-VN')}
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center text-xs font-bold text-slate-600">
                        {s ? `${s.totalCorrect}/${s.totalQuestions}` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {s ? (
                          <span className={`inline-block px-3 py-1 rounded-full font-black text-sm ${
                            isExemplary
                              ? 'bg-amber-400 text-amber-950 shadow-sm'
                              : isHigh
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.score >= 5
                              ? 'bg-blue-50 text-blue-800'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {s.score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {s ? (
                          <span className="text-xs font-bold text-slate-700">
                            {s.evaluation.emoji} {s.evaluation.text}
                          </span>
                        ) : (
                          <span className="text-xs text-rose-500 font-bold">Chưa có điểm</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {s ? (
                          <button
                            onClick={() => setViewDetailSubmission(s)}
                            className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                          >
                            👁️ Xem bài
                          </button>
                        ) : item.phone ? (
                          <button
                            onClick={() => handleCopyIndividualReminder(item)}
                            className="px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-all shadow-2xs"
                            title={`Nhắc phụ huynh em ${item.studentName}`}
                          >
                            📱 Nhắc Zalo
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission Detail Modal */}
      {viewDetailSubmission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-brand-900">Chi Tiết Bài Nộp: {viewDetailSubmission.studentName}</h3>
                <p className="text-xs text-slate-500 font-bold">{viewDetailSubmission.studentClass} • {viewDetailSubmission.assignmentTitle || viewDetailSubmission.topic}</p>
              </div>
              <button onClick={() => setViewDetailSubmission(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-1">
              {/* Score header */}
              <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-2xl p-4 text-center">
                <p className="text-4xl font-black">{viewDetailSubmission.score.toFixed(1)} / 10</p>
                <p className="text-sm font-bold text-brand-100 mt-1">{viewDetailSubmission.evaluation.emoji} {viewDetailSubmission.evaluation.text}</p>
                <p className="text-xs text-brand-200 mt-1 italic">"{viewDetailSubmission.evaluation.praise}"</p>
              </div>

              {/* Skills Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Chi tiết điểm từng dạng bài:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="font-bold text-slate-600">Trắc nghiệm:</span>
                    <span className="font-black text-brand-700">{viewDetailSubmission.skillScores?.mc ?? '—'} đúng</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="font-bold text-slate-600">Sắp xếp câu:</span>
                    <span className="font-black text-brand-700">{viewDetailSubmission.skillScores?.scramble ?? '—'} đúng</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="font-bold text-slate-600">Điền từ:</span>
                    <span className="font-black text-brand-700">{viewDetailSubmission.skillScores?.fill ?? '—'} đúng</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="font-bold text-slate-600">Dịch từ vựng:</span>
                    <span className="font-black text-brand-700">{viewDetailSubmission.skillScores?.vocab ?? '—'} đúng</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="font-bold text-slate-600">Đúng/Sai:</span>
                    <span className="font-black text-brand-700">{viewDetailSubmission.skillScores?.tf ?? '—'} đúng</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                    <span className="font-bold text-slate-600">Luyện nghe:</span>
                    <span className="font-black text-brand-700">{viewDetailSubmission.skillScores?.listen ?? '—'} đúng</span>
                  </div>
                </div>
              </div>

              {/* Submission info */}
              <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl">
                <p><strong>Thời gian nộp:</strong> {new Date(viewDetailSubmission.submittedAt).toLocaleString('vi-VN')}</p>
                <p><strong>Tổng số câu đúng:</strong> {viewDetailSubmission.totalCorrect} trên {viewDetailSubmission.totalQuestions} câu</p>
              </div>
            </div>

            <button
              onClick={() => setViewDetailSubmission(null)}
              className="w-full py-2.5 bg-brand-500 text-white font-bold rounded-xl text-sm hover:bg-brand-600"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
