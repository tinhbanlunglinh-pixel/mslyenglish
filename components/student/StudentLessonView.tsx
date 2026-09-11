import React, { useState } from 'react';
import { Assignment, Submission } from '../../types';
import { VocabularySection } from '../VocabularySection';
import { MegaChallenge } from '../MegaChallenge';
import { LessonCertificate } from '../LessonCertificate';
import { saveSubmission, getStudentSubmission } from '../../services/assignmentService';
import { sendToGoogleSheets } from '../../services/googleSheetsService';
import { saveLessonRecord, generateRecordId } from '../../services/historyService';

interface StudentLessonViewProps {
  assignment: Assignment;
  studentName: string;
  studentClass: string;
  onBack: () => void;
}

export const StudentLessonView: React.FC<StudentLessonViewProps> = ({
  assignment,
  studentName,
  studentClass,
  onBack
}) => {
  const existingSubmission = getStudentSubmission(assignment.id, studentName);
  const [megaScores, setMegaScores] = useState(
    existingSubmission?.skillScores || { mc: 0, scramble: 0, fill: 0, vocab: 0, tf: 0, listen: 0 }
  );
  const [showCertificate, setShowCertificate] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(!!existingSubmission);
  const [submittedScore, setSubmittedScore] = useState<number>(existingSubmission?.score || 0);

  const lesson = assignment.lessonPlan;

  // Question count
  const totalQuestions = (lesson.practice?.megaTest?.multipleChoice?.length || 0) +
    (lesson.practice?.megaTest?.scramble?.length || 0) +
    (lesson.practice?.megaTest?.fillBlank?.length || 0) +
    (lesson.practice?.megaTest?.vocabTranslation?.length || 0) +
    (lesson.practice?.megaTest?.trueFalse?.length || 0) +
    (lesson.practice?.listening?.length || 0);

  const totalCorrectCount = megaScores.mc + megaScores.scramble + megaScores.fill + megaScores.vocab + megaScores.tf + megaScores.listen;

  function calculateScore() {
    const total = totalQuestions || 1;
    const raw = (totalCorrectCount / total) * 10;
    return Math.round(raw * 10) / 10;
  }

  const currentScore = isSubmitted ? submittedScore : calculateScore();

  function getEvaluation(score: number) {
    const s = score || 0;
    if (s >= 9) return { text: "XUẤT SẮC", emoji: "🏆", level: "EXCELLENT", praise: "Con là một ngôi sao sáng nhất lớp Mrs. Dung!" };
    if (s >= 7) return { text: "KHÁ GIỎI", emoji: "🌟", level: "GREAT JOB", praise: "Con làm bài rất tuyệt vời, tiếp tục phát huy nhé!" };
    if (s >= 5) return { text: "CỐ GẮNG", emoji: "👍", level: "GOOD EFFORT", praise: "Con đã nỗ lực rất nhiều, Mrs. Dung tự hào về con!" };
    return { text: "CẦN NỖ LỰC", emoji: "💪", level: "KEEP IT UP", praise: "Đừng nản lòng con nhé, bài sau mình làm tốt hơn nào!" };
  }

  const evaluation = getEvaluation(currentScore);

  const handleSubmitAssignment = () => {
    if (!studentName.trim() || !studentClass.trim()) {
      alert('Vui lòng nhập đầy đủ tên và lớp để nộp bài nhé!');
      return;
    }

    const finalScore = calculateScore();
    const finalEval = getEvaluation(finalScore);

    const submission: Submission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      topic: assignment.topic,
      studentName: studentName.trim(),
      studentClass: studentClass.trim(),
      submittedAt: new Date().toISOString(),
      score: finalScore,
      totalCorrect: totalCorrectCount,
      totalQuestions: totalQuestions,
      skillScores: { ...megaScores },
      evaluation: finalEval
    };

    // Save to assignment service (real-time sync to teacher dashboard)
    saveSubmission(submission);

    // Save to local history
    saveLessonRecord({
      id: generateRecordId(),
      date: new Date().toISOString(),
      topic: assignment.topic,
      score: finalScore,
      totalCorrect: totalCorrectCount,
      totalQuestions: totalQuestions,
      skillScores: { ...megaScores },
      studentName: studentName.trim()
    });

    // Send to Google Sheets (background)
    sendToGoogleSheets({
      studentName: studentName.trim(),
      studentClass: studentClass.trim(),
      topic: assignment.topic,
      score: finalScore,
      totalCorrect: totalCorrectCount,
      totalQuestions: totalQuestions
    });

    setSubmittedScore(finalScore);
    setIsSubmitted(true);
    setShowCertificate(true);
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-16">
      {/* Header Điều Hướng */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-md border border-brand-100">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
        >
          <span>⬅️</span> Quay lại danh sách bài tập
        </button>

        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-brand-700">
          <span>Học sinh:</span>
          <span className="px-3 py-1 bg-brand-50 rounded-lg text-brand-900 font-black">
            {studentName} ({studentClass})
          </span>
        </div>
      </div>

      {/* Thông tin bài học do giáo viên giao */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border-4 border-brand-100 text-center space-y-4 relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 rounded-full text-xs font-black text-brand-700 uppercase tracking-widest">
          <span>📖</span> BÀI HỌC CÔ DUNG GIAO
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-brand-900 uppercase font-display leading-tight">
          {assignment.title}
        </h1>

        {assignment.teacherNote && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium flex items-center gap-3 text-left">
            <span className="text-2xl shrink-0">👩‍🏫</span>
            <div>
              <p className="font-bold text-xs uppercase tracking-wider text-amber-800">Lời dặn của Cô Dung:</p>
              <p className="mt-0.5 italic">"{assignment.teacherNote}"</p>
            </div>
          </div>
        )}

        {isSubmitted && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 border border-emerald-300 rounded-full text-emerald-800 font-bold text-sm">
            <span>✅</span> Con đã hoàn thành và nộp bài này với điểm số: <strong>{submittedScore.toFixed(1)}/10</strong>!
          </div>
        )}
      </div>

      {/* PHẦN 1: TỪ VỰNG CHUẨN GLOBAL SUCCESS (Đồng nhất 100% với bài cô soạn) */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xl border border-brand-100">
        <VocabularySection items={lesson.vocabulary || []} />
      </div>

      {/* PHẦN 2: NGỮ PHÁP QUAN TRỌNG */}
      {lesson.grammar && (
        <div className="bg-highlight-400 p-4 sm:p-6 rounded-3xl shadow-xl border-4 border-white">
          <h2 className="text-base sm:text-xl font-black text-brand-900 uppercase tracking-tight mb-3 flex items-center gap-2">
            <span className="text-2xl">✨</span> Ngữ Pháp Quan Trọng
          </h2>
          <div className="bg-white/95 p-4 sm:p-6 rounded-2xl shadow-md space-y-3">
            <h3 className="text-lg sm:text-xl font-black text-brand-700">{lesson.grammar.topic}</h3>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed border-l-4 border-brand-500 pl-3">
              {lesson.grammar.explanation}
            </p>
            {lesson.grammar.examples && lesson.grammar.examples.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-brand-600 uppercase">Ví dụ minh họa:</h4>
                <div className="grid gap-2">
                  {lesson.grammar.examples.map((ex, i) => (
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

      {/* PHẦN 3: BÀI ĐỌC HIỂU (READING ADVENTURE) */}
      {lesson.reading && lesson.reading.passage && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-brand-100 space-y-4">
          <h2 className="text-base sm:text-xl font-black text-brand-900 uppercase tracking-tight flex items-center gap-2">
            <span>📖</span> Bài Đọc Hiểu: {lesson.reading.title}
          </h2>
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed text-base font-serif italic">
            "{lesson.reading.passage}"
          </div>
          {lesson.reading.translation && (
            <details className="bg-brand-50/50 p-4 rounded-xl border border-brand-100 text-sm text-slate-600">
              <summary className="font-bold text-brand-700 cursor-pointer">🔍 Xem bản dịch tiếng Việt</summary>
              <p className="mt-2 leading-relaxed italic">{lesson.reading.translation}</p>
            </details>
          )}
        </div>
      )}

      {/* PHẦN 4: SIÊU THỬ THÁCH BÀI TẬP MEGATEST */}
      {lesson.practice?.megaTest && (
        <div className="space-y-4">
          <MegaChallenge
            megaData={lesson.practice.megaTest}
            listeningData={lesson.practice.listening}
            onScoresUpdate={setMegaScores}
          />
        </div>
      )}

      {/* PHẦN 5: TỔNG KẾT VÀ NỘP BÀI */}
      <div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-brand-100 text-center space-y-6">
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Điểm Số Của Con</p>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black text-brand-600 leading-none">{currentScore.toFixed(1)}</span>
            <span className="text-2xl font-bold text-slate-300">/10</span>
          </div>
          <div className="text-sm font-semibold text-brand-600 bg-brand-50 px-4 py-1.5 rounded-full border border-brand-200">
            Số câu đúng: <span className="font-black text-brand-800">{totalCorrectCount}/{totalQuestions}</span>
          </div>
          <div className={`mt-2 px-6 py-2 rounded-full font-black text-base shadow-md ${
            currentScore >= 5 ? 'bg-brand-500 text-white' : 'bg-orange-500 text-white'
          }`}>
            {evaluation.emoji} {evaluation.text}
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-3">
          <button
            onClick={handleSubmitAssignment}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xl shadow-xl transition-all transform active:scale-98 flex items-center justify-center gap-2"
          >
            <span>🚀</span> {isSubmitted ? 'CẬP NHẬT KẾT QUẢ NỘP BÀI' : 'NỘP BÀI CHO CÔ DUNG'}
          </button>

          {isSubmitted && (
            <button
              onClick={() => setShowCertificate(true)}
              className="w-full py-3 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-2xl font-bold text-sm border border-brand-200 transition-all flex items-center justify-center gap-2"
            >
              <span>📜</span> Xem Chứng Nhận Vinh Danh
            </button>
          )}
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertificate && (
        <LessonCertificate
          studentName={studentName}
          topic={assignment.topic}
          score={currentScore}
          totalCorrect={totalCorrectCount}
          totalQuestions={totalQuestions}
          evaluation={evaluation}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
};
