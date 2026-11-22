import {stageTables} from './data/stage-tables.js';
import {practiceCamera} from './actors/projection.js';

const u16 = value => value & 0xffff;
const s16 = value => value << 16 >> 16;

// $025b5c followed by $028a62. The source averages signed word offsets,
// limits each update to four pixels, and maintains two layer scroll origins.
export class WorldCamera {
  constructor({x = practiceCamera.x, y = practiceCamera.y,
    backgroundX = x, backgroundY = y, scene = 0} = {}) {
    Object.assign(this, {x, y, backgroundX, backgroundY, scene});
    this.chunkX = x >>> 5;
    this.chunkY = y >>> 5;
  }

  step(actors, {rumble = false, targetX = this.x, targetY = this.y, stream = true} = {}) {
    const centerX = u16(this.x + 160);
    const centerY = u16(this.y - 240);
    let count = 0;
    let dx = 0;
    let dy = 0;
    let direct = false;
    let held = false;
    for (const actor of actors) {
      if (actor.active === false) continue;
      const priority = actor.priority || 0;
      if (priority === 2) { held = true; break; }
      if (priority === 3) continue;
      if (priority === 4) {
        dx = u16(targetX - this.x);
        dy = u16(targetY - this.y);
        direct = true;
        break;
      }
      if (priority !== 1) {
        if (!(actor.flags33 & 1)) continue;
        count++;
        dx = u16(dx + actor.x - centerX);
        dy = u16(dy + actor.y - centerY);
        if (!rumble || !(actor.flags33 & 4)) continue;
      }
      count = 1;
      dx = u16(actor.x - centerX);
      dy = u16(actor.y + actor.z - (rumble ? 256 : 320) - centerY);
      break;
    }
    if (!held && (direct || count)) {
      if (!direct) {
        dx = Math.trunc(s16(dx) / count);
        dy = Math.trunc(s16(dy) / count);
      } else { dx = s16(dx); dy = s16(dy); }
      dx = Math.max(-4, Math.min(4, dx));
      dy = Math.max(-4, Math.min(4, dy));
      this.x = u16(this.x + dx);
      this.y = u16(this.y + dy);
      this.backgroundX = u16(this.backgroundX + dx);
      this.backgroundY = u16(this.backgroundY + dy);
    }
    this.clamp();
    if (stream) this.stream();
    return this;
  }

  stream() {
    // $025d00/$025d9c stream one 32-pixel boundary per layer per update,
    // prioritizing horizontal changes before vertical ones.
    const nextX = this.x >>> 5;
    const nextY = this.y >>> 5;
    if (nextX !== this.chunkX) this.chunkX += Math.sign(nextX - this.chunkX);
    else if (nextY !== this.chunkY) this.chunkY += Math.sign(nextY - this.chunkY);
    return this;
  }

  clamp() {
    const [minX, minY, maxX, maxY] = stageTables.allCameraBounds[this.scene];
    if (this.x < minX) this.x = this.backgroundX = minX;
    else if (this.x >= maxX) this.x = this.backgroundX = maxX;
    if (this.y < minY) this.y = this.backgroundY = minY;
    else if (this.y >= maxY) this.y = this.backgroundY = maxY;
  }

  registers() {
    return [this.x, u16(2048 - this.y), this.backgroundX, u16(2048 - this.backgroundY)];
  }
}
