import {stageTables} from './data/stage-tables.js';

async function loadImage(name) {
  const image = new Image();
  image.src = new URL(`../assets/${name}`, import.meta.url).href;
  await image.decode();
  return image;
}

export class StageRenderer {
  constructor(context) {
    this.context = context;
  }

  async load() {
    [this.background, this.foreground, this.atlas] = await Promise.all([
      loadImage('arena-scroll-back.png'), loadImage('arena-scroll-front.png'), loadImage('arena-patches.png'),
    ]);
  }

  draw(camera, scenery, foreground = false) {
    const context = this.context;
    const x = foreground ? camera.x : camera.backgroundX;
    const y = foreground ? camera.y : camera.backgroundY;
    const worldY = stageTables.worldYOrigin - y + stageTables.screenTopOffset;
    if (!foreground) {
      context.fillStyle = '#000';
      context.fillRect(0, 0, 320, 240);
    }
    context.drawImage(foreground ? this.foreground : this.background,
      x - stageTables.origin.x, worldY - stageTables.origin.y, 320, 240, 0, 0, 320, 240);
    for (const patch of scenery.patches()) {
      if (Boolean(patch.layer) !== foreground) continue;
      const screenX = patch.x - x;
      const screenY = patch.y - worldY;
      if (screenX >= 320 || screenY >= 240 || screenX + 64 <= 0 || screenY + 64 <= 0) continue;
      context.drawImage(this.atlas, patch.atlasX, patch.atlasY, 64, 64, screenX, screenY, 64, 64);
    }
  }
}
