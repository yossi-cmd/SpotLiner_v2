"use client";

/**
 * דחיסת אודיו בצד הלקוח לפני העלאה – מגבלת גודל מקסימלית (ברירת מחדל 3.5MB).
 * אם הקובץ מעל המגבלה: מפענחים עם Web Audio API, מקודדים ל-MP3 באיכות מתאימה.
 * מחזיר { file, durationSeconds } – הקובץ להעלאה ומשך השיר בשניות.
 */

const MAX_AUDIO_BYTES = 3.5 * 1024 * 1024; // 3.5MB
const SAMPLE_BLOCK = 1152;

function floatTo16BitPCM(float32Array) {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

/**
 * @param {File} audioFile - קובץ אודיו (כל פורמט שהדפדפן תומך)
 * @param {number} maxBytes - גודל מקסימלי בבייטים
 * @returns {Promise<{ file: File, durationSeconds: number }>}
 */
export async function compressAudioIfNeeded(audioFile, maxBytes = MAX_AUDIO_BYTES) {
  if (!audioFile || !(audioFile instanceof File)) {
    throw new Error("קובץ אודיו לא תקין");
  }
  if (audioFile.size <= maxBytes) {
    const durationSeconds = await getDurationFromFile(audioFile);
    return { file: audioFile, durationSeconds };
  }

  const arrayBuffer = await audioFile.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  let buffer;
  try {
    buffer = await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    audioContext.close();
  }

  const durationSeconds = buffer.duration;
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  // bitrate כך שהקובץ לא יעבור את maxBytes: bitrate (bps) = maxBytes*8 / duration
  const targetKbps = Math.max(32, Math.min(320, Math.floor((maxBytes * 8) / (durationSeconds * 1000))));

  const lame = await import("lamejs");
  const Mp3Encoder = lame.Mp3Encoder || lame.default?.Mp3Encoder;
  if (!Mp3Encoder) throw new Error("lamejs Mp3Encoder not found");
  const mp3Encoder = new Mp3Encoder(numChannels, sampleRate, targetKbps);

  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;
  const left16 = floatTo16BitPCM(left);
  const right16 = floatTo16BitPCM(right);

  const mp3Chunks = [];
  for (let i = 0; i < left.length; i += SAMPLE_BLOCK) {
    const leftChunk = left16.subarray(i, i + SAMPLE_BLOCK);
    const rightChunk = right16.subarray(i, i + SAMPLE_BLOCK);
    const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) mp3Chunks.push(new Int8Array(mp3buf));
  }
  const flush = mp3Encoder.flush();
  if (flush.length > 0) mp3Chunks.push(new Int8Array(flush));

  const mp3Blob = new Blob(mp3Chunks, { type: "audio/mpeg" });
  const baseName = (audioFile.name || "audio").replace(/\.[^/.]+$/, "");
  const file = new File([mp3Blob], `${baseName}.mp3`, { type: "audio/mpeg" });

  return {
    file,
    durationSeconds: Math.round(durationSeconds),
  };
}

function getDurationFromFile(file) {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(Math.round(audio.duration) || 0);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });
}

export { MAX_AUDIO_BYTES };
