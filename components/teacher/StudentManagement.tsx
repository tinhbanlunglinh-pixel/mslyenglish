import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ClassRoom, Student, Assignment, Submission } from '../../types';
import {
  getClasses,
  getStudents,
  addClass,
  updateClass,
  deleteClass,
  addStudent,
  batchAddStudentsWithDetails,
  updateStudent,
  deleteStudent,
  subscribeToSync,
  clearAllDemoData,
  getAssignments,
  getSubmissions
} from '../../services/assignmentService';

export const StudentManagement: React.FC = () => {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Class modals state
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState(6);
  const [newClassDesc, setNewClassDesc] = useState('');

  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);

  // Student single add state
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEnglishName, setNewStudentEnglishName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentNote, setNewStudentNote] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('123');

  // Student batch paste state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchNamesText, setBatchNamesText] = useState('');

  // Excel import state
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelPreviewList, setExcelPreviewList] = useState<Array<{ name: string; englishName: string; phone: string; notes: string; password?: string }>>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit student state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Loading state for reset
  const [isResetting, setIsResetting] = useState(false);

  // Homework completion tracking states
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('LATEST');
  const [homeworkStatusFilter, setHomeworkStatusFilter] = useState<'ALL' | 'NOT_DONE' | 'DONE'>('ALL');
  const [copiedZaloMsg, setCopiedZaloMsg] = useState(false);

  const refresh = () => {
    const cls = getClasses();
    setClasses(cls);
    const activeClassId = selectedClassId || (cls.length > 0 ? cls[0].id : '');
    setSelectedClassId(activeClassId);
    if (activeClassId) {
      setStudents(getStudents(activeClassId));
    } else {
      setStudents([]);
    }
    setAssignments(getAssignments());
    setSubmissions(getSubmissions());
  };

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToSync(() => {
      refresh();
    });
    return () => unsubscribe();
  }, [selectedClassId]);

  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];

  // 1. Tạo lớp mới
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const created = addClass(newClassName, newClassGrade, newClassDesc);
    setNewClassName('');
    setNewClassDesc('');
    setShowAddClass(false);
    setSelectedClassId(created.id);
  };

  // 2. Sửa lớp
  const handleUpdateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editingClass.name.trim()) return;
    updateClass(editingClass.id, {
      name: editingClass.name.trim(),
      grade: editingClass.grade,
      description: (editingClass.description || '').trim()
    });
    setEditingClass(null);
    refresh();
  };

  // 3. Xóa lớp
  const handleDeleteClass = (id: string, name: string) => {
    if (confirm(`Cô có chắc chắn muốn xóa lớp "${name}" không? Toàn bộ danh sách học sinh thuộc lớp này cũng sẽ được dọn dẹp.`)) {
      deleteClass(id);
      const remaining = classes.filter(c => c.id !== id);
      setSelectedClassId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  // 4. Reset toàn bộ dữ liệu mẫu
  const handleResetData = async () => {
    const confirmed = confirm(
      '⚠️ XÁC NHẬN RESET DỮ LIỆU THẬT:\n\n' +
      'Thao tác này sẽ xóa toàn bộ danh sách lớp học, học sinh mẫu và điểm giả lập để đưa ứng dụng về trạng thái 100% dữ liệu thực tế của cô.\n\n' +
      'Cô có chắc chắn muốn thực hiện?'
    );
    if (!confirmed) return;

    setIsResetting(true);
    await clearAllDemoData();
    setIsResetting(false);
    setSelectedClassId('');
    refresh();
    alert('Đã xóa toàn bộ dữ liệu mẫu thành công! Bây giờ cô có thể bắt đầu tạo lớp và thêm học sinh thật.');
  };

  // 5. Thêm 1 học sinh
  const handleAddSingleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !currentClass) return;
    addStudent(
      newStudentName,
      currentClass.id,
      currentClass.name,
      newStudentEnglishName,
      newStudentPhone,
      newStudentNote,
      newStudentPassword
    );
    setNewStudentName('');
    setNewStudentEnglishName('');
    setNewStudentPhone('');
    setNewStudentNote('');
    setNewStudentPassword('123');
    setShowAddStudent(false);
    setStudents(getStudents(currentClass.id));
  };

  // 6. Dán danh sách hàng loạt (Hỗ trợ Tab, Phẩy, Gạch ngang)
  const handleBatchAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNamesText.trim() || !currentClass) return;

    const parsedItems: Array<{ name: string; englishName: string; phone: string; notes: string }> = [];

    const lines = batchNamesText.split('\n');
    lines.forEach(line => {
      let clean = line.trim().replace(/^[\d\.\-\)\s]+/, ''); // remove leading numbers
      if (!clean) return;

      let name = '';
      let englishName = '';
      let phone = '';

      if (clean.includes('\t')) {
        // Tab separated (direct copy from Excel)
        const parts = clean.split('\t').map(p => p.trim());
        name = parts[0] || '';
        englishName = parts[1] || '';
        phone = parts[2] || '';
      } else if (clean.includes(',')) {
        // Comma separated
        const parts = clean.split(',').map(p => p.trim());
        name = parts[0] || '';
        englishName = parts[1] || '';
        phone = parts[2] || '';
      } else if (clean.includes(' - ')) {
        // Hyphen separated
        const parts = clean.split(' - ').map(p => p.trim());
        name = parts[0] || '';
        englishName = parts[1] || '';
      } else {
        name = clean;
      }

      if (name) {
        parsedItems.push({ name, englishName, phone, notes: '' });
      }
    });

    if (parsedItems.length === 0) return;

    batchAddStudentsWithDetails(parsedItems, currentClass.id, currentClass.name);
    setBatchNamesText('');
    setShowBatchModal(false);
    setStudents(getStudents(currentClass.id));
  };

  // 7. Tải file Excel mẫu
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      { "Họ và tên": "Hoàng Sơn Tùng", "Tên tiếng Anh (E.Name)": "Arty", "Mật khẩu đăng nhập": "123", "Số điện thoại": "0987654321", "Ghi chú": "Học sinh chăm chỉ" },
      { "Họ và tên": "Nguyễn Minh Duy", "Tên tiếng Anh (E.Name)": "Batman", "Mật khẩu đăng nhập": "123", "Số điện thoại": "0912345678", "Ghi chú": "Phát âm tốt" },
      { "Họ và tên": "Trần Gia Phú", "Tên tiếng Anh (E.Name)": "Kelvin", "Mật khẩu đăng nhập": "123", "Số điện thoại": "0909888999", "Ghi chú": "Ngữ pháp vững" },
      { "Họ và tên": "Lê Tú Uyên", "Tên tiếng Anh (E.Name)": "Cherry", "Mật khẩu đăng nhập": "123", "Số điện thoại": "0933222111", "Ghi chú": "Từ vựng phong phú" },
      { "Họ và tên": "Nguyễn Ngọc Lam Phương", "Tên tiếng Anh (E.Name)": "Elsa", "Mật khẩu đăng nhập": "123", "Số điện thoại": "0977665544", "Ghi chú": "Học sinh giỏi" }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách học sinh");
    XLSX.writeFile(wb, "Danh_sach_hoc_sinh_mau.xlsx");
  };

  // 8. Đọc file Excel tải lên
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const mappedList: Array<{ name: string; englishName: string; phone: string; notes: string; password?: string }> = [];

        rawJson.forEach((row: any) => {
          // Normalize column keys
          const keys = Object.keys(row);
          let name = '';
          let englishName = '';
          let phone = '';
          let notes = '';
          let password = '123';

          keys.forEach(k => {
            const cleanKey = k.trim().toLowerCase();
            const val = String(row[k]).trim();
            if (cleanKey.includes('họ') || cleanKey.includes('tên') && !cleanKey.includes('anh') || cleanKey === 'name') {
              if (!name) name = val;
            }
            if (cleanKey.includes('e.name') || cleanKey.includes('ename') || cleanKey.includes('tiếng anh') || cleanKey.includes('english') || cleanKey.includes('nick')) {
              englishName = val;
            }
            if (cleanKey.includes('mật khẩu') || cleanKey.includes('mat khau') || cleanKey.includes('pass') || cleanKey.includes('mk')) {
              password = val;
            }
            if (cleanKey.includes('điện thoại') || cleanKey.includes('sđt') || cleanKey.includes('phone') || cleanKey.includes('tel')) {
              phone = val;
            }
            if (cleanKey.includes('ghi chú') || cleanKey.includes('note') || cleanKey.includes('nhận xét')) {
              notes = val;
            }
          });

          if (name) {
            mappedList.push({ name, englishName, phone, notes, password: password || '123' });
          }
        });

        setExcelPreviewList(mappedList);
      } catch (err) {
        alert('Không thể đọc file Excel này. Vui lòng kiểm tra lại định dạng file (.xlsx, .xls, .csv).');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 9. Xác nhận nạp danh sách từ Excel
  const handleConfirmExcelImport = () => {
    if (excelPreviewList.length === 0 || !currentClass) return;
    batchAddStudentsWithDetails(excelPreviewList, currentClass.id, currentClass.name);
    setShowExcelModal(false);
    setExcelPreviewList([]);
    setExcelFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setStudents(getStudents(currentClass.id));
    alert(`Đã thêm thành công ${excelPreviewList.length} học sinh vào ${currentClass.name}!`);
  };

  // 10. Xuất Danh Sách Tài Khoản Học Sinh (Excel)
  const handleExportStudentAccounts = () => {
    if (!currentClass || students.length === 0) {
      alert('Chưa có học sinh nào trong lớp để xuất danh sách tài khoản!');
      return;
    }
    const templateData = students.map((s, idx) => ({
      "STT": idx + 1,
      "Lớp": s.className,
      "Họ và tên": s.name,
      "Tên tiếng Anh (E.NAME)": s.englishName || '—',
      "Mật khẩu đăng nhập": s.password || '123',
      "Số điện thoại phụ huynh": s.phone || '—',
      "Ghi chú của cô": s.notes || '—'
    }));

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tài khoản học sinh");
    XLSX.writeFile(wb, `Danh_sach_tai_khoan_${currentClass.name.replace(/\s+/g, '_')}.xlsx`);
  };

  // 11. Lưu chỉnh sửa học sinh
  const handleSaveEditStudent = () => {
    if (!editingStudent || !editingStudent.name.trim()) return;
    updateStudent(editingStudent.id, {
      name: editingStudent.name.trim(),
      englishName: editingStudent.englishName?.trim() || '',
      phone: editingStudent.phone?.trim() || '',
      notes: editingStudent.notes?.trim() || '',
      password: editingStudent.password?.trim() || '123'
    });
    setEditingStudent(null);
    if (currentClass) setStudents(getStudents(currentClass.id));
  };

  // 11. Xóa học sinh
  const handleDeleteStudent = (id: string, name: string) => {
    if (confirm(`Cô có chắc chắn muốn xóa học sinh "${name}" khỏi lớp?`)) {
      deleteStudent(id);
      if (currentClass) setStudents(getStudents(currentClass.id));
    }
  };

  // Class assignments for selected class
  const classAssignments = assignments.filter(a =>
    a.targetClassId === 'ALL' ||
    a.targetClassId === currentClass?.id ||
    (currentClass && Array.isArray(a.targetClassIds) && (a.targetClassIds.includes(currentClass.id) || a.targetClassIds.includes('ALL'))) ||
    (currentClass && Array.isArray(a.targetClassNames) && a.targetClassNames.includes(currentClass.name)) ||
    (currentClass && a.targetClassName && a.targetClassName.includes(currentClass.name))
  );

  // Active assignment being inspected
  const activeAssignment = selectedAssignmentId === 'LATEST'
    ? classAssignments[0]
    : classAssignments.find(a => a.id === selectedAssignmentId);

  // Check if a student has submitted the active assignment
  const getStudentSubmission = (student: Student): Submission | undefined => {
    if (!activeAssignment) return undefined;
    return submissions.find(s =>
      s.assignmentId === activeAssignment.id &&
      (s.studentId === student.id || s.studentName.trim().toLowerCase() === student.name.trim().toLowerCase())
    );
  };

  const notDoneStudents = students.filter(s => !getStudentSubmission(s));
  const doneStudents = students.filter(s => !!getStudentSubmission(s));

  // Filtered students by search AND homework status
  const filteredStudents = students.filter(s => {
    const matchQuery =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.englishName && s.englishName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.rollNumber && s.rollNumber.includes(searchQuery)) ||
      (s.phone && s.phone.includes(searchQuery));
    if (!matchQuery) return false;

    if (homeworkStatusFilter === 'NOT_DONE') {
      return !getStudentSubmission(s);
    }
    if (homeworkStatusFilter === 'DONE') {
      return !!getStudentSubmission(s);
    }
    return true;
  });

  // Action: Copy list of students who haven't done homework to send to Zalo
  const handleCopyNotDoneZaloList = () => {
    if (!activeAssignment) {
      alert('Chưa có bài tập nào được giao cho lớp này.');
      return;
    }
    if (notDoneStudents.length === 0) {
      alert('Tuyệt vời! 100% học sinh trong lớp đều đã nộp bài tập này.');
      return;
    }

    const title = activeAssignment.title || activeAssignment.topic;
    let text = `📢 THÔNG BÁO NHẮC NHỞ HOÀN THÀNH BÀI TẬP\n`;
    text += `🏫 Lớp: ${currentClass?.name || ''}\n`;
    text += `📝 Bài tập: ${title}\n`;
    text += `⏰ Hạn nộp: ${activeAssignment.dueDate ? new Date(activeAssignment.dueDate).toLocaleString('vi-VN') : 'Sớm nhất có thể'}\n\n`;
    text += `Danh sách các bạn chưa hoàn thành bài tập (${notDoneStudents.length} bạn):\n`;
    notDoneStudents.forEach((std, idx) => {
      text += `${idx + 1}. ${std.name} ${std.englishName ? `(${std.englishName})` : ''}\n`;
    });
    text += `\nKính nhờ quý phụ huynh nhắc nhở các con tranh thủ vào làm bài và nộp bài để cô Dung chấm điểm nhé! Cô cảm ơn phụ huynh ạ! ❤️`;

    navigator.clipboard.writeText(text);
    setCopiedZaloMsg(true);
    setTimeout(() => setCopiedZaloMsg(false), 3000);
  };

  // Action: Copy single student reminder
  const handleCopyIndividualReminder = (student: Student) => {
    if (!activeAssignment) return;
    const title = activeAssignment.title || activeAssignment.topic;
    let text = `Dạ cô Dung xin gửi lời chào đến phụ huynh em ${student.name}${student.englishName ? ` (${student.englishName})` : ''} ạ!\n`;
    text += `Hiện tại con chưa hoàn thành bài tập "${title}". Nhờ phụ huynh nhắc con mở app làm bài và nộp bài sớm giúp cô nhé! Cô cảm ơn phụ huynh nhiều ạ! ❤️`;
    navigator.clipboard.writeText(text);
    alert(`Đã copy tin nhắn nhắc nhở cho phụ huynh em ${student.name}!\nCô có thể dán vào tin nhắn Zalo gửi ngay cho phụ huynh.`);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header Quản Lý Lớp */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-brand-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">👥</span>
            <h2 className="text-xl sm:text-2xl font-black text-brand-900">Quản Lý Danh Sách Học Sinh Theo Lớp</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Quản lý sĩ số, họ tên, tên tiếng Anh (E.NAME), nhập xuất Excel và theo dõi thông tin học tập của từng lớp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Reset Demo Data Button */}
          <button
            onClick={handleResetData}
            disabled={isResetting}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs sm:text-sm rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 shadow-sm"
            title="Xóa toàn bộ dữ liệu mẫu giả định để bắt đầu nhập dữ liệu thật 100%"
          >
            <span>🔄</span>
            <span>Reset Dữ Liệu Thật</span>
          </button>

          {/* Sửa lớp đang chọn */}
          {currentClass && (
            <button
              onClick={() => setEditingClass(currentClass)}
              className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs sm:text-sm rounded-xl border border-amber-200 transition-all flex items-center gap-1.5 shadow-sm"
              title="Chỉnh sửa thông tin lớp này"
            >
              <span>✏️</span>
              <span>Sửa Lớp Này</span>
            </button>
          )}

          {/* Thêm lớp mới */}
          <button
            onClick={() => setShowAddClass(true)}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span>➕</span> Thêm Lớp Mới
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      {classes.length === 0 ? (
        <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-3xl p-8 text-center space-y-3">
          <span className="text-4xl">🏫</span>
          <h3 className="text-lg font-black text-amber-900">Chưa có lớp học nào</h3>
          <p className="text-sm text-amber-700 max-w-md mx-auto">
            Hệ thống đã được làm sạch để sử dụng thông tin thật. Cô hãy bấm nút <b>"Thêm Lớp Mới"</b> phía trên để tạo lớp đầu tiên nhé!
          </p>
          <button
            onClick={() => setShowAddClass(true)}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md text-sm"
          >
            ➕ Tạo Lớp Học Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {classes.map(c => {
            const isSelected = c.id === selectedClassId;
            const count = getStudents(c.id).length;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedClassId(c.id)}
                className={`cursor-pointer shrink-0 px-4 py-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                  isSelected
                    ? 'bg-brand-500 border-brand-600 text-white shadow-lg scale-102'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300'
                }`}
              >
                <div>
                  <h4 className="font-black text-base leading-tight">{c.name}</h4>
                  <span className={`text-xs font-semibold ${isSelected ? 'text-brand-100' : 'text-slate-400'}`}>
                    Khối {c.grade} • {count} học sinh
                  </span>
                </div>
                {classes.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClass(c.id, c.name);
                    }}
                    title="Xóa lớp này"
                    className={`ml-1 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                    }`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Student List Section for Selected Class */}
      {currentClass && (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-brand-100 space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Tìm tên hoặc tên tiếng Anh trong ${currentClass.name}...`}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAddStudent(true)}
                className="px-3.5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
              >
                <span>➕</span> Thêm 1 Học Sinh
              </button>

              <button
                onClick={() => setShowExcelModal(true)}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
              >
                <span>📥</span> Nhập từ Excel
              </button>

              <button
                onClick={() => setShowBatchModal(true)}
                className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
              >
                <span>📋</span> Dán Hàng Loạt
              </button>

              <button
                onClick={handleExportStudentAccounts}
                className="px-3.5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
                title="Tải file Excel danh sách tài khoản & mật khẩu để gửi cho phụ huynh"
              >
                <span>🔑</span> Xuất DS Tài Khoản (Excel)
              </button>
            </div>
          </div>

          {/* Homework Status Filter Bar for Selected Class */}
          <div className="p-4 bg-gradient-to-r from-amber-50/70 via-slate-50 to-blue-50/70 rounded-2xl border border-brand-100 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Assignment selector */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-base">📝</span>
                <div className="flex-1 max-w-sm">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                    Kiểm tra bài tập:
                  </label>
                  <select
                    value={selectedAssignmentId}
                    onChange={e => setSelectedAssignmentId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:border-brand-500 outline-none shadow-xs"
                  >
                    {classAssignments.length === 0 ? (
                      <option value="NONE">Chưa có bài tập nào giao cho lớp này</option>
                    ) : (
                      <>
                        <option value="LATEST">⚡ Bài mới nhất: {classAssignments[0].title || classAssignments[0].topic}</option>
                        {classAssignments.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.title || a.topic} ({a.assignedDate})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHomeworkStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    homeworkStatusFilter === 'ALL'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHomeworkStatusFilter('NOT_DONE')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    homeworkStatusFilter === 'NOT_DONE'
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-200'
                      : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  <span>⚠️</span>
                  <span>Chưa làm bài tập</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    homeworkStatusFilter === 'NOT_DONE' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {notDoneStudents.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setHomeworkStatusFilter('DONE')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    homeworkStatusFilter === 'DONE'
                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                      : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  <span>✅</span>
                  <span>Đã nộp bài</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    homeworkStatusFilter === 'DONE' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {doneStudents.length}
                  </span>
                </button>
              </div>

              {/* Copy Zalo Button */}
              {notDoneStudents.length > 0 && activeAssignment && (
                <button
                  type="button"
                  onClick={handleCopyNotDoneZaloList}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                  title="Sao chép danh sách các bạn chưa làm để dán gửi vào nhóm Zalo lớp"
                >
                  <span>📋</span>
                  <span>{copiedZaloMsg ? '✓ Đã Copy Danh Sách!' : 'Copy DS Chưa Làm (Gửi Zalo)'}</span>
                </button>
              )}
            </div>

            {/* Quick alert if viewing NOT_DONE */}
            {homeworkStatusFilter === 'NOT_DONE' && (
              <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
                <span>
                  Đang lọc <b>{notDoneStudents.length}</b> bạn học sinh trong <b>{currentClass.name}</b> chưa hoàn thành bài tập <b>"{activeAssignment?.title || activeAssignment?.topic || 'này'}"</b>.
                </span>
                <button
                  type="button"
                  onClick={() => setHomeworkStatusFilter('ALL')}
                  className="text-rose-700 font-bold hover:underline ml-2 text-[11px]"
                >
                  Xem tất cả
                </button>
              </div>
            )}
          </div>

          {/* Student Table */}
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <div className="text-4xl mb-2">
                {homeworkStatusFilter === 'NOT_DONE' ? '🎉' : '🎒'}
              </div>
              <p className="font-bold text-base">
                {homeworkStatusFilter === 'NOT_DONE'
                  ? `Tuyệt vời! 100% học sinh ${currentClass.name} đã hoàn thành bài tập này!`
                  : homeworkStatusFilter === 'DONE'
                  ? `Chưa có học sinh nào trong ${currentClass.name} nộp bài tập này.`
                  : `Chưa có học sinh nào phù hợp trong ${currentClass.name}`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {homeworkStatusFilter !== 'ALL' ? (
                  <button
                    onClick={() => setHomeworkStatusFilter('ALL')}
                    className="text-brand-600 hover:underline font-bold"
                  >
                    Bấm vào đây để xem toàn bộ danh sách lớp
                  </button>
                ) : (
                  'Cô có thể bấm "Nhập từ Excel", "Dán Hàng Loạt" hoặc "Thêm 1 Học Sinh" để nạp danh sách thật vào lớp nhé!'
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-3">STT</th>
                    <th className="py-3 px-4">Họ và Tên Học Sinh</th>
                    <th className="py-3 px-4">Tên Tiếng Anh (E.NAME)</th>
                    <th className="py-3 px-3">Lớp</th>
                    <th className="py-3 px-3">Mật Khẩu</th>
                    <th className="py-3 px-4">Số Điện Thoại Phụ Huynh</th>
                    <th className="py-3 px-4 text-center">Trạng Thái Bài Tập</th>
                    <th className="py-3 px-4">Ghi Chú của Cô</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s, idx) => {
                    const sub = getStudentSubmission(s);
                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors ${
                          homeworkStatusFilter === 'NOT_DONE'
                            ? 'hover:bg-rose-50/40 bg-rose-50/10'
                            : 'hover:bg-brand-50/40'
                        }`}
                      >
                        <td className="py-3.5 px-3 font-bold text-slate-400 text-xs">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-lg shadow-sm">
                              {s.avatar || '🎒'}
                            </span>
                            <span className="font-black text-slate-800 text-sm">{s.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {s.englishName ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                              <span>⭐</span> {s.englishName}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs italic">Chưa đặt</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 font-bold text-xs">
                            {s.className}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            onClick={() => {
                              navigator.clipboard.writeText(s.password || '123');
                              alert(`Đã copy mật khẩu của ${s.name}: ${s.password || '123'}`);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-mono font-bold text-xs cursor-pointer transition-all"
                            title="Click để copy mật khẩu"
                          >
                            <span>🔑</span> {s.password || '123'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                          {s.phone ? (
                            <span className="text-slate-700 font-mono">📞 {s.phone}</span>
                          ) : (
                            <span className="text-slate-300 italic">—</span>
                          )}
                        </td>
                        {/* Trạng Thái Bài Tập */}
                        <td className="py-3.5 px-4 text-center">
                          {sub ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                              <span>✅</span> Đã nộp ({sub.score.toFixed(1)}đ)
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs">
                                <span>⚠️</span> Chưa làm
                              </span>
                              {s.phone && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyIndividualReminder(s)}
                                  className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-all shadow-2xs"
                                  title={`Copy tin nhắn nhắc phụ huynh em ${s.name}`}
                                >
                                  📱 Nhắc
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 italic">
                          {s.notes || <span className="text-slate-300">Chưa có ghi chú</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => setEditingStudent(s)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition-all"
                              title="Chỉnh sửa thông tin"
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(s.id, s.name)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-bold transition-all"
                              title="Xóa học sinh"
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Thêm Lớp Mới */}
      {showAddClass && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-brand-900">➕ Thêm Lớp Học Mới</h3>
            <form onSubmit={handleCreateClass} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tên Lớp (VD: Lớp A4 T4-T6, Lớp 6A1...)</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  placeholder="Nhập tên lớp..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Khối Lớp</label>
                <select
                  value={newClassGrade}
                  onChange={e => setNewClassGrade(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-brand-500 outline-none bg-white"
                >
                  <option value={1}>Khối 1</option>
                  <option value={2}>Khối 2</option>
                  <option value={3}>Khối 3</option>
                  <option value={4}>Khối 4</option>
                  <option value={5}>Khối 5</option>
                  <option value={6}>Khối 6</option>
                  <option value={7}>Khối 7</option>
                  <option value={8}>Khối 8</option>
                  <option value={9}>Khối 9</option>
                  <option value={10}>Khối 10</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Lịch học / Mô tả</label>
                <input
                  type="text"
                  value={newClassDesc}
                  onChange={e => setNewClassDesc(e.target.value)}
                  placeholder="VD: Thứ 4 & Thứ 6 (18:00 - 19:30)"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClass(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  Tạo Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh Sửa Lớp */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-brand-900">✏️ Chỉnh Sửa Thông Tin Lớp Học</h3>
            <form onSubmit={handleUpdateClass} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tên Lớp</label>
                <input
                  type="text"
                  required
                  value={editingClass.name}
                  onChange={e => setEditingClass({ ...editingClass, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Khối Lớp</label>
                <select
                  value={editingClass.grade}
                  onChange={e => setEditingClass({ ...editingClass, grade: Number(e.target.value) })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-brand-500 outline-none bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                    <option key={g} value={g}>Khối {g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Lịch học / Mô tả</label>
                <input
                  type="text"
                  value={editingClass.description || ''}
                  onChange={e => setEditingClass({ ...editingClass, description: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Thêm 1 Học Sinh */}
      {showAddStudent && currentClass && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-brand-900">➕ Thêm Học Sinh Vào {currentClass.name}</h3>
            <form onSubmit={handleAddSingleStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Họ và Tên Học Sinh *</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  placeholder="VD: Hoàng Sơn Tùng"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tên Tiếng Anh / E.NAME (Tùy chọn)</label>
                <input
                  type="text"
                  value={newStudentEnglishName}
                  onChange={e => setNewStudentEnglishName(e.target.value)}
                  placeholder="VD: Arty, Batman, Kelvin, Elsa..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Số Điện Thoại Phụ Huynh (Tùy chọn)</label>
                <input
                  type="text"
                  value={newStudentPhone}
                  onChange={e => setNewStudentPhone(e.target.value)}
                  placeholder="VD: 0987654321"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mật khẩu đăng nhập (Mặc định: 123)</label>
                <input
                  type="text"
                  value={newStudentPassword}
                  onChange={e => setNewStudentPassword(e.target.value)}
                  placeholder="123"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú của cô (Tùy chọn)</label>
                <input
                  type="text"
                  value={newStudentNote}
                  onChange={e => setNewStudentNote(e.target.value)}
                  placeholder="VD: Chăm chỉ, phát âm tốt..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  Thêm Học Sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nhập Học Sinh Từ File Excel */}
      {showExcelModal && currentClass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📥</span>
                <div>
                  <h3 className="text-lg font-black text-brand-900">Nhập Danh Sách Học Sinh Từ File Excel</h3>
                  <p className="text-xs text-slate-500 font-medium">Áp dụng cho: <b>{currentClass.name}</b></p>
                </div>
              </div>
              <button onClick={() => setShowExcelModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            {/* Template & Upload Controls */}
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-emerald-900">💡 Chưa có file Excel đúng định dạng?</p>
                  <p className="text-[11px] text-emerald-700">Tải file mẫu về máy, điền tên học sinh và nạp lại vào hệ thống:</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shrink-0 flex items-center gap-1 shadow-sm"
                >
                  <span>📄</span> Tải File Mẫu (.xlsx)
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center transition-all bg-slate-50 hover:bg-brand-50/20">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelFileUpload}
                  className="hidden"
                  id="excelFileInput"
                />
                <label htmlFor="excelFileInput" className="cursor-pointer space-y-2 block">
                  <span className="text-4xl block">📊</span>
                  <span className="font-bold text-sm text-slate-700 block">
                    {excelFileName ? `Đã chọn: ${excelFileName}` : 'Nhấn để chọn file Excel (.xlsx, .xls, .csv) từ máy tính'}
                  </span>
                  <span className="text-xs text-slate-400 block">Hệ thống hỗ trợ tự động nhận diện các cột: Họ tên, E.NAME, SĐT, Ghi chú</span>
                </label>
              </div>
            </div>

            {/* Preview Section */}
            {excelPreviewList.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Xem trước ({excelPreviewList.length} học sinh):</span>
                  <span className="text-emerald-600">✓ Đọc dữ liệu thành công</span>
                </div>
                <div className="overflow-y-auto max-h-48 border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="p-2">STT</th>
                        <th className="p-2">Họ và Tên</th>
                        <th className="p-2">E.NAME</th>
                        <th className="p-2">Số Điện Thoại</th>
                        <th className="p-2">Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {excelPreviewList.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-400">{i + 1}</td>
                          <td className="p-2 font-bold text-slate-800">{item.name}</td>
                          <td className="p-2 text-emerald-700 font-semibold">{item.englishName || '—'}</td>
                          <td className="p-2 font-mono text-slate-600">{item.phone || '—'}</td>
                          <td className="p-2 text-slate-500 italic">{item.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelPreviewList([]);
                  setExcelFileName('');
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={excelPreviewList.length === 0}
                onClick={handleConfirmExcelImport}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md disabled:opacity-50"
              >
                Xác Nhận Thêm ({excelPreviewList.length} Học Sinh)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dán Danh Sách Hàng Loạt */}
      {showBatchModal && currentClass && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-brand-900">📋 Dán Danh Sách Học Sinh Vào {currentClass.name}</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <p className="font-bold text-slate-700">📌 Hỗ trợ các định dạng linh hoạt:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-500">
                <li>Copy trực tiếp từ bảng tính Excel (Họ tên [Tab] Tên tiếng Anh)</li>
                <li>Dạng ngăn cách dấu phẩy: <code className="bg-white px-1 rounded">Hoàng Sơn Tùng, Arty, 0987654321</code></li>
                <li>Dạng gạch ngang: <code className="bg-white px-1 rounded">1. Trần Gia Phú - Kelvin</code></li>
                <li>Hoặc chỉ cần danh sách họ tên mỗi bạn 1 dòng.</li>
              </ul>
            </div>
            <form onSubmit={handleBatchAdd} className="space-y-3">
              <textarea
                required
                rows={8}
                value={batchNamesText}
                onChange={e => setBatchNamesText(e.target.value)}
                placeholder={`Hoàng Sơn Tùng, Arty\nNguyễn Minh Duy, Batman\nTrần Gia Phú, Kelvin\nLê Tú Uyên, Cherry\nNguyễn Ngọc Lam Phương, Elsa`}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-mono focus:border-brand-500 outline-none resize-none leading-relaxed"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  Thêm Tất Cả
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh Sửa Học Sinh */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-brand-900">✏️ Chỉnh Sửa Thông Tin Học Sinh</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tên Tiếng Anh / E.NAME</label>
                <input
                  type="text"
                  value={editingStudent.englishName || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, englishName: e.target.value })}
                  placeholder="VD: Kelvin, Elsa, Harry..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Số Điện Thoại Phụ Huynh</label>
                <input
                  type="text"
                  value={editingStudent.phone || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                  placeholder="VD: 0987654321"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mật khẩu đăng nhập</label>
                <input
                  type="text"
                  value={editingStudent.password || '123'}
                  onChange={e => setEditingStudent({ ...editingStudent, password: e.target.value })}
                  placeholder="123"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú của cô</label>
                <input
                  type="text"
                  value={editingStudent.notes || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, notes: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveEditStudent}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
