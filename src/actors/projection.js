// Reference origin for the match's stored actor coordinates (original frame
// 4500). World physics stays independent of the moving rendering camera.
export const practiceCamera = {x: 0x1cd, y: 0x241, matHeight: 0x140};

export function worldPosition(actor) {
  return {
    xFixed: Math.round((actor.x + practiceCamera.x) * 65536) | 0,
    yFixed: Math.round((240 + practiceCamera.y - practiceCamera.matHeight - actor.y) * 65536) | 0,
    zFixed: Math.round((practiceCamera.matHeight + (actor.z || 0)) * 65536) | 0,
  };
}

export function updateScreenPosition(actor, world) {
  actor.x = world.xFixed / 65536 - practiceCamera.x;
  actor.y = 240 + practiceCamera.y - practiceCamera.matHeight - world.yFixed / 65536;
  actor.z = world.zFixed / 65536 - practiceCamera.matHeight;
}

// $00248c uses position integer words before the sprite recipe inverts y.
// Pose extraction used projected origin (128,128), with screen y origin 104.
// Combining those yields the 232 constant for the recovered local recipes.
export function spritePosition(actor, camera = practiceCamera) {
  const world = worldPosition(actor);
  return {x: (world.xFixed >>> 16) - camera.x,
    y: 232 + camera.y - (world.yFixed >>> 16) - (world.zFixed >>> 16)};
}

// $0240e8, after pending damage is applied. The low-health threshold is the
// literal 24 in the program, followed by twice the truncated maximum/3.
export function healthSeverity(health, maximumHealth, previous = 0) {
  if (!maximumHealth) return previous;
  return health <= 24 ? 2 : health <= 2 * Math.floor(maximumHealth / 3) ? 1 : 0;
}
