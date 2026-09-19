import { useState, useRef, useCallback, useEffect } from 'react';
import { evaluateSpeech } from '../services/geminiService';
import { EnglishLevel, EvaluationResult } from '../types';
import { processRecordedAudio } from '../utils/audioUtils';

export interface UseRecorderReturn {
  isRecording: boolean;
  isEvaluating: boolean;
  evaluation: EvaluationResult | null;
  audioLevel: number; // 0 - 100
  hasDetectedVoice: boolean;
  recordedAudioUrl: string | null;
  setEvaluation: (evaluation: EvaluationResult | null) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecordedAudio: () => void;
}

export function useRecorder(
  readingText: string | null,
  level: EnglishLevel,
  setError: (error: string | null) => void
): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasDetectedVoice, setHasDetectedVoice] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Real-time audio tracking
  const hasDetectedVoiceRef = useRef(false);
  const voiceFramesCountRef = useRef(0);
  const maxObservedLevelRef = useRef(0);

  // Use refs to avoid stale closures in callbacks
  const isRecordingRef = useRef(false);
  const readingTextRef = useRef(readingText);
  const levelRef = useRef(level);

  // Keep refs in sync with props/state
  readingTextRef.current = readingText;
  levelRef.current = level;

  // Cleanup recorded audio blob URL on unmount
  useEffect(() => {
    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const clearRecordedAudio = useCallback(() => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
  }, [recordedAudioUrl]);

  const handleEvaluate = useCallback(async (audioBlob: Blob, mimeType: string) => {
    const currentText = readingTextRef.current;
    const currentLevel = levelRef.current;

    if (!currentText) {
      console.error("handleEvaluate: readingText is null, cannot evaluate");
      setIsEvaluating(false);
      setError("Không có nội dung bài đọc để chấm điểm. Vui lòng tạo bài đọc trước.");
      return;
    }

    setIsEvaluating(true);
    try {
      // ── Step 1: Decode and analyze raw recorded audio ──
      const { wavBlob, analysis } = await processRecordedAudio(audioBlob);
      console.log(`[Recorder Evaluation Check] duration=${analysis.duration.toFixed(1)}s, maxAmp=${analysis.maxAmp.toFixed(4)}, rms=${analysis.rms.toFixed(5)}, isSilent=${analysis.isSilent}`);

      // Nếu sóng âm thực tế hoàn toàn im lặng (maxAmp < 0.02)
      if (analysis.isSilent) {
        console.warn("[Recorder] Không phát hiện thấy âm thanh giọng đọc từ micro (sóng âm im lặng). TUYỆT ĐỐI KHÔNG CHẤM ĐIỂM!");
        setEvaluation({
          isComplete: false,
          isSilent: true,
          score: 0,
          missingContent: "File ghi âm hoàn toàn im lặng hoặc micro chưa thu được tiếng con đọc.",
          feedback: "Chào con, cô Lý đây! Có vẻ như micro của con chưa thu được tiếng nói (file ghi âm đang bị im lặng). Con hãy kiểm tra lại micro, đọc to rõ ràng và thử ghi âm lại một lần nữa để cô Lý lắng nghe và chấm điểm cho con nha!",
          criteriaScores: undefined,
          criteriaFeedback: undefined,
          detailedErrors: [],
          strengthsSummary: undefined,
          improvementsList: [],
          reviewItems: [],
          formattedComment: "",
          ipaAnalysis: [],
          standardSentences: [],
          personalizedExercises: [],
          strengths: [],
          improvements: []
        });
        setIsEvaluating(false);
        return;
      }

      // Cập nhật file nghe lại của học sinh bằng chuẩn WAV trong trẻo
      const playableWavUrl = URL.createObjectURL(wavBlob);
      setRecordedAudioUrl(playableWavUrl);

      // ── Step 2: Convert standard WAV to base64 ──
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            if (!base64 || base64.length < 100) {
              reject(new Error("Audio data is empty or too small. Please try recording again."));
              return;
            }
            console.log(`[Recorder] Standard WAV Base64 ready: ${base64.length} chars, mimeType=audio/wav`);
            resolve(base64);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read audio file"));
        reader.readAsDataURL(wavBlob);
      });

      // ── Step 3: Send clean WAV base64 to Gemini for evaluation ──
      const result = await evaluateSpeech(currentText, base64Audio, currentLevel, "audio/wav");
      setEvaluation(result);
      setIsEvaluating(false);
    } catch (err: any) {
      console.error("Evaluation error:", err);
      const errorMessage = err?.message || String(err);
      
      if (errorMessage === "QUOTA_EXCEEDED") {
        setError("Bạn đã hết hạn mức sử dụng (Quota) của API Key này. Vui lòng nhấn vào nút 'Cài đặt API Key' để đổi key mới hoặc thử lại sau.");
      } else if (errorMessage === "INVALID_KEY") {
        setError("API Key không hợp lệ. Vui lòng kiểm tra lại cấu hình trong 'Cài đặt API Key'.");
      } else {
        let treatedAsQuota = false;
        try {
          const parsedError = JSON.parse(errorMessage);
          if (parsedError?.error?.code === 429 || parsedError?.status === 429) {
            setError("Bạn đã hết hạn mức sử dụng (Quota) của API Key này. Vui lòng nhấn vào nút 'Cài đặt API Key' để đổi key mới.");
            treatedAsQuota = true;
          }
        } catch (e) { 
          if (errorMessage.includes('"code":429') || errorMessage.includes('"code": 429')) {
            setError("Bạn đã hết hạn mức sử dụng (Quota) của API Key này. Vui lòng nhấn vào nút 'Cài đặt API Key' để đổi key mới.");
            treatedAsQuota = true;
          }
        }

        if (!treatedAsQuota) {
          setError(`Lỗi chấm điểm: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}. (Vui lòng thử lại)`);
        }
      }
      setIsEvaluating(false);
    }
  }, [setError]);

  const startRecording = useCallback(async () => {
    try {
      // Clear previous recording audio URL
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(null);
      }

      // Reset voice tracking counters
      hasDetectedVoiceRef.current = false;
      voiceFramesCountRef.current = 0;
      maxObservedLevelRef.current = 0;
      setHasDetectedVoice(false);
      setAudioLevel(0);

      // Request audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Tắt lọc ồn triệt để tránh làm mất giọng đọc của trẻ nhỏ
          autoGainControl: true,
        } 
      });

      // Real-time audio analyser for volume meter & wave display
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          
          // Resume audio context if in suspended state
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.3;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const timeDomainData = new Uint8Array(analyser.fftSize);

          const updateVolume = () => {
            if (!isRecordingRef.current) return;
            
            // Lấy dữ liệu sóng âm thời gian thực
            analyser.getByteTimeDomainData(timeDomainData);

            let sumSquares = 0;
            let peakDeviation = 0;

            for (let i = 0; i < timeDomainData.length; i++) {
              const deviation = Math.abs(timeDomainData[i] - 128);
              if (deviation > peakDeviation) peakDeviation = deviation;
              sumSquares += deviation * deviation;
            }

            const rms = Math.sqrt(sumSquares / timeDomainData.length);
            // Đo độ lớn âm lượng chính xác từ 0 đến 100%
            const normalized = Math.min(100, Math.max(0, Math.round((rms / 35) * 100)));
            setAudioLevel(normalized);

            if (normalized > maxObservedLevelRef.current) {
              maxObservedLevelRef.current = normalized;
            }

            if (normalized >= 6) {
              voiceFramesCountRef.current += 1;
              // Chỉ xác nhận có tiếng nói khi thu được ít nhất 6 frames âm lượng (tránh nhận nhầm tiếng click chuột)
              if (voiceFramesCountRef.current >= 6) {
                hasDetectedVoiceRef.current = true;
                setHasDetectedVoice(true);
              }
            }

            animFrameRef.current = requestAnimationFrame(updateVolume);
          };

          animFrameRef.current = requestAnimationFrame(updateVolume);
        }
      } catch (err) {
        console.warn("[Recorder] AudioContext visualizer could not be started:", err);
      }

      // Choose the best MIME type supported by this browser
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
      ];
      const supportedType = preferredTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
      console.log('[Recorder] MediaRecorder MIME type:', supportedType || 'browser default');

      const recorderOptions: MediaRecorderOptions = {};
      if (supportedType) {
        recorderOptions.mimeType = supportedType;
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
          }
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
          }
          setAudioLevel(0);

          const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
          console.log(`[Recorder] Recording duration: ${duration.toFixed(1)}s, chunks: ${audioChunksRef.current.length}`);

          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          console.log(`[Recorder] Recording stopped: ${audioBlob.size} bytes, ${mimeType}`);

          // Create local playable URL so user can listen to their recording
          const localAudioUrl = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(localAudioUrl);

          // Check if recording is way too short (< 1.2s)
          if (duration < 1.2) {
            setEvaluation({
              isComplete: false,
              isSilent: true,
              score: 0,
              missingContent: "Đoạn ghi âm quá ngắn (chưa đầy 1 giây).",
              feedback: "Chào con, cô Lý đây! Đoạn ghi âm của con hơi ngắn nên cô chưa nghe kịp. Con hãy đọc hết bài đọc rồi hãy nhấn nút Dừng nhé!",
              criteriaScores: undefined,
              criteriaFeedback: undefined,
              detailedErrors: [],
              strengthsSummary: undefined,
              improvementsList: [],
              reviewItems: [],
              formattedComment: "",
              ipaAnalysis: [],
              standardSentences: [],
              personalizedExercises: [],
              strengths: [],
              improvements: []
            });
            setIsEvaluating(false);
            return;
          }

          if (audioBlob.size < 100) {
            console.error("[Recorder] Audio blob is too small:", audioBlob.size);
            setError("Không thu được âm thanh. Vui lòng kiểm tra micro và thử lại.");
            setIsEvaluating(false);
            return;
          }

          await handleEvaluate(audioBlob, mimeType);
        } catch (err: any) {
          console.error("[Recorder] Error in onstop handler:", err);
          setError("Có lỗi xảy ra khi xử lý audio. Vui lòng thử lại.");
          setIsEvaluating(false);
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      // Emit chunk every 250ms so data is flushed continuously
      mediaRecorder.start(250);
      recordingStartTimeRef.current = Date.now();
      isRecordingRef.current = true;
      setIsRecording(true);
      setEvaluation(null);
      setError(null);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      const isPermissionError = 
        err.name === 'NotAllowedError' || 
        err.name === 'PermissionDeniedError' || 
        (err.message && err.message.toLowerCase().includes('permission denied'));

      if (isPermissionError) {
        setError("Không thể truy cập micro. Bạn vui lòng: \n1. Nhấn 'Cho phép' khi trình duyệt yêu cầu.\n2. Kiểm tra cài đặt quyền truy cập micro của trình duyệt.\n3. Nhấn nút 'Mở trong tab mới' (góc trên bên phải) để ứng dụng hoạt động tốt nhất.");
      } else {
        setError(`Lỗi micro: ${err.message || "Vui lòng kiểm tra lại thiết bị của bạn."}`);
      }
    }
  }, [handleEvaluate, recordedAudioUrl, setError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      setIsEvaluating(true);
      
      setTimeout(() => {
        const recorder = mediaRecorderRef.current;
        if (recorder) {
          if (recorder.state === 'recording') {
            recorder.stop();
          } else if (recorder.state === 'paused') {
            recorder.resume();
            recorder.stop();
          } else {
            console.warn("[Recorder] MediaRecorder already inactive, state:", recorder.state);
            setIsEvaluating(false);
          }
        } else {
          setIsEvaluating(false);
        }
        isRecordingRef.current = false;
        setIsRecording(false);
      }, 200);
    }
  }, []);

  return {
    isRecording,
    isEvaluating,
    evaluation,
    audioLevel,
    hasDetectedVoice,
    recordedAudioUrl,
    setEvaluation,
    startRecording,
    stopRecording,
    clearRecordedAudio,
  };
}
