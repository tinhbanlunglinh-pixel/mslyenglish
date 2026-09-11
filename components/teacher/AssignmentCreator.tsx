import React, { useState, useEffect } from 'react';
import { LessonPlan, Assignment, FallbackNotice } from '../../types';
import { generateLessonPlan, fileToBase64, hasApiKey } from '../../services/geminiService';
import { getClasses, saveAssignment, getAssignments, deleteAssignment, getTodayString, getSubmissions } from '../../services/assignmentService';
import { VocabularySection } from '../VocabularySection';
import { MegaChallenge } from '../MegaChallenge';
import { UploadZone } from '../UploadZone';

interface AssignmentCreatorProps {
  onOpenSettings: () => void;
  onAssignmentCreated?: () => void;
  onNavigateToRepository?: () => void;
  initialAssignment?: Assignment | null;
  onClearInitialAssignment?: () => void;
}

export const AssignmentCreator: React.FC<AssignmentCreatorProps> = ({
  onOpenSettings,
  onAssignmentCreated,
  onNavigateToRepository,
  initialAssignment,
  onClearInitialAssignment
}) => {
  const [plannerMode, setPlannerMode] = useState<'topic' | 'text' | 'image'>('topic');
  const [topic, setTopic] = useState('');
  const [lessonText, setLessonText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'idle' | 'core' | 'practice'>('idle');
  const [fallbackInfo, setFallbackInfo] = useState<FallbackNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);

  // Assignment publish form
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignedDate, setAssignedDate] = useState(getTodayString());
  const [dueDate, setDueDate] = useState(() => {
    // Default deadline: tomorrow at 23:59
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const y = tmr.getFullYear();
    const m = String(tmr.getMonth() + 1).padStart(2, '0');
    const d = String(tmr.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T23:59`;
  });
  // Class assignment mode: 'custom' (Tùy chọn lớp - Mặc định) vs 'all' (Tất cả các lớp)
  const [classAssignmentMode, setClassAssignmentMode] = useState<'custom' | 'all'>('custom');
  const classes = getClasses();
  // By default in custom mode, select the first class so it's ready, or empty if no classes
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(() => {
    return classes.length > 0 ? [classes[0].id] : [];
  });
  const [teacherNote, setTeacherNote] = useState('Các con làm bài cẩn thận, nhớ nghe kỹ phần phát âm và đọc giải thích nhé!');
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const [recentAssignments, setRecentAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    setRecentAssignments(getAssignments());
  }, []);

  // Pre-fill if cloned or edited from LessonRepository
  useEffect(() => {
    if (initialAssignment) {
      setAssignmentTitle(initialAssignment.title ? `${initialAssignment.title} (Bản sao)` : '');
      setTopic(initialAssignment.topic || '');
      setLessonPlan(initialAssignment.lessonPlan || null);
      if (initialAssignment.teacherNote) {
        setTeacherNote(initialAssignment.teacherNote);
      }
      if (initialAssignment.targetClassIds && initialAssignment.targetClassIds.length > 0) {
        if (initialAssignment.targetClassIds.includes('ALL') || initialAssignment.targetClassId === 'ALL') {
          setClassAssignmentMode('all');
        } else {
          setClassAssignmentMode('custom');
          setSelectedClassIds(initialAssignment.targetClassIds);
        }
      }
      if (onClearInitialAssignment) {
        onClearInitialAssignment();
      }
    }
  }, [initialAssignment]);

  const handleGenerateAI = async () => {
    if (!hasApiKey()) {
      onOpenSettings();
      setError('Cô vui lòng nhập API Key trước khi sử dụng tính năng tạo bài học AI nhé!');
      return;
    }

    if (plannerMode === 'topic' && !topic.trim()) {
      setError('Cô hãy nhập chủ đề bài học nhé!');
      return;
    }
    if (plannerMode === 'text' && !lessonText.trim()) {
      setError('Cô hãy dán nội dung bài học vào đây nhé!');
      return;
    }
    if (plannerMode === 'image' && selectedFiles.length === 0) {
      setError('Cô hãy chọn ít nhất một tấm ảnh tài liệu bài học nhé!');
      return;
    }

    setLoading(true);
    setLoadingStage('core');
    setError(null);
    setFallbackInfo(null);
    setLessonPlan(null);
    setPublishedSuccess(false);

    try {
      let base64Images: string[] = [];
      if (plannerMode === 'image' && selectedFiles.length > 0) {
        base64Images = await Promise.all(selectedFiles.map(file => fileToBase64(file)));
      }

      const data = await generateLessonPlan(
        plannerMode === 'topic' ? topic : undefined,
        plannerMode === 'text' ? lessonText : undefined,
        base64Images,
        (stage) => setLoadingStage(stage),
        (notice) => setFallbackInfo(notice)
      );

      setLessonPlan(data);
      setAssignmentTitle(data.topic || topic || 'Bài tập tiếng Anh Mrs. Dung');
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi tạo bài giảng AI. Cô hãy kiểm tra lại kết nối hoặc API Key nhé!');
    } finally {
      setLoading(false);
      setLoadingStage('idle');
    }
  };

  const isAllMode = classAssignmentMode === 'all';

  const selectedClasses = isAllMode
    ? classes
    : classes.filter(c => selectedClassIds.includes(c.id));

  const toggleClass = (cId: string) => {
    setSelectedClassIds(prev => {
      if (prev.includes(cId)) {
        return prev.filter(id => id !== cId);
      } else {
        return [...prev, cId];
      }
    });
  };

  const selectAllClasses = () => {
    setSelectedClassIds(classes.map(c => c.id));
  };

  const clearAllSelectedClasses = () => {
    setSelectedClassIds([]);
  };

  const handlePublishAssignment = () => {
    if (!lessonPlan) return;
    if (!assignmentTitle.trim()) {
      alert('Vui lòng nhập tên/tiêu đề bài tập!');
      return;
    }

    if (!isAllMode && selectedClassIds.length === 0) {
      alert('Cô hãy chọn ít nhất 1 lớp để giao bài nhé!');
      return;
    }

    const targetClassNames = isAllMode
      ? ['Tất cả các lớp']
      : selectedClasses.map(c => c.name);

    const targetClassIds = isAllMode
      ? ['ALL', ...classes.map(c => c.id)]
      : selectedClasses.map(c => c.id);

    const targetClassId = isAllMode
      ? 'ALL'
      : (selectedClasses.length === 1 ? selectedClasses[0].id : 'MULTI');

    const targetClassName = isAllMode
      ? 'Tất cả các lớp'
      : targetClassNames.join(', ');

    const newAssignment: Assignment = {
      id: `assign_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: assignmentTitle.trim(),
      topic: lessonPlan.topic || assignmentTitle.trim(),
      assignedDate,
      dueDate,
      targetClassId,
      targetClassName,
      targetClassIds,
      targetClassNames,
      teacherNote: teacherNote.trim(),
      lessonPlan,
      createdAt: new Date().toISOString()
    };

    saveAssignment(newAssignment);
    setRecentAssignments(getAssignments());
    setPublishedSuccess(true);
    if (onAssignmentCreated) onAssignmentCreated();

    // Reset form after short delay
    setTimeout(() => {
      setLessonPlan(null);
      setTopic('');
      setLessonText('');
      setSelectedFiles([]);
      setPublishedSuccess(false);
    }, 2500);
  };

  const handleDeleteAssignment = (id: string, title: string) => {
    if (confirm(`Cô có chắc chắn muốn xóa bài giao "${title}" không?`)) {
      deleteAssignment(id);
      setRecentAssignments(getAssignments());
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Box Soạn Bài Mới */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-brand-100 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📝</span>
              <h2 className="text-xl sm:text-2xl font-black text-brand-900">Soạn Bài Học & Giao Bài Theo Ngày</h2>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Tạo bài học chuẩn sách Global Success bằng AI, thiết lập hạn nộp và giao bài trực tiếp tới học sinh.
            </p>
          </div>
        </div>

        {/* Input Selector Tab */}
        <div className="space-y-4">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2">
            {[
              { id: 'topic', label: 'Chủ đề', icon: '💡' },
              { id: 'text', label: 'Văn bản', icon: '📝' },
              { id: 'image', label: 'Hình ảnh SGK', icon: '📸' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setPlannerMode(m.id as any);
                  setError(null);
                }}
                className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  plannerMode === m.id
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                <span>{m.icon}</span> {m.label}
              </button>
            ))}
          </div>

          <div>
            {plannerMode === 'topic' && (
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Nhập chủ đề bài học (VD: Unit 1: My New School, Animals, Daily Routines...)"
                className="w-full p-4 text-base sm:text-lg rounded-2xl border-2 border-brand-100 font-bold bg-brand-50/40 outline-none focus:border-brand-500 text-brand-900 transition-all"
              />
            )}

            {plannerMode === 'text' && (
              <textarea
                value={lessonText}
                onChange={e => setLessonText(e.target.value)}
                placeholder="Dán nội dung từ vựng, ngữ pháp hoặc bài đọc vào đây..."
                rows={5}
                className="w-full p-4 text-sm sm:text-base rounded-2xl border-2 border-brand-100 bg-brand-50/40 font-medium text-slate-700 outline-none focus:border-brand-500 transition-all resize-none"
              />
            )}

            {plannerMode === 'image' && (
              <UploadZone
                onFilesSelect={setSelectedFiles}
                isLoading={loading}
                fileCount={selectedFiles.length}
              />
            )}
          </div>

          <button
            onClick={handleGenerateAI}
            disabled={loading}
            className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white rounded-2xl font-black text-lg shadow-xl transition-all transform active:scale-98 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin text-xl">⏳</span>
                <span>
                  {loadingStage === 'core'
                    ? 'Đang tạo lý thuyết & từ vựng chuẩn Global Success...'
                    : 'Đang tạo bộ bài tập MegaTest 50 câu...'}
                </span>
              </>
            ) : (
              <>
                <span>✨</span> TẠO NỘI DUNG BÀI HỌC BẰNG AI
              </>
            )}
          </button>

          {/* Fallback notification */}
          {fallbackInfo && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>
                Model <strong>{fallbackInfo.fromModel}</strong> tạm thời quá tải. Hệ thống đã tự động chuyển sang <strong>{fallbackInfo.toModel}</strong> để tiếp tục xử lý mượt mà.
              </span>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm space-y-2">
              <p className="font-bold flex items-center gap-2">
                <span>❗</span> {error}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onOpenSettings}
                  className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg text-xs font-bold"
                >
                  🔑 Kiểm tra API Key
                </button>
                <button
                  onClick={handleGenerateAI}
                  className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-800 rounded-lg text-xs font-bold border border-rose-200"
                >
                  🔄 Thử lại
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview bài học & Thiết lập giao bài */}
      {lessonPlan && (() => {
        const totalQuestions = (lessonPlan.practice?.megaTest?.multipleChoice?.length || 0) +
          (lessonPlan.practice?.megaTest?.scramble?.length || 0) +
          (lessonPlan.practice?.megaTest?.fillBlank?.length || 0) +
          (lessonPlan.practice?.megaTest?.vocabTranslation?.length || 0) +
          (lessonPlan.practice?.megaTest?.trueFalse?.length || 0) +
          (lessonPlan.practice?.listening?.length || 0);

        return (
          <div className="space-y-8 animate-fade-in font-sans">
            {/* Thanh thông báo đồng bộ giao diện */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl bg-white/20 p-2 rounded-2xl">👁️</span>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-white/20 rounded-full text-[11px] font-black uppercase tracking-wider mb-1">
                    <span>✨</span> Giao diện xem trước của học sinh
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black">Nội Dung Bài Học Đồng Bộ 100% Cho Học Sinh</h3>
                  <p className="text-xs sm:text-sm text-emerald-100 font-medium mt-0.5">
                    Cô có thể kiểm tra từng từ vựng, ngữ pháp, bài đọc và làm thử các bài tập trước khi giao.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black shrink-0 self-stretch sm:self-auto justify-center border border-white/20">
                <span>🚀</span> Tổng cộng {totalQuestions} câu bài tập sẵn sàng
              </div>
            </div>

            {/* Banner Tiêu Đề Bài Học (Giống hệt học sinh) */}
            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border-4 border-brand-100 text-center space-y-4 relative overflow-hidden">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 rounded-full text-xs font-black text-brand-700 uppercase tracking-widest">
                <span>📖</span> BÀI HỌC CÔ DUNG GIAO
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-brand-900 uppercase font-display leading-tight">
                {assignmentTitle || lessonPlan.topic}
              </h1>

              {teacherNote && (
                <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium flex items-center gap-3 text-left">
                  <span className="text-2xl shrink-0">👩‍🏫</span>
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wider text-amber-800">Lời dặn của Cô Dung:</p>
                    <p className="mt-0.5 italic">"{teacherNote}"</p>
                  </div>
                </div>
              )}
            </div>

            {/* PHẦN 1: TỪ VỰNG CHUẨN GLOBAL SUCCESS (Giống hệt học sinh) */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xl border border-brand-100">
              <VocabularySection items={lessonPlan.vocabulary || []} />
            </div>

            {/* PHẦN 2: NGỮ PHÁP QUAN TRỌNG (Giống hệt học sinh) */}
            {lessonPlan.grammar && (
              <div className="bg-highlight-400 p-4 sm:p-6 rounded-3xl shadow-xl border-4 border-white">
                <h2 className="text-base sm:text-xl font-black text-brand-900 uppercase tracking-tight mb-3 flex items-center gap-2">
                  <span className="text-2xl">✨</span> Ngữ Pháp Quan Trọng
                </h2>
                <div className="bg-white/95 p-4 sm:p-6 rounded-2xl shadow-md space-y-3">
                  <h3 className="text-lg sm:text-xl font-black text-brand-700">{lessonPlan.grammar.topic}</h3>
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed border-l-4 border-brand-500 pl-3">
                    {lessonPlan.grammar.explanation}
                  </p>
                  {lessonPlan.grammar.examples && lessonPlan.grammar.examples.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-brand-600 uppercase">Ví dụ minh họa:</h4>
                      <div className="grid gap-2">
                        {lessonPlan.grammar.examples.map((ex, i) => (
                          <div key={i} className="bg-brand-50 p-3 rounded-xl border border-brand-100 flex items-center gap-3">
                            <span className="text-lg">💎</span>
                            <p className="text-sm text-slate-700 italic font-medium">"{ex}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PHẦN 3: BÀI ĐỌC HIỂU (READING ADVENTURE) (Giống hệt học sinh) */}
            {lessonPlan.reading && lessonPlan.reading.passage && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-brand-100 space-y-4">
                <h2 className="text-base sm:text-xl font-black text-brand-900 uppercase tracking-tight flex items-center gap-2">
                  <span>📖</span> Bài Đọc Hiểu: {lessonPlan.reading.title}
                </h2>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed text-base font-serif italic">
                  "{lessonPlan.reading.passage}"
                </div>
                {lessonPlan.reading.translation && (
                  <details className="bg-brand-50/50 p-4 rounded-xl border border-brand-100 text-sm text-slate-600">
                    <summary className="font-bold text-brand-700 cursor-pointer">🔍 Xem bản dịch tiếng Việt</summary>
                    <p className="mt-2 leading-relaxed italic">{lessonPlan.reading.translation}</p>
                  </details>
                )}
              </div>
            )}

            {/* PHẦN 4: SIÊU THỬ THÁCH BÀI TẬP MEGATEST (Giống hệt học sinh) */}
            {lessonPlan.practice?.megaTest && (
              <div className="space-y-4">
                <div className="bg-brand-900/10 p-3 rounded-2xl flex items-center justify-between text-xs font-bold text-brand-900">
                  <span>🚀 PHẦN BÀI TẬP MEGATEST HỌC SINH SẼ LÀM:</span>
                  <span className="bg-brand-500 text-white px-3 py-1 rounded-xl">Cô có thể bấm làm thử từng câu</span>
                </div>
                <MegaChallenge
                  megaData={lessonPlan.practice.megaTest}
                  listeningData={lessonPlan.practice.listening}
                />
              </div>
            )}

            {/* Form Thiết Lập Giao Bài (Hỗ trợ chọn 1 lớp, 2 lớp, 3 lớp... hoặc Tất cả các lớp) */}
            <div className="bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-6 sm:p-8 rounded-3xl border-4 border-brand-300 shadow-2xl space-y-6">
              <div className="border-b border-brand-100 pb-4">
                <h4 className="font-black text-brand-900 text-xl sm:text-2xl flex items-center gap-2">
                  <span>🚀</span> THIẾT LẬP GIAO BÀI TẬP CHO HỌC SINH
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Kiểm tra lại tiêu đề, thời hạn nộp và chọn chính xác các lớp áp dụng bài tập này.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    📝 Tiêu Đề Bài Tập
                  </label>
                  <input
                    type="text"
                    value={assignmentTitle}
                    onChange={e => setAssignmentTitle(e.target.value)}
                    placeholder="Tên bài tập hiển thị cho học sinh..."
                    className="w-full p-3.5 rounded-xl border border-slate-200 text-sm font-bold focus:border-brand-500 outline-none bg-white shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    📅 Ngày Giao Bài
                  </label>
                  <input
                    type="date"
                    value={assignedDate}
                    onChange={e => setAssignedDate(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-200 text-sm font-bold focus:border-brand-500 outline-none bg-white shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    ⏰ Hạn Nộp Bài (Deadline)
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-200 text-sm font-bold focus:border-brand-500 outline-none bg-white shadow-xs"
                  />
                </div>

                {/* BỘ CHỌN LỚP GIAO BÀI (MỤC TÙY CHỌN LỚP HOẶC TẤT CẢ) */}
                <div className="col-span-full bg-slate-50/80 p-5 rounded-2xl border-2 border-brand-200 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-100 pb-3">
                    <div>
                      <label className="text-sm font-black uppercase tracking-wider text-brand-900 flex items-center gap-2">
                        <span>🏫</span> CHỌN ĐỐI TƯỢNG HỌC SINH GIAO BÀI:
                      </label>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Chọn tùy chỉnh theo từng lớp (1 lớp, 2 lớp, 3 lớp...) hoặc giao nhanh cho tất cả các lớp
                      </p>
                    </div>

                    {/* Badge hiển thị tóm tắt */}
                    <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-brand-100 text-brand-900 border border-brand-300 self-start sm:self-auto">
                      {isAllMode ? (
                        <span>🌐 Áp dụng: Tất cả các lớp ({classes.length} lớp)</span>
                      ) : selectedClasses.length > 0 ? (
                        <span>🎯 Đã chọn: {selectedClasses.map(c => c.name).join(', ')} ({selectedClasses.length} lớp)</span>
                      ) : (
                        <span className="text-rose-600 font-bold">⚠️ Chưa chọn lớp nào</span>
                      )}
                    </div>
                  </div>

                  {/* 2 TAB/MODE LỰA CHỌN CHÍNH: TÙY CHỌN LỚP (MẶC ĐỊNH) VS TẤT CẢ CÁC LỚP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Mode 1: Tùy chọn lớp cụ thể (Mặc định) */}
                    <button
                      type="button"
                      onClick={() => setClassAssignmentMode('custom')}
                      className={`p-3.5 rounded-xl text-left border-2 transition-all flex items-start gap-3 ${
                        !isAllMode
                          ? 'bg-white border-brand-500 shadow-md ring-2 ring-brand-200'
                          : 'bg-white/60 border-slate-200 hover:border-brand-200 text-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 border-2 text-xs shrink-0 ${
                        !isAllMode ? 'border-brand-600 bg-brand-600 text-white font-bold' : 'border-slate-300 text-transparent'
                      }`}>
                        ✓
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                          <span>🎯</span> TÙY CHỌN LỚP GIAO BÀI
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                          Cô tích chọn 1 lớp, 2 lớp hoặc nhiều lớp cụ thể theo nhu cầu giảng dạy
                        </p>
                      </div>
                    </button>

                    {/* Mode 2: Áp dụng cho tất cả */}
                    <button
                      type="button"
                      onClick={() => setClassAssignmentMode('all')}
                      className={`p-3.5 rounded-xl text-left border-2 transition-all flex items-start gap-3 ${
                        isAllMode
                          ? 'bg-white border-brand-500 shadow-md ring-2 ring-brand-200'
                          : 'bg-white/60 border-slate-200 hover:border-brand-200 text-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 border-2 text-xs shrink-0 ${
                        isAllMode ? 'border-brand-600 bg-brand-600 text-white font-bold' : 'border-slate-300 text-transparent'
                      }`}>
                        ✓
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                          <span>🌐</span> GIAO CHO TẤT CẢ CÁC LỚP
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                          Tự động áp dụng cho toàn bộ {classes.length} lớp học hiện có
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* NỘI DUNG KHI CHỌN MODE TÙY CHỌN LỚP */}
                  {!isAllMode ? (
                    <div className="bg-white p-4 rounded-xl border border-brand-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          Danh sách lớp học (Bấm để chọn / bỏ chọn):
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAllClasses}
                            className="text-[11px] font-bold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            ✓ Chọn tất cả
                          </button>
                          <button
                            type="button"
                            onClick={clearAllSelectedClasses}
                            className="text-[11px] font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            ✕ Bỏ chọn hết
                          </button>
                        </div>
                      </div>

                      {classes.length === 0 ? (
                        <p className="text-xs text-amber-600 font-medium italic">
                          Chưa có lớp học nào trong hệ thống. Cô hãy vào mục "Quản lý Lớp" để thêm lớp nhé!
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2.5 pt-1">
                          {classes.map(c => {
                            const isSelected = selectedClassIds.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleClass(c.id)}
                                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2 transition-all flex items-center gap-2.5 cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-200 scale-102'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50/40'
                                }`}
                              >
                                <span className="text-base">{isSelected ? '☑️' : '⬜'}</span>
                                <span>{c.name}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {c.studentCount || 0} HS
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {selectedClassIds.length === 0 && (
                        <p className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-1">
                          <span>⚠️</span> Cô hãy bấm chọn ít nhất 1 lớp học để giao bài nhé!
                        </p>
                      )}
                    </div>
                  ) : (
                    /* NỘI DUNG KHI CHỌN GIAO CHO TẤT CẢ CÁC LỚP */
                    <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 flex items-center gap-3">
                      <span className="text-2xl">📢</span>
                      <div className="text-xs text-emerald-900 leading-relaxed font-medium">
                        Bài tập này sẽ được giao đồng thời tới <strong>toàn bộ {classes.length} lớp</strong> ({classes.map(c => c.name).join(', ')}).
                        Tất cả học sinh thuộc các lớp này đều sẽ nhìn thấy bài và có thể làm bài tập ngay!
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-full">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    💬 Lời Nhắn Dặn Của Cô Dung Cho Học Sinh
                  </label>
                  <input
                    type="text"
                    value={teacherNote}
                    onChange={e => setTeacherNote(e.target.value)}
                    placeholder="Lời dặn học sinh làm bài..."
                    className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none bg-white shadow-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handlePublishAssignment}
                  disabled={publishedSuccess || (!isAllMode && selectedClassIds.length === 0)}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xl shadow-xl transition-all transform active:scale-98 flex items-center justify-center gap-2"
                >
                  {publishedSuccess ? (
                    <>
                      <span>✅</span> ĐÃ GIAO BÀI CHO HỌC SINH THÀNH CÔNG!
                    </>
                  ) : (
                    <>
                      <span>🚀</span> GIAO BÀI NGAY CHO HỌC SINH
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Danh Sách Các Bài Đã Giao Gần Đây */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-brand-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-brand-900 uppercase tracking-tight flex items-center gap-2">
            <span>📚</span> CÁC BÀI TẬP ĐÃ GIAO GẦN ĐÂY ({recentAssignments.length})
          </h3>
          {onNavigateToRepository && (
            <button
              onClick={onNavigateToRepository}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>📂</span> Mở Kho Tài Liệu Đầy Đủ →
            </button>
          )}
        </div>

        {recentAssignments.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <div className="text-4xl mb-2">📖</div>
            <p className="font-bold text-base">Chưa có bài tập nào được giao</p>
            <p className="text-xs text-slate-400 mt-1">Cô hãy soạn bài và nhấn "Giao bài ngay cho học sinh" ở trên nhé!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentAssignments.map(assign => {
              const subsCount = getSubmissions(assign.id).length;
              return (
                <div
                  key={assign.id}
                  className="p-5 rounded-2xl border-2 border-slate-100 hover:border-brand-300 bg-slate-50/50 hover:bg-white transition-all space-y-3 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-brand-100 text-brand-800 text-[11px] font-bold">
                        {assign.targetClassName}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Giao: {assign.assignedDate}
                      </span>
                    </div>

                    <h4 className="font-black text-slate-800 text-base leading-snug line-clamp-2">
                      {assign.title}
                    </h4>

                    {assign.teacherNote && (
                      <p className="text-xs text-slate-500 italic mt-1 line-clamp-1">
                        "{assign.teacherNote}"
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                      {subsCount} bài đã nộp
                    </span>

                    <button
                      onClick={() => handleDeleteAssignment(assign.id, assign.title)}
                      className="text-slate-400 hover:text-rose-600 font-bold p-1 transition-colors"
                      title="Xóa bài tập"
                    >
                      🗑️ Xóa bài
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
