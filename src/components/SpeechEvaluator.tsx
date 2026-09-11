import React from 'react';
import { 
  Mic, 
  Square, 
  RefreshCw, 
  Star, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb, 
  BookmarkCheck 
} from 'lucide-react';
import { motion } from 'motion/react';
import { EvaluationResult } from '../types';
import { computeTotalFromCriteria } from '../services/geminiService';

interface SpeechEvaluatorProps {
  readingText: string | null;
  isRecording: boolean;
  isEvaluating: boolean;
  evaluation: EvaluationResult | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export const SpeechEvaluator: React.FC<SpeechEvaluatorProps> = ({
  readingText, isRecording, isEvaluating, evaluation,
  startRecording, stopRecording
}) => {
  if (!readingText) return null;

  return (
    <div className="w-full max-w-[600px] mt-1 space-y-2">
      <div className="flex flex-col items-center gap-2 p-3 bg-emerald-50/20 rounded-xl border border-emerald-100">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
          <Mic size={16} className="text-emerald-500" />
          <span>Ms Lý: Luyện nói cùng cô giáo</span>
        </div>
        
        {!evaluation && !isEvaluating && !isRecording && (
          <button
            onClick={startRecording}
            className="flex items-center gap-3 px-5 sm:px-6 py-3 rounded-2xl font-black text-white transition-all shadow-xl text-sm sm:text-base bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-1"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            <Mic size={20} />
            Bắt đầu luyện nói
          </button>
        )}

        {isRecording && !isEvaluating && (
          <>
            <button
              onClick={stopRecording}
              className="flex items-center gap-3 px-5 sm:px-6 py-3 rounded-2xl font-black text-white transition-all shadow-xl text-sm sm:text-base bg-red-500 hover:bg-red-600 animate-pulse scale-105"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            >
              <Square size={20} fill="currentColor" />
              Đang nghe bé nói...
            </button>
            <p className="text-[10px] text-red-400 font-bold animate-pulse">
              Mẹo: Sau khi đọc xong, bé chờ 1 giây rồi hãy nhấn nút dừng nhé!
            </p>
          </>
        )}

        {isEvaluating && (
          <div className="flex flex-col items-center gap-3 py-4 animate-pulse">
            <RefreshCw className="animate-spin text-brand-green" size={32} />
            <div className="text-center">
              <p className="text-sm font-black text-brand-green">Cô Lý đang nghe và chấm điểm cho con nhé...</p>
              <p className="text-[10px] text-slate-400 font-medium">Bé chờ cô một chút xíu thôi!</p>
            </div>
          </div>
        )}

        {evaluation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-4">
            {(!evaluation.isComplete && (!evaluation.score || evaluation.score === 0)) ? (
              <IncompleteResult evaluation={evaluation} startRecording={startRecording} />
            ) : (
              <CompleteResult 
                evaluation={evaluation} startRecording={startRecording}
              />
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

const IncompleteResult: React.FC<{ evaluation: EvaluationResult; startRecording: () => Promise<void> }> = ({ evaluation, startRecording }) => (
  <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm space-y-3">
    <div className="flex items-center gap-3 text-red-600">
      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><RefreshCw size={20} /></div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider">Chưa hoàn thành</div>
        <div className="text-sm font-medium">Bé cần đọc lại đầy đủ nhé!</div>
      </div>
    </div>
    <p className="text-sm text-gray-700 leading-relaxed italic">"{evaluation.feedback}"</p>
    {evaluation.missingContent && (
      <div className="bg-white/50 p-2 rounded-lg border border-red-200 text-xs text-red-700">
        <span className="font-bold">Phần thiếu:</span> {evaluation.missingContent}
      </div>
    )}
    <button onClick={startRecording} className="w-full py-2 bg-red-500 text-white rounded-lg font-bold text-xs hover:bg-red-600 transition-colors">Đọc lại ngay</button>
  </div>
);

const CRITERIA_CONFIG = [
  {
    key: 'pronunciation' as const,
    label: 'Phát âm',
    subLabel: 'Pronunciation',
    icon: '🗣️',
    description: 'Nguyên âm, phụ âm & độ tròn vành rõ chữ'
  },
  {
    key: 'stress' as const,
    label: 'Trọng âm',
    subLabel: 'Stress',
    icon: '🎯',
    description: 'Nhấn âm từ & câu đúng vị trí'
  },
  {
    key: 'intonation' as const,
    label: 'Ngữ điệu',
    subLabel: 'Intonation',
    icon: '🎵',
    description: 'Lên xuống giọng tự nhiên theo ngữ cảnh'
  },
  {
    key: 'fluency' as const,
    label: 'Độ trôi chảy',
    subLabel: 'Fluency',
    icon: '⚡',
    description: 'Tốc độ vừa phải, ngắt nghỉ đúng nhịp'
  },
  {
    key: 'connectedSpeech' as const,
    label: 'Nối âm & Âm đuôi',
    subLabel: 'Connected Speech',
    icon: '🔗',
    description: 'Bật âm đuôi /s/, /t/, /d/ & nối âm mượt mà'
  },
];

const CompleteResult: React.FC<{
  evaluation: EvaluationResult;
  startRecording: () => Promise<void>;
}> = ({ evaluation, startRecording }) => {
  // Điểm tổng: hiển thị điểm tổng duy nhất, không hiển thị điểm số thành phần
  const displayScore = typeof evaluation.score === 'number' && evaluation.score > 0
    ? evaluation.score 
    : (evaluation.criteriaScores ? computeTotalFromCriteria(evaluation.criteriaScores) : 0);

  return (
    <div className="w-full space-y-3.5">
      {/* 1. Tổng điểm duy nhất */}
      <div className="flex items-center justify-between bg-gradient-to-br from-white to-emerald-50 p-4 sm:p-5 rounded-2xl border-2 border-emerald-200 shadow-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-yellow rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-yellow/20 rotate-3 shrink-0">
            <Star size={28} fill="currentColor" />
          </div>
          <div>
            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Tổng điểm luyện nói</div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black text-emerald-700">{displayScore}</span>
              <span className="text-sm font-bold text-emerald-500">/ 10</span>
            </div>
          </div>
        </div>
        <button 
          onClick={startRecording} 
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 bg-white text-emerald-700 border-2 border-emerald-200 rounded-xl font-bold text-xs sm:text-sm hover:border-brand-green hover:bg-emerald-50/50 transition-all shadow-sm active:scale-95"
        >
          <RefreshCw size={14} />
          <span>Luyện lại</span>
        </button>
      </div>

      {/* 2. Có 1 câu nhận xét chung từ cô Lý */}
      {evaluation.feedback && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-emerald-50/90 border-2 border-emerald-200 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-green text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Sparkles size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-1">
              Nhận xét chung từ cô Lý
            </div>
            <p className="text-xs sm:text-sm text-emerald-950 font-semibold leading-relaxed italic">
              "{evaluation.feedback}"
            </p>
          </div>
        </div>
      )}

      {/* 3. 5 thẻ nhận xét riêng theo các mục nhận xét định tính chuẩn Cambridge */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 uppercase tracking-wider">
            <BookmarkCheck size={16} className="text-brand-green" />
            <span>Nhận xét định tính chuẩn Cambridge</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium italic">5 tiêu chí sư phạm</span>
        </div>

        <div className="space-y-2">
          {CRITERIA_CONFIG.map((crit) => {
            const comment = evaluation.criteriaFeedback?.[crit.key];
            if (!comment) return null;
            return (
              <div 
                key={crit.key} 
                className="p-3.5 rounded-2xl bg-white border-2 border-emerald-100 shadow-xs hover:border-brand-green/40 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{crit.icon}</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-900">{crit.label}</span>
                    <span className="text-[11px] text-emerald-600 font-semibold">({crit.subLabel})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">{crit.description}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium pl-6">
                  {comment}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Chi tiết lỗi sai & Hướng dẫn sửa cụ thể */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-rose-800 uppercase tracking-wider">
            <AlertCircle size={16} className="text-rose-500" />
            <span>Chi tiết lỗi sai & Hướng dẫn sửa</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium italic">Chỉ rõ sai ở đâu & Cần sửa gì</span>
        </div>

        {evaluation.detailedErrors && evaluation.detailedErrors.length > 0 ? (
          <div className="space-y-2.5">
            {evaluation.detailedErrors.map((err, idx) => (
              <div 
                key={idx}
                className="p-3.5 rounded-2xl bg-white border-2 border-rose-100 shadow-sm space-y-2.5 hover:border-rose-200 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-black text-xs sm:text-sm tracking-wide border border-rose-200">
                    "{err.word}"
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Từ con cần lưu ý</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 bg-rose-50/80 p-2.5 rounded-xl text-rose-950 border border-rose-200/60">
                    <span className="font-bold text-rose-700 shrink-0">📍 Sai ở đâu:</span>
                    <span className="font-medium leading-relaxed">{err.errorDetail}</span>
                  </div>
                  <div className="flex items-start gap-2 bg-emerald-50/80 p-2.5 rounded-xl text-emerald-950 border border-emerald-200/80">
                    <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-emerald-800 mr-1">🛠️ Cần sửa gì:</span>
                      <span className="font-medium leading-relaxed">{err.howToFix}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-center space-y-1.5 shadow-sm">
            <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm">
              <CheckCircle2 size={18} className="text-brand-green" />
              <span>Rất tốt! Con đọc đúng nội dung và không có lỗi sai lớn</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Con đã đọc bài rất chuẩn và tự tin. Hãy tiếp tục giữ vững phong độ nhé! 🎉
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
