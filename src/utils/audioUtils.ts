/**
 * Audio Utilities for Speaking Ms Lý — v4
 *
 * Chiến lược ghi âm:
 * - Dùng ScriptProcessorNode thu PCM Float32 trực tiếp (không qua WebM)
 * - AudioContext dùng sample rate mặc định của browser (48000 / 44100Hz)
 * - Resample về 16kHz khi build WAV để gửi Gemini
 * - KHÔNG kết nối processor → destination (tránh feedback / block)
 *   → dùng GainNode gain=0 để processor vẫn fire onaudioprocess
 */

export interface AudioAnalysis {
  maxAmp: number;
  rms: number;
  isSilent: boolean;
  duration: number;
}

export interface PcmRecorderHandle {
  stop: () => { wavBlob: Blob; analysis: AudioAnalysis };
}

/**
 * Bắt đầu ghi âm PCM trực tiếp.
 * - Dùng sample rate tự nhiên của browser (thường 48000Hz).
 * - ScriptProcessorNode được kết nối qua GainNode gain=0 → không phát ra loa,
 *   nhưng onaudioprocess vẫn được trình duyệt gọi đều đặn.
 * - Khi stop(): resample về 16kHz rồi encode WAV 16-bit.
 */
export function startPcmRecorder(stream: MediaStream): PcmRecorderHandle {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  // Dùng sample rate mặc định, KHÔNG đặt sampleRate tùy chỉnh
  const audioCtx = new AudioContextClass() as AudioContext;
  const nativeSampleRate = audioCtx.sampleRate;
  console.log(`[PCM Recorder] AudioContext sampleRate=${nativeSampleRate}Hz`);

  const source = audioCtx.createMediaStreamSource(stream);

  // ScriptProcessorNode (1 kênh vào, 1 kênh ra)
  const bufferSize = 4096;
  const processor = (audioCtx as any).createScriptProcessor(bufferSize, 1, 1) as ScriptProcessorNode;

  // GainNode gain=0: kết nối processor → silent destination
  // Điều này bắt buộc để onaudioprocess luôn được gọi trên mọi trình duyệt
  const silentGain = audioCtx.createGain();
  silentGain.gain.value = 0;

  const pcmChunks: Float32Array[] = [];

  processor.onaudioprocess = (event: AudioProcessingEvent) => {
    const input = event.inputBuffer.getChannelData(0);
    // Sao chép ngay, vì buffer bị tái sử dụng sau khi callback return
    pcmChunks.push(new Float32Array(input));
  };

  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(audioCtx.destination);

  return {
    stop: () => {
      // Ngắt kết nối
      try { processor.disconnect(); } catch (_) {}
      try { source.disconnect(); } catch (_) {}
      try { silentGain.disconnect(); } catch (_) {}
      audioCtx.close().catch(() => {});

      // Nối tất cả chunks thành mảng liên tục
      const totalLength = pcmChunks.reduce((acc, c) => acc + c.length, 0);
      const rawPcm = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of pcmChunks) {
        rawPcm.set(chunk, offset);
        offset += chunk.length;
      }

      // Resample từ native rate → 16kHz
      const targetRate = 16000;
      const pcm16k = resamplePcm(rawPcm, nativeSampleRate, targetRate);

      const analysis = analyzePcm(pcm16k, targetRate);
      const wavBlob = pcmToWav(pcm16k, targetRate);

      return { wavBlob, analysis };
    },
  };
}

/** Resample PCM Float32 từ srcRate → dstRate (nearest-neighbor) */
function resamplePcm(input: Float32Array, srcRate: number, dstRate: number): Float32Array {
  if (srcRate === dstRate) return input;
  const ratio = srcRate / dstRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    output[i] = input[Math.min(Math.floor(i * ratio), input.length - 1)];
  }
  return output;
}

/** Phân tích biên độ PCM để phát hiện im lặng */
function analyzePcm(pcmData: Float32Array, sampleRate: number): AudioAnalysis {
  let maxAmp = 0;
  let sumSquares = 0;
  let voiceSamples = 0;

  for (let i = 0; i < pcmData.length; i++) {
    const amp = Math.abs(pcmData[i]);
    if (amp > maxAmp) maxAmp = amp;
    sumSquares += amp * amp;
    if (amp > 0.02) voiceSamples++;
  }

  const rms = pcmData.length > 0 ? Math.sqrt(sumSquares / pcmData.length) : 0;
  const voiceRatio = pcmData.length > 0 ? voiceSamples / pcmData.length : 0;
  const duration = pcmData.length / sampleRate;

  // Im lặng: đỉnh < 0.015 HOẶC (tỉ lệ giọng nói < 0.5% VÀ rms rất thấp)
  const isSilent = maxAmp < 0.015 || (voiceRatio < 0.005 && rms < 0.003);

  console.log(
    `[PCM Analysis] duration=${duration.toFixed(2)}s, ` +
    `maxAmp=${maxAmp.toFixed(4)}, rms=${rms.toFixed(5)}, ` +
    `voiceRatio=${(voiceRatio * 100).toFixed(2)}%, isSilent=${isSilent}`
  );

  return { maxAmp, rms, isSilent, duration };
}

/** PCM Float32 → WAV Blob 16-bit chuẩn */
export function pcmToWav(pcmData: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length * bytesPerSample;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const ws = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };

  ws(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  ws(8, 'WAVE');
  ws(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  ws(36, 'data');
  view.setUint32(40, dataSize, true);

  let off = 44;
  for (let i = 0; i < pcmData.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(off, Math.round(s < 0 ? s * 0x8000 : s * 0x7FFF), true);
    off += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * (Fallback) Decode WebM/OGG blob → phân tích → WAV chuẩn.
 * Dùng khi ScriptProcessorNode không khởi động được.
 */
export async function processRecordedAudio(
  audioBlob: Blob
): Promise<{ wavBlob: Blob; analysis: AudioAnalysis }> {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass() as AudioContext;

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    // Resample về 16kHz
    const pcm16k = resamplePcm(new Float32Array(channelData), audioBuffer.sampleRate, 16000);
    const analysis = analyzePcm(pcm16k, 16000);
    const wavBlob = pcmToWav(pcm16k, 16000);

    if (audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
    return { wavBlob, analysis };
  } catch (err) {
    console.warn('[processRecordedAudio] decodeAudioData failed, treating blob as non-silent:', err);
    // Không thể decode → giả định không im lặng, gửi blob gốc
    return {
      wavBlob: audioBlob,
      analysis: { maxAmp: 0.1, rms: 0.02, isSilent: false, duration: 3 },
    };
  }
}

/** (Legacy) AudioBuffer → WAV */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const pcm16k = resamplePcm(new Float32Array(buffer.getChannelData(0)), buffer.sampleRate, 16000);
  return pcmToWav(pcm16k, 16000);
}
