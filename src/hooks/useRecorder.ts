import { useState, useRef, useCallback, useEffect } from 'react';
import { evaluateSpeech } from '../services/geminiService';
import { EnglishLevel, EvaluationResult } from '../types';
import { startPcmRecorder, PcmRecorderHandle, processRecordedAudio } from '../utils/audioUtils';

export interface UseRecorderReturn {
  isRecording: boolean;
  isEvaluating: boolean;
  evaluation: EvaluationResult | null;
  audioLevel: number; // 0–100
  hasDetectedVoice: boolean;
  recordedAudioUrl: string | null;
  setEvaluation: (evaluation: EvaluationResult | null) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecordedAudio: () => void;
}

type RecordingMode = 'pcm' | 'mediarecorder' | null;

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

  // Recording state refs
  const pcmRecorderRef = useRef<PcmRecorderHandle | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordingModeRef = useRef<RecordingMode>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Timing
  const recordingStartTimeRef = useRef<number>(0);

  // Visualizer
  const animFrameRef = useRef<number | null>(null);
  const vizAudioCtxRef = useRef<AudioContext | null>(null);

  // Voice detection
  const hasDetectedVoiceRef = useRef(false);
  const voiceFramesCountRef = useRef(0);
  const maxObservedLevelRef = useRef(0);
  const isRecordingRef = useRef(false);

  // Keep latest props accessible in callbacks without re-creating them
  const readingTextRef = useRef(readingText);
  const levelRef = useRef(level);
  readingTextRef.current = readingText;
  levelRef.current = level;

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (vizAudioCtxRef.current && vizAudioCtxRef.current.state !== 'closed') {
        vizAudioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const clearRecordedAudio = useCallback(() => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
  }, [recordedAudioUrl]);

  // ── Silent EvaluationResult factory ────────────────────────────────────────
  const makeSilentResult = (msg: string, feedback: string): EvaluationResult => ({
    isComplete: false,
    isSilent: true,
    score: 0,
    missingContent: msg,
    feedback,
    criteriaScores: undefined,
    criteriaFeedback: undefined,
    detailedErrors: [],
    strengthsSummary: undefined,
    improvementsList: [],
    reviewItems: [],
    formattedComment: '',
    ipaAnalysis: [],
    standardSentences: [],
    personalizedExercises: [],
    strengths: [],
    improvements: [],
  });

  // ── Core evaluation: WAV Blob → base64 → Gemini ────────────────────────────
  const handleEvaluateWav = useCallback(async (wavBlob: Blob, durationSecs: number) => {
    const currentText = readingTextRef.current;
    const currentLevel = levelRef.current;

    if (!currentText) {
      setIsEvaluating(false);
      setError('Không có nội dung bài đọc để chấm điểm. Vui lòng tạo bài đọc trước.');
      return;
    }

    // Cho nghe lại bản WAV chuẩn
    const playableUrl = URL.createObjectURL(wavBlob);
    setRecordedAudioUrl(playableUrl);

    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const b64 = result.split(',')[1];
          if (!b64 || b64.length < 50) {
            reject(new Error('Audio data quá nhỏ — hãy ghi âm lại.'));
          } else {
            console.log(`[Recorder] WAV→base64: ${b64.length} chars, duration=${durationSecs.toFixed(1)}s`);
            resolve(b64);
          }
        };
        reader.onerror = () => reject(new Error('Không đọc được file âm thanh'));
        reader.readAsDataURL(wavBlob);
      });

      const result = await evaluateSpeech(currentText, base64Audio, currentLevel, 'audio/wav');
      setEvaluation(result);
      setIsEvaluating(false);
    } catch (err: any) {
      console.error('Evaluation error:', err);
      const msg = err?.message || String(err);

      if (msg === 'QUOTA_EXCEEDED') {
        setError("Bạn đã hết hạn mức sử dụng (Quota). Vui lòng đổi API Key mới.");
      } else if (msg === 'INVALID_KEY') {
        setError("API Key không hợp lệ. Vui lòng kiểm tra lại trong 'Cài đặt API Key'.");
      } else {
        let isQuota = false;
        try {
          const p = JSON.parse(msg);
          if (p?.error?.code === 429 || p?.status === 429) { setError("Hết quota API Key. Vui lòng đổi key mới."); isQuota = true; }
        } catch (_) {
          if (msg.includes('"code":429') || msg.includes('"code": 429')) { setError("Hết quota API Key. Vui lòng đổi key mới."); isQuota = true; }
        }
        if (!isQuota) setError(`Lỗi chấm điểm: ${msg.substring(0, 120)}. (Vui lòng thử lại)`);
      }
      setIsEvaluating(false);
    }
  }, [setError]);

  // ── Stop visualizer ─────────────────────────────────────────────────────────
  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (vizAudioCtxRef.current && vizAudioCtxRef.current.state !== 'closed') {
      vizAudioCtxRef.current.close().catch(() => {});
      vizAudioCtxRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // ── Start Recording ─────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      // Clear previous blob URL
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(null);
      }

      // Reset trackers
      hasDetectedVoiceRef.current = false;
      voiceFramesCountRef.current = 0;
      maxObservedLevelRef.current = 0;
      setHasDetectedVoice(false);
      setAudioLevel(0);
      recordingModeRef.current = null;

      // Request mic
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,  // Giữ nguyên giọng trẻ nhỏ
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // ── Ưu tiên: PCM recorder ──────────────────────────────────────────────
      let pcmStarted = false;
      try {
        const handle = startPcmRecorder(stream);
        pcmRecorderRef.current = handle;
        recordingModeRef.current = 'pcm';
        pcmStarted = true;
        console.log('[Recorder] Mode: PCM (direct WAV)');
      } catch (pcmErr) {
        console.warn('[Recorder] PCM recorder failed, switching to MediaRecorder:', pcmErr);
      }

      // ── Dự phòng: MediaRecorder ────────────────────────────────────────────
      if (!pcmStarted) {
        const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
        const supportedMime = preferred.find(t => MediaRecorder.isTypeSupported(t)) || '';
        console.log('[Recorder] Mode: MediaRecorder, mimeType:', supportedMime || '(browser default)');

        const opts: MediaRecorderOptions = supportedMime ? { mimeType: supportedMime } : {};
        const mr = new MediaRecorder(stream, opts);
        mediaRecorderRef.current = mr;
        mediaChunksRef.current = [];

        mr.ondataavailable = (e) => { if (e.data?.size > 0) mediaChunksRef.current.push(e.data); };
        mr.start(250);
        recordingModeRef.current = 'mediarecorder';
      }

      // ── Visualizer (AudioContext riêng biệt) ───────────────────────────────
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const vizCtx = new AudioContextClass() as AudioContext;
        if (vizCtx.state === 'suspended') await vizCtx.resume();
        vizAudioCtxRef.current = vizCtx;

        const analyser = vizCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.3;
        vizCtx.createMediaStreamSource(stream).connect(analyser);

        const buf = new Uint8Array(analyser.fftSize);
        const tick = () => {
          if (!isRecordingRef.current) return;
          analyser.getByteTimeDomainData(buf);
          let sq = 0;
          for (let i = 0; i < buf.length; i++) { const d = buf[i] - 128; sq += d * d; }
          const rms = Math.sqrt(sq / buf.length);
          const level = Math.min(100, Math.max(0, Math.round((rms / 35) * 100)));
          setAudioLevel(level);
          if (level > maxObservedLevelRef.current) maxObservedLevelRef.current = level;
          if (level >= 6) {
            voiceFramesCountRef.current++;
            if (voiceFramesCountRef.current >= 6) { hasDetectedVoiceRef.current = true; setHasDetectedVoice(true); }
          }
          animFrameRef.current = requestAnimationFrame(tick);
        };
        animFrameRef.current = requestAnimationFrame(tick);
      } catch (vizErr) {
        console.warn('[Recorder] Visualizer could not start:', vizErr);
      }

      recordingStartTimeRef.current = Date.now();
      isRecordingRef.current = true;
      setIsRecording(true);
      setEvaluation(null);
      setError(null);
    } catch (err: any) {
      console.error('Microphone error:', err);
      const isPermission = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
        || (err.message && err.message.toLowerCase().includes('permission'));
      if (isPermission) {
        setError("Không thể truy cập micro. Vui lòng cho phép quyền micro và thử lại.");
      } else {
        setError(`Lỗi micro: ${err.message || 'Kiểm tra lại thiết bị.'}`);
      }
    }
  }, [handleEvaluateWav, recordedAudioUrl, setError, stopVisualizer]);

  // ── Stop Recording ──────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;

    isRecordingRef.current = false;
    setIsRecording(false);
    setIsEvaluating(true);
    stopVisualizer();

    const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
    const mode = recordingModeRef.current;
    console.log(`[Recorder] Stop — mode=${mode}, duration=${duration.toFixed(1)}s`);

    const stopStream = () => streamRef.current?.getTracks().forEach(t => t.stop());

    // Quá ngắn
    if (duration < 1.2) {
      stopStream();
      setEvaluation(makeSilentResult(
        'Đoạn ghi âm quá ngắn.',
        'Chào con, cô Lý đây! Đoạn ghi âm của con hơi ngắn nên cô chưa nghe kịp. Con hãy đọc hết bài rồi nhấn Dừng nhé!'
      ));
      setIsEvaluating(false);
      return;
    }

    if (mode === 'pcm' && pcmRecorderRef.current) {
      // ── PCM path ────────────────────────────────────────────────────────────
      try {
        const { wavBlob, analysis } = pcmRecorderRef.current.stop();
        pcmRecorderRef.current = null;
        stopStream();

        console.log(`[PCM] WAV size=${wavBlob.size}B, maxAmp=${analysis.maxAmp.toFixed(4)}, isSilent=${analysis.isSilent}`);

        if (analysis.isSilent) {
          setEvaluation(makeSilentResult(
            'File ghi âm im lặng hoặc micro chưa thu được tiếng.',
            'Chào con, cô Lý đây! Có vẻ micro chưa thu được tiếng của con. Con hãy kiểm tra lại micro và thử ghi âm lại nhé!'
          ));
          setIsEvaluating(false);
          return;
        }

        handleEvaluateWav(wavBlob, duration);
      } catch (err) {
        console.error('[PCM] Stop error:', err);
        stopStream();
        setError('Có lỗi khi xử lý âm thanh. Vui lòng thử lại.');
        setIsEvaluating(false);
      }
    } else if (mode === 'mediarecorder' && mediaRecorderRef.current) {
      // ── MediaRecorder path ──────────────────────────────────────────────────
      const mr = mediaRecorderRef.current;

      mr.onstop = async () => {
        try {
          stopStream();
          const mimeType = mr.mimeType || 'audio/webm';
          const blob = new Blob(mediaChunksRef.current, { type: mimeType });
          console.log(`[MediaRecorder] blob=${blob.size}B, mime=${mimeType}`);

          if (blob.size < 100) {
            setError('Không thu được âm thanh. Kiểm tra micro và thử lại.');
            setIsEvaluating(false);
            return;
          }

          const { wavBlob, analysis } = await processRecordedAudio(blob);
          console.log(`[MediaRecorder] WAV size=${wavBlob.size}B, isSilent=${analysis.isSilent}`);

          if (analysis.isSilent) {
            setEvaluation(makeSilentResult(
              'File ghi âm im lặng hoặc micro chưa thu được tiếng.',
              'Chào con, cô Lý đây! Có vẻ micro chưa thu tiếng. Con hãy kiểm tra micro và thử lại nhé!'
            ));
            setIsEvaluating(false);
            return;
          }

          await handleEvaluateWav(wavBlob, duration);
        } catch (err: any) {
          console.error('[MediaRecorder] onstop error:', err);
          setError('Có lỗi xử lý audio. Vui lòng thử lại.');
          setIsEvaluating(false);
        }
      };

      setTimeout(() => {
        if (mr.state === 'recording') mr.stop();
        else if (mr.state === 'paused') { mr.resume(); mr.stop(); }
        else { setError('Không thể dừng ghi âm. Vui lòng thử lại.'); setIsEvaluating(false); }
      }, 200);
    } else {
      stopStream();
      setError('Chưa có phiên ghi âm nào. Vui lòng thử lại.');
      setIsEvaluating(false);
    }
  }, [handleEvaluateWav, setError, stopVisualizer]);

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
