import React from 'react';
import { Mic, Square, RefreshCw, Star, Trophy } from 'lucide-react';
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
            {!evaluation.isComplete ? (
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

const CompleteResult: React.FC<{
  evaluation: EvaluationResult;
  startRecording: () => Promise<void>;
}> = ({ evaluation, startRecording }) => {
  // Compute total score as average of 5 criteria (client-side verification)
  const displayScore = evaluation.criteriaScores 
    ? computeTotalFromCriteria(evaluation.criteriaScores) 
    : evaluation.score;

  return (
    <>
      {/* Score - without CEFR badge */}
      <div className="flex items-center justify-between bg-gradient-to-br from-white to-emerald-50 p-4 sm:p-6 rounded-2xl border-2 border-emerald-200 shadow-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-yellow rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-yellow/20 rotate-3">
            <Star size={28} fill="currentColor" />
          </div>
          <div>
            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Tổng điểm</div>
            <div className="flex items-center gap-3">
              <div className="text-3xl sm:text-4xl font-black text-emerald-700">{displayScore}</div>
            </div>
          </div>
        </div>
        <button onClick={startRecording} className="px-3 sm:px-4 py-2 bg-white text-emerald-600 border-2 border-emerald-100 rounded-xl font-bold text-xs sm:text-sm hover:border-brand-green transition-all shadow-sm active:scale-95">Thử lại</button>
      </div>

      {/* Criteria Scores */}
      {evaluation.criteriaScores && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Tiêu chí chấm điểm</span>
            <span className="text-[9px] font-medium text-slate-400 italic">Điều kiện: Đọc đủ & đúng 100% nội dung</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 bg-white p-3 sm:p-4 rounded-2xl border-2 border-emerald-50 shadow-sm">
            {Object.entries(evaluation.criteriaScores).map(([key, score]) => (
              <div key={key} className="text-center p-2 sm:p-3 rounded-xl bg-emerald-50/30 border border-emerald-100">
                <div className="text-[8px] sm:text-[9px] font-bold text-emerald-400 uppercase leading-tight mb-1">
                  {key === 'pronunciation' ? 'Phát âm' : key === 'stress' ? 'Trọng âm' : key === 'intonation' ? 'Ngữ điệu' : key === 'fluency' ? 'Trôi chảy' : 'Nối âm'}
                </div>
                <div className="text-lg font-black text-emerald-600">{score}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
