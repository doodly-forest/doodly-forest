import "server-only";
import { ApiFailure } from "./api-errors";

// We request Gemini TTS as signed 16-bit little-endian PCM, 24 kHz, mono.
// A WAV header makes it playable by the existing <audio> element, without files.
const SAMPLE_RATE = 24_000;
const MAX_PCM_BYTES = SAMPLE_RATE * 2 * 60 * 6;

export function geminiPcmToWav(parts: { data?: string; mimeType?: string }[]): ArrayBuffer {
  const chunks: Buffer[] = [];
  let byteLength = 0;
  for (const part of parts) {
    const [mime, ...parameters] = (part.mimeType ?? "").toLowerCase().split(";").map((value) => value.trim());
    const params = new Map(parameters.map((value) => value.split("=").map((item) => item.trim()) as [string, string]));
    const data = part.data;
    if (mime !== "audio/l16" || params.get("rate") !== String(SAMPLE_RATE) ||
      (params.has("codec") && params.get("codec") !== "pcm") ||
      (params.has("channels") && params.get("channels") !== "1") ||
      params.size !== parameters.length ||
      [...params.keys()].some((key) => !["rate", "codec", "channels"].includes(key)) ||
      typeof data !== "string" || !data.length || data.length > Math.ceil(MAX_PCM_BYTES / 3) * 4 ||
      data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
      throw new ApiFailure("INVALID_AUDIO_RESPONSE");
    }
    const chunk = Buffer.from(data, "base64");
    byteLength += chunk.length;
    if (!chunk.length || chunk.length % 2 !== 0 || byteLength > MAX_PCM_BYTES || chunk.toString("base64") !== data) {
      throw new ApiFailure("INVALID_AUDIO_RESPONSE");
    }
    chunks.push(chunk);
  }
  if (!byteLength) throw new ApiFailure("INVALID_AUDIO_RESPONSE");
  const wav = Buffer.alloc(44 + byteLength);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + byteLength, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(byteLength, 40);
  let offset = 44;
  for (const chunk of chunks) { chunk.copy(wav, offset); offset += chunk.length; }
  return wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer;
}
