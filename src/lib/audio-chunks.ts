/**
 * Class Notes: browser-side audio prep. Any file the browser can decode (mp3, m4a, wav,
 * webm, ogg, mp4…) → 16 kHz mono → ~50s WAV slices, each cut at the quietest moment
 * near the boundary so a word is rarely split. Every slice is ~1.6 MB, far under
 * Vercel's 4.5 MB request limit, and can be transcribed (and retried) independently.
 */

export const TARGET_SAMPLE_RATE = 16_000;
export const MAX_AUDIO_SECONDS = 60 * 60;
const CHUNK_SECONDS = 50;
const SEARCH_WINDOW_SECONDS = 5; // look this far back from each boundary for a pause
const FRAME_SECONDS = 0.1;
const SILENT_PEAK = 0.01; // a slice whose loudest sample is below this has no speech

export interface AudioChunk {
  index: number;
  startSeconds: number;
  wav: Blob;
  silent: boolean;
}

export class AudioPrepError extends Error {}

/** Reads the duration from metadata without decoding the whole file. Resolves null if unknown. */
export function probeDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = document.createElement("audio");
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => done(null);
    setTimeout(() => done(null), 5000);
    audio.src = url;
  });
}

async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const bytes = await blob.arrayBuffer();
  let decoded: AudioBuffer;
  try {
    // decodeAudioData on an OfflineAudioContext resamples to that context's rate.
    decoded = await new OfflineAudioContext(1, 1, TARGET_SAMPLE_RATE).decodeAudioData(bytes);
  } catch {
    throw new AudioPrepError("Couldn't read this audio file. Try MP3, M4A, WAV or WebM.");
  }

  if (decoded.duration > MAX_AUDIO_SECONDS + 1) {
    throw new AudioPrepError(`Audio is longer than ${MAX_AUDIO_SECONDS / 60} minutes — please trim it.`);
  }

  if (decoded.sampleRate === TARGET_SAMPLE_RATE && decoded.numberOfChannels === 1) {
    return decoded.getChannelData(0);
  }

  // Some browsers (older Safari) decode at the file's native rate; resample + downmix explicitly.
  const length = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, Math.max(1, length), TARGET_SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination); // the destination has 1 channel → the graph downmixes
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

/** Index of the quietest 100ms frame in [from, to), used as the cut point. */
function quietestPoint(samples: Float32Array, from: number, to: number): number {
  const frame = Math.round(FRAME_SECONDS * TARGET_SAMPLE_RATE);
  let best = to;
  let bestEnergy = Infinity;
  for (let start = from; start + frame <= to; start += frame) {
    let energy = 0;
    for (let i = start; i < start + frame; i++) energy += samples[i] * samples[i];
    if (energy < bestEnergy) {
      bestEnergy = energy;
      best = start + Math.floor(frame / 2);
    }
  }
  return best;
}

function encodeWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export async function prepareAudioChunks(blob: Blob): Promise<{ chunks: AudioChunk[]; durationSeconds: number }> {
  const samples = await decodeToMono16k(blob);
  const rate = TARGET_SAMPLE_RATE;
  const durationSeconds = samples.length / rate;
  if (durationSeconds < 0.5) throw new AudioPrepError("This recording is too short to transcribe.");

  const chunks: AudioChunk[] = [];
  const chunkLen = CHUNK_SECONDS * rate;
  let start = 0;
  while (start < samples.length) {
    let end: number;
    // Fold a short tail (< 1.2 chunks left) into the final chunk instead of sending a 3s scrap.
    if (samples.length - start <= chunkLen * 1.2) end = samples.length;
    else end = quietestPoint(samples, start + chunkLen - SEARCH_WINDOW_SECONDS * rate, start + chunkLen);

    const slice = samples.subarray(start, end);
    let peak = 0;
    for (let i = 0; i < slice.length; i++) {
      const a = Math.abs(slice[i]);
      if (a > peak) peak = a;
    }
    chunks.push({ index: chunks.length, startSeconds: start / rate, wav: encodeWav(slice), silent: peak < SILENT_PEAK });
    start = end;
  }

  return { chunks, durationSeconds };
}

export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${String(m).padStart(2, "0")}:${sec}`;
}
