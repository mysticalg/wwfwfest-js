// MAME's wwfwfest machine configuration in src/mame/technos/ddragon3.cpp.
// Its horizontal/vertical totals are explicitly marked as estimated upstream.
export const videoTiming = {
  masterClock: 28_000_000, pixelDivisor: 4,
  horizontalTotal: 448, verticalTotal: 272, totalsEstimated: true,
};
export const videoFrameRate = videoTiming.masterClock / videoTiming.pixelDivisor
  / videoTiming.horizontalTotal / videoTiming.verticalTotal;
