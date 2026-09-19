import React, { useState } from 'react';
import { 
  Mic, 
  MicOff,
  Square, 
  RefreshCw, 
  Star, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Play,
  Pause,
  Volume2,
  Copy,
  Check,
  Award,
  BookOpen,
  MessageSquareHeart,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { EvaluationResult } from '../types';
import { computeTotalFromCriteria, buildFormattedComment } from '../services/geminiService';

interface SpeechEvaluatorProps {
  readingText: string | null;
  isRecording: boolean;
  isEvaluating: boolean;
  evaluation: EvaluationResult | null;
  audioLevel?: number;
  hasDetectedVoice?: boolean;
  recordedAudioUrl?: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export const SpeechEvaluator: React.FC<SpeechEvaluatorProps> = ({
  readingText, isRecording, isEvaluating, evaluation,
  audioLevel = 0, hasDetectedVoice = false, recordedAudioUrl,
  startRecording, stopRecording
}) => {
  if (!readingText) return null;

  // Quyết định hiển thị Incomplete hay Complete
  const isIncomplete = !evaluation || !evaluation.isComplete || evaluation.isSilent || (!evaluation.score || evaluation.score === 0);

  return (
    <div className="w-full max-w-[620px] mt-1 space-y-2">
      <div className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 shadow-xs">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
          <Mic size={16} className="text-emerald-500" />
          <span>Ms Lý: Luyện nói cùng cô giáo</span>
        </div>
        
        {/* Nút Bắt đầu ghi âm khi chưa có kết quả và chưa ghi âm */}
        {!evaluation && !isEvaluating && !isRecording && (
          <button
            onClick={startRecording}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-white transition-all shadow-xl text-sm sm:text-base bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-1 active:scale-95"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            <Mic size={20} />
            Bắt đầu luyện nói
          </button>
        )}

        {/* Trạng thái Đang ghi âm với thanh đo âm lượng trực quan */}
        {isRecording && !isEvaluating && (
          <div className="flex flex-col items-center gap-3 w-full max-w-sm p-4 bg-white rounded-2xl border-2 border-red-200 shadow-sm">
            {/* Live Volume Wave Visualizer */}
            <div className="flex items-center gap-1.5 h-8 justify-center w-full">
              {[0.4, 0.7, 1.0, 0.6, 0.9, 1.1, 0.8, 0.5].map((factor, i) => {
                const height = Math.max(6, Math.min(32, Math.round(audioLevel * factor * 0.4)));
                const isGreen = audioLevel > 8 || hasDetectedVoice;
                return (
                  <div
                    key={i}
                    className="w-2 rounded-full transition-all duration-75"
                    style={{
                      height: `${height}px`,
                      backgroundColor: isGreen ? '#10b981' : '#f87171',
                    }}
                  />
                );
              })}
            </div>

            <div className="text-center">
              <span className={`text-xs font-bold ${audioLevel > 8 || hasDetectedVoice ? 'text-emerald-600' : 'text-amber-600'}`}>
                {audioLevel > 8 || hasDetectedVoice
                  ? '🟢 Đang nhận giọng đọc rất tốt...'
                  : '⚠️ Con hãy nói to rõ vào micro nhé!'}
              </span>
            </div>

            <button
              onClick={stopRecording}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-white transition-all shadow-xl text-sm sm:text-base bg-red-500 hover:bg-red-600 active:scale-95"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            >
              <Square size={18} fill="currentColor" />
              Dừng & Chấm điểm
            </button>
            <p className="text-[10px] text-slate-400 font-medium text-center">
              Sau khi đọc xong câu cuối, con chờ 1 giây rồi hãy nhấn nút Dừng nhé!
            </p>
          </div>
        )}

        {/* Trạng thái Đang chấm điểm */}
        {isEvaluating && (
          <div className="flex flex-col items-center gap-3 py-4 animate-pulse">
            <RefreshCw className="animate-spin text-brand-green" size={32} />
            <div className="text-center">
              <p className="text-sm font-black text-brand-green">Cô Lý đang nghe và chấm điểm cho con nhé...</p>
              <p className="text-[10px] text-slate-400 font-medium">Bé chờ cô một chút xíu thôi!</p>
            </div>
          </div>
        )}

        {/* Hiển thị kết quả */}
        {evaluation && !isEvaluating && !isRecording && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-4">
            {isIncomplete ? (
              <IncompleteResult 
                evaluation={evaluation} 
                startRecording={startRecording}
                recordedAudioUrl={recordedAudioUrl}
              />
            ) : (
              <CompleteResult 
                evaluation={evaluation} 
                startRecording={startRecording}
                recordedAudioUrl={recordedAudioUrl}
              />
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

/** Bộ phát âm thanh để học sinh nghe lại bản thu âm của mình */
const StudentAudioPlayer: React.FC<{ audioUrl: string }> = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 px-4 bg-white/95 border border-slate-200 rounded-xl text-xs shadow-xs">
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      <div className="flex items-center gap-2 text-slate-700 font-semibold">
        <Volume2 size={16} className="text-emerald-600" />
        <span>Nghe lại bản thu âm của con:</span>
      </div>
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold hover:bg-emerald-100 transition-all shadow-xs"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        <span>{isPlaying ? "Dừng" : "Phát lại"}</span>
      </button>
    </div>
  );
};

/** Giao diện khi file âm thanh bị lỗi/im lặng hoặc chưa đọc đủ bài */
const IncompleteResult: React.FC<{ 
  evaluation: EvaluationResult; 
  startRecording: () => Promise<void>;
  recordedAudioUrl?: string | null;
}> = ({ evaluation, startRecording, recordedAudioUrl }) => (
  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5 rounded-2xl border-2 border-amber-200 shadow-sm space-y-3.5">
    <div className="flex items-center gap-3 text-amber-800">
      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 shadow-sm shrink-0">
        <MicOff size={20} />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">CHƯA NHẬN ĐƯỢC ÂM THANH — KHÔNG CHẤM ĐIỂM</div>
        <div className="text-sm font-bold text-amber-950">Cô Lý chưa thể nghe thấy giọng đọc của con</div>
      </div>
    </div>

    <div className="p-3.5 bg-white/80 rounded-xl border border-amber-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium italic">
      "{evaluation.feedback}"
    </div>

    <div className="p-2.5 bg-amber-100/70 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium space-y-1">
      <div className="flex items-center gap-1.5 font-bold text-amber-950">
        <span>⚠️ Quy định chấm điểm:</span>
        <span>Hệ thống tuyệt đối không chấm điểm khi không nhận diện được âm thanh giọng đọc của con.</span>
      </div>
      <p className="text-[11px] text-amber-800/90 pl-5">
        Bé hãy kiểm tra micro thiết bị (bật âm lượng, cấp quyền micro), sau đó đọc to rõ ràng và bấm nút dưới đây để đọc lại nhé!
      </p>
    </div>

    {recordedAudioUrl && (
      <StudentAudioPlayer audioUrl={recordedAudioUrl} />
    )}

    <div className="pt-1">
      <button 
        onClick={startRecording} 
        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-brand-green text-white rounded-xl font-black text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
      >
        <RefreshCw size={16} />
        <span>Thử ghi âm lại ngay</span>
      </button>
    </div>
  </div>
);

/** Giao diện hiển thị nhận xét hoàn chỉnh chuẩn 100% theo mẫu của Cô Lý */
const CompleteResult: React.FC<{
  evaluation: EvaluationResult;
  startRecording: () => Promise<void>;
  recordedAudioUrl?: string | null;
}> = ({ evaluation, startRecording, recordedAudioUrl }) => {
  const [copied, setCopied] = useState(false);

  // Điểm tổng: hiển thị điểm tổng duy nhất
  const displayScore = typeof evaluation.score === 'number' && evaluation.score > 0
    ? evaluation.score 
    : (evaluation.criteriaScores ? computeTotalFromCriteria(evaluation.criteriaScores) : 0);

  const criteria = evaluation.criteriaScores || {
    pronunciation: displayScore,
    fluency: displayScore,
    intonation: displayScore,
    grammar: displayScore
  };

  const attitudeText = evaluation.strengthsSummary?.attitude || "Con rất tự tin, giọng đọc to, rõ ràng.";
  const goodWords = evaluation.strengthsSummary?.goodWords || [];
  const improvements = evaluation.improvementsList || [];
  const reviewItems = evaluation.reviewItems || [];

  const handleCopyComment = async () => {
    try {
      const fullText = buildFormattedComment(evaluation);
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* 1. Thanh Tổng Điểm & Nút Hành Động */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gradient-to-br from-white to-emerald-50/80 p-4 sm:p-5 rounded-2xl border-2 border-emerald-200 shadow-md">
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

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Nút Sao chép mẫu nhận xét gửi phụ huynh */}
          <button
            onClick={handleCopyComment}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
            }`}
            title="Sao chép toàn bộ nhận xét theo mẫu để gửi phụ huynh trên Zalo/tin nhắn"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? 'Đã sao chép!' : 'Sao chép nhận xét'}</span>
          </button>

          <button 
            onClick={startRecording} 
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white text-slate-700 border-2 border-slate-200 rounded-xl font-bold text-xs sm:text-sm hover:border-brand-green hover:text-brand-green transition-all shadow-xs active:scale-95"
          >
            <RefreshCw size={14} />
            <span>Luyện lại</span>
          </button>
        </div>
      </div>

      {/* 2. Lời chào gửi bố mẹ */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-100 rounded-2xl shadow-2xs space-y-1">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm">
          <MessageSquareHeart size={18} className="text-rose-500 shrink-0" />
          <span>Cô Lý cảm ơn bố/mẹ ạ! ❤️ Cô đã nhận được video luyện của con rồi ạ!</span>
        </div>
        <p className="text-xs text-emerald-950 font-medium pl-6">
          Cô xin gửi lại bố/mẹ nhận xét bài của con như sau:
        </p>
      </div>

      {/* 3. Nghe lại bản thu âm của học sinh nếu có */}
      {recordedAudioUrl && (
        <StudentAudioPlayer audioUrl={recordedAudioUrl} />
      )}

      {/* 3b. 🎙️ NỘI DUNG CÔ LÝ NGHE ĐƯỢC (transcribedText) */}
      {evaluation.transcribedText && evaluation.transcribedText.trim().length > 3 && (
        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-blue-800 font-black text-xs sm:text-sm uppercase tracking-wider">
            <FileText size={18} className="text-blue-500" />
            <span>🎙️ Cô Lý nghe con đọc:</span>
          </div>
          <p className="text-xs sm:text-sm text-blue-950 font-medium pl-2 leading-relaxed italic">
            "{evaluation.transcribedText.trim()}"
          </p>
        </div>
      )}

      {/* 4. 🌟 ƯU ĐIỂM */}
      <div className="p-4 bg-white border-2 border-emerald-200 rounded-2xl shadow-xs space-y-2.5">
        <div className="flex items-center gap-2 text-emerald-800 font-black text-xs sm:text-sm uppercase tracking-wider">
          <Sparkles size={18} className="text-amber-500" />
          <span>🌟 Ưu điểm:</span>
        </div>
        <div className="space-y-1.5 text-xs sm:text-sm pl-2">
          <div className="flex items-start gap-1.5 text-slate-800 font-medium">
            <span className="text-emerald-600 font-black">◦</span>
            <div>
              <span className="font-bold text-emerald-900">Phong thái:</span> {attitudeText}
            </div>
          </div>

          {goodWords.length > 0 && (
            <div className="flex items-start gap-1.5 text-slate-800 font-medium">
              <span className="text-emerald-600 font-black">◦</span>
              <div className="flex-1">
                <span className="font-bold text-emerald-900 mr-1.5">Phát âm tốt:</span>
                <div className="inline-flex flex-wrap gap-1.5 mt-0.5">
                  {goodWords.map((word, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200 font-bold text-xs">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. 📝 ĐIỂM CẦN CẢI THIỆN */}
      <div className="p-4 bg-white border-2 border-amber-200 rounded-2xl shadow-xs space-y-2.5">
        <div className="flex items-center gap-2 text-amber-900 font-black text-xs sm:text-sm uppercase tracking-wider">
          <AlertCircle size={18} className="text-amber-600" />
          <span>📝 Điểm cần cải thiện:</span>
        </div>

        {improvements.length > 0 ? (
          <div className="space-y-2 text-xs sm:text-sm pl-2">
            {improvements.map((item, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-slate-800 font-medium">
                <span className="text-amber-600 font-black">◦</span>
                <div className="leading-relaxed">
                  <span className="font-black text-rose-700 mr-1">{item.word}</span>
                  {item.ipa && (
                    <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 text-xs font-semibold mr-1.5">
                      /{item.ipa.replace(/^\/|\/$/g, '')}/
                    </span>
                  )}
                  <span>: {item.detail}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium pl-2">
            <CheckCircle2 size={16} className="text-brand-green" />
            <span>Con phát âm rất tốt các từ trong bài, cố gắng phát huy nhé! 🎉</span>
          </div>
        )}
      </div>

      {/* 6. 📊 ĐÁNH GIÁ (TIÊU CHÍ) */}
      <div className="p-4 bg-white border-2 border-indigo-100 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-900 font-black text-xs sm:text-sm uppercase tracking-wider">
            <Award size={18} className="text-indigo-600" />
            <span>📊 Đánh giá:</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold italic">Thang điểm 10</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
            <div className="text-[11px] font-bold text-slate-500">🗣️ Phát âm</div>
            <div className="text-lg font-black text-indigo-700">{criteria.pronunciation || displayScore}<span className="text-xs text-slate-400">/10</span></div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
            <div className="text-[11px] font-bold text-slate-500">🌊 Trôi chảy</div>
            <div className="text-lg font-black text-emerald-700">{criteria.fluency || displayScore}<span className="text-xs text-slate-400">/10</span></div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
            <div className="text-[11px] font-bold text-slate-500">🎵 Ngữ điệu</div>
            <div className="text-lg font-black text-amber-700">{criteria.intonation || displayScore}<span className="text-xs text-slate-400">/10</span></div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
            <div className="text-[11px] font-bold text-slate-500">📖 Ngữ pháp</div>
            <div className="text-lg font-black text-purple-700">{criteria.grammar || displayScore}<span className="text-xs text-slate-400">/10</span></div>
          </div>
        </div>
      </div>

      {/* 7. 📚 CON CẦN ÔN THÊM (NẾU CÓ) */}
      {reviewItems.length > 0 && (
        <div className="p-4 bg-white border-2 border-purple-200 rounded-2xl shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-purple-900 font-black text-xs sm:text-sm uppercase tracking-wider">
            <BookOpen size={18} className="text-purple-600" />
            <span>📚 Con cần ôn thêm:</span>
          </div>
          <div className="space-y-2 text-xs sm:text-sm pl-2">
            {reviewItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-slate-800 font-medium">
                <span className="text-purple-600 font-black">◦</span>
                <div className="leading-relaxed">
                  <span className="text-rose-600 line-through mr-1 font-semibold">{item.original}</span>
                  <span className="text-slate-400 mr-1">→</span>
                  <span className="text-emerald-700 font-bold">sửa đúng thành: {item.corrected}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Lời nhắn gửi yêu thương của cô Lý */}
      <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-950 font-medium space-y-1 text-center">
        <p>Cô mong con tiếp tục cố gắng và duy trì tinh thần học tập thật tốt nhé! ❤️</p>
        <p className="text-rose-800/80 font-bold">Cô xin cảm ơn bố mẹ đã luôn đồng hành cùng cô và con ạ!</p>
      </div>
    </div>
  );
};
