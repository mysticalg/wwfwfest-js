import {actorTables} from '../data/actor-tables.js';

const u16 = value => value & 0xffff;
const s8 = value => value << 24 >> 24;

// $02348a. Keep the original endpoint tests and unsigned word comparisons,
// including reversed/wrapped rectangles. Pose-facing is independent of the
// actor's current facing until its animation loads another pose.
function horizontalOverlap(attacker, target, attack, hurt) {
  let [left, , right] = attack;
  if (attacker.pose & 0x8000) [left, right] = [s8(-right), s8(-left)];
  const a = u16(attacker.x + left);
  const b = u16(attacker.x + right);
  [left, , right] = hurt;
  if (target.pose & 0x8000) [left, right] = [s8(-right), s8(-left)];
  const c = u16(target.x + left);
  const d = u16(target.x + right);
  return (c >= a && b >= c) || (d >= a && b >= d)
    || (a >= c && d >= a) || (b >= c && d >= b);
}

// $023504 uses three endpoint tests, rather than normalizing the intervals.
function verticalOverlap(attacker, target, attack, hurt) {
  const a = u16(attacker.z + attack[1]);
  const b = u16(attacker.z + attack[3]);
  const c = u16(target.z + hurt[1]);
  const d = u16(target.z + hurt[3]);
  return (c >= a && b >= c) || (d >= a && b >= d) || (a >= c && d >= a);
}

// $02340e. Contact records have separate attack and vulnerability flags and
// can select a second hurt rectangle. This is geometry only. Eligibility,
// per-pose hit masks and response dispatch are handled by the actor loop.
export function contactOverlap(attacker, target) {
  const attackRecord = actorTables.contacts[attacker.contact & 255];
  const hurtRecord = actorTables.contacts[target.contact & 255];
  if (!attackRecord || !hurtRecord || !(hurtRecord[0] & 64)) return false;
  const attack = actorTables.attackRectangles[attackRecord[3]];
  const test = index => {
    const hurt = actorTables.hurtRectangles[index];
    return horizontalOverlap(attacker, target, attack, hurt)
      && verticalOverlap(attacker, target, attack, hurt);
  };
  return test(hurtRecord[1]) || Boolean((hurtRecord[0] & 32) && test(hurtRecord[2]));
}

// The normal ground-distance gate from $02334c. The complete dispatcher also
// checks actor/state flags and the per-pose hit mask before this geometry test.
export function groundContact(attacker, target) {
  const record = actorTables.contacts[attacker.contact & 255];
  if (!record || !(record[0] & 128) || !target.contact) return false;
  const targetY = u16(target.y - ((target.contact & 255) === 20 ? 8 : 0));
  if (Math.abs(u16(attacker.y) - targetY) >= 12) return false;
  if (Math.abs(u16(attacker.x) - u16(target.x)) >= 80) return false;
  return contactOverlap(attacker, target);
}
