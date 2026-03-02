"use client";

/**
 * דחיסת אודיו בצד הלקוח לפני העלאה – מגבלת גודל מקסימלית (ברירת מחדל 3.5MB).
 * אם הקובץ מעל המגבלה: מפענחים עם Web Audio API, מקודדים ל-MP3 באיכות מתאימה.
 * מחזיר { file, durationSeconds } – הקובץ להעלאה ומשך השיר בשניות.
 * משתמש ב-lame.min.js (UMD) – הבאנדלר של Next.js לא מטפל ב-CommonJS הפנימי של lamejs.
 */

const MAX_AUDIO_BYTES = 3.5 * 1024 * 1024; // 3.5MB
const SAMPLE_BLOCK = 1152;
const LAME_SCRIPT = "https://unpkg.com/lamejs@1.2.1/lame.min.js";

function loadLamejs() {
  if (typeof window !== "undefined" && window.lamejs) {
    return Promise.resolve(window.lamejs);
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LAME_SCRIPT}"]`);
    if (existing) {
      const check = () => (window.lamejs ? resolve(window.lamejs) : setTimeout(check, 50));
      check();
      return;
    }
    const script = document.createElement("script");
    script.src = LAME_SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.lamejs);
    script.onerror = () => reject(new Error("טעינת lamejs נכשלה"));
    document.head.appendChild(script);
  });
}

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
 * @param {(percent: number) => void} [onProgress] - קריאה בכל עדכון התקדמות (0–100)
 * @returns {Promise<{ file: File, durationSeconds: number }>}
 */
export async function compressAudioIfNeeded(audioFile, maxBytes = MAX_AUDIO_BYTES, onProgress) {
  const report = (p) => { if (typeof onProgress === "function") onProgress(Math.round(p)); };

  if (!audioFile || !(audioFile instanceof File)) {
    throw new Error("קובץ אודיו לא תקין");
  }
  if (audioFile.size <= maxBytes) {
    report(100);
    const durationSeconds = await getDurationFromFile(audioFile);
    return { file: audioFile, durationSeconds };
  }

  report(5);
  const arrayBuffer = await audioFile.arrayBuffer();
  report(15);
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  let buffer;
  try {
    buffer = await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    audioContext.close();
  }
  report(50);

  const durationSeconds = buffer.duration;
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const targetKbps = Math.max(32, Math.min(320, Math.floor((maxBytes * 8) / (durationSeconds * 1000))));

  const lamejs = await loadLamejs();
  if (!lamejs?.Mp3Encoder) throw new Error("lamejs Mp3Encoder not found");
  const mp3Encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, targetKbps);

  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;
  const left16 = floatTo16BitPCM(left);
  const right16 = floatTo16BitPCM(right);

  const totalChunks = Math.ceil(left.length / SAMPLE_BLOCK);
  const mp3Chunks = [];
  for (let i = 0; i < left.length; i += SAMPLE_BLOCK) {
    const leftChunk = left16.subarray(i, i + SAMPLE_BLOCK);
    const rightChunk = right16.subarray(i, i + SAMPLE_BLOCK);
    const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) mp3Chunks.push(new Int8Array(mp3buf));
    const chunkIndex = Math.floor(i / SAMPLE_BLOCK);
    report(50 + (50 * (chunkIndex + 1)) / totalChunks);
  }
  const flush = mp3Encoder.flush();
  if (flush.length > 0) mp3Chunks.push(new Int8Array(flush));
  report(100);

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
