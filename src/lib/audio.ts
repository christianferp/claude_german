/**
 * Audio byte-level helpers shared by the Gemini TTS playback path (raw PCM →
 * playable WAV) and the pronunciation check (recorded take → WAV upload).
 */

/** Wrap raw 16-bit mono PCM in a 44-byte WAV header so <audio> can play it. */
export function pcm16ToWavBlob(pcm: Uint8Array, sampleRate: number): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeTag = (offset: number, tag: string) => {
    for (let i = 0; i < tag.length; i++) view.setUint8(offset + i, tag.charCodeAt(i));
  };
  writeTag(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  writeTag(8, 'WAVE');
  writeTag(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeTag(36, 'data');
  view.setUint32(40, pcm.length, true);
  return new Blob([header, pcm.buffer as ArrayBuffer], { type: 'audio/wav' });
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read blob.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Recorded takes are webm/opus (Chromium/Firefox) or mp4/aac (Safari) —
 * formats Gemini doesn't accept inline. Decode with the browser's own codec,
 * mix down to mono and resample to 16 kHz (plenty for speech; a 10 s take is
 * ~320 KB as WAV, far under the 20 MB inline limit).
 */
export async function transcodeToWav16kMono(blob: Blob): Promise<Blob> {
  const TARGET_RATE = 16000;
  const ctx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void ctx.close().catch(() => {});
  }

  const offline = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(decoded.duration * TARGET_RATE)),
    TARGET_RATE,
  );
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  const samples = rendered.getChannelData(0);
  const pcm = new Uint8Array(samples.length * 2);
  const view = new DataView(pcm.buffer);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, Math.round(clamped * 0x7fff), true);
  }
  return pcm16ToWavBlob(pcm, TARGET_RATE);
}
