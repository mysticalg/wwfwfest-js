// The OKI sample table uses inclusive byte ends, high nibble first, and a
// twelve-bit predictor. This decoder preserves integer predictor samples.
const indexChanges = [-1, -1, -1, -1, 2, 4, 6, 8];
const stepSizes = Array.from({length: 49}, (_, index) => Math.floor(16 * Math.pow(1.1, index)));

export class AdpcmPredictor {
  constructor() {
    this.value = 0;
    this.stepIndex = 0;
  }

  clock(nibble) {
    const step = stepSizes[this.stepIndex];
    let delta = step >> 3;
    if (nibble & 1) delta += step >> 2;
    if (nibble & 2) delta += step >> 1;
    if (nibble & 4) delta += step;
    this.value += nibble & 8 ? -delta : delta;
    this.value = Math.max(-2048, Math.min(2047, this.value));
    this.stepIndex = Math.max(0, Math.min(48, this.stepIndex + indexChanges[nibble & 7]));
    return this.value;
  }
}

export function decodeSample(bytes, start, end) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end >= bytes.length) {
    throw new RangeError('Invalid ADPCM sample range');
  }
  const pcm = new Int16Array((end - start + 1) * 2);
  const predictor = new AdpcmPredictor();
  for (let index = 0; index < pcm.length; index++) {
    const nibble = (bytes[start + (index >> 1)] >> (index & 1 ? 0 : 4)) & 15;
    pcm[index] = predictor.clock(nibble);
  }
  return pcm;
}

