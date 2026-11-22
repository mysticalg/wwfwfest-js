import {actorTables} from '../data/actor-tables.js';

// $0022d0: direction byte selects a quadrant and the two original 65-word
// tables. Outputs are signed 16.16 increments, including the board's unequal
// horizontal and depth scales. Do not replace these tables with trigonometry.
export function polarDelta(direction, speed) {
  direction &= 255;
  speed &= 255;
  const quadrant = direction >> 6;
  const index = [direction, 128 - direction, direction - 128, 256 - direction][quadrant];
  let x = actorTables.polarX[index] * speed;
  let y = actorTables.polarY[index] * speed;
  if (quadrant >= 2) x = -x;
  if (quadrant === 1 || quadrant === 2) y = -y;
  return {x, y};
}

// $002218 dispatches by movementMode. Position longs wrap, and mode 2 interprets
// the velocity words as signed 8.8. The apparent gravity clamp in the source is
// unreachable: negative words always pass its unsigned >= $2000 comparison.
export function stepMovement(actor) {
  if (actor.movementMode === 1) {
    const delta = polarDelta(actor.direction, actor.speed);
    actor.xFixed = (actor.xFixed + delta.x) | 0;
    actor.yFixed = (actor.yFixed + delta.y) | 0;
  } else if (actor.movementMode === 2) {
    actor.xFixed = (actor.xFixed + (actor.velocityX << 16 >> 8)) | 0;
    actor.yFixed = (actor.yFixed + (actor.velocityY << 16 >> 8)) | 0;
    actor.zFixed = (actor.zFixed + (actor.velocityZ << 16 >> 8)) | 0;
    actor.velocityZ = (actor.velocityZ - actor.gravity) & 0xffff;
  }
  return actor;
}

// $01098c. Flag names describe their source offsets until their full gameplay
// meanings are established. Normal human walking uses all-zero flags here.
export function walkSpeed(type, flags32 = 0, flags33 = 0, flags56 = 0, flags74 = 0) {
  const table = flags32 & 8 ? actorTables.alternateWalkSpeeds : actorTables.walkSpeeds;
  if (!Number.isInteger(type) || type < 0 || type >= table.length) throw new RangeError('Invalid wrestler type');
  let speed = table[type];
  if ((flags56 & 128) && (flags33 & 32)) speed = (speed + 6) & 255;
  if (flags74 & 128) speed = (speed - 8) & 0xffff;
  return speed;
}

// $010950. Descriptor replacement preserves the current clock, as in the ROM.
export function walkAnimation(flags32 = 0, flags74 = 0, flags75 = 0) {
  const index = flags74 & 128 ? (flags75 & 1 ? 3 : 2) : (flags32 & 8 ? 1 : 0);
  return actorTables.walkAnimations[index];
}

export function walkDelta(type, horizontal, vertical) {
  const mask = (horizontal > 0 ? 1 : horizontal < 0 ? 2 : 0)
    | (vertical > 0 ? 4 : vertical < 0 ? 8 : 0);
  return mask ? polarDelta(actorTables.inputDirections[mask], walkSpeed(type)) : {x: 0, y: 0};
}
