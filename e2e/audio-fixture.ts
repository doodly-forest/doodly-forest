// Test-only silent MPEG-1 Layer III frames: 128 kbps, 44.1 kHz, stereo.
// No TTS, encoder, network request or application storage is involved.
export function silentMp3() {
  const frameLength = 417;
  const bytes = Buffer.alloc(frameLength * 100);
  for (let offset = 0; offset < bytes.length; offset += frameLength) {
    bytes.set([0xff, 0xfb, 0x90, 0x00], offset);
  }
  return bytes;
}

// Independent 2-second, 24 kHz mono 16-bit PCM WAV fixture.
export function silentWav() {
  const header = Buffer.from("524946462477010057415645666d74201000000001000100c05d000080bb0000020010006461746100770100", "hex");
  return Buffer.concat([header, Buffer.alloc(96_000)]);
}
