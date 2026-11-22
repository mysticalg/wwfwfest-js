import {StageRenderer} from './stage-renderer.js';
import {SpriteRecipes, recipePieces} from './sprite-recipes.js';

export const roster = [
  'Hulk Hogan', 'Ultimate Warrior', 'Jake Roberts', 'Big Boss Man',
  'Hawk', 'Animal', 'Sgt. Slaughter', 'Mr. Perfect', 'Earthquake', 'Ted DiBiase',
  'Demolition Smash', 'Demolition Crush', 'Referee',
];

async function loadImage(path) {
  const image = new Image();
  image.src = new URL(`../assets/${path}`, import.meta.url).href;
  await image.decode();
  return image;
}

async function loadJSON(path) {
  const response = await fetch(new URL(`../assets/${path}`, import.meta.url));
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  return response.json();
}

// Renders recovered tile recipes directly through Canvas. Recipe coordinates
// preserve the original chained sprite layout, bit flags, and palette indices.
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', {alpha: false});
    this.context.imageSmoothingEnabled = false;
    this.tileCache = new Map();
    this.poseTables = new Map();
    this.actorFrames = new Map();
    this.stage = new StageRenderer(this.context);
  }

  async load() {
    const [atlas, palettes, selection, recipes] = await Promise.all([
      loadImage('sprite-indices.png'), loadJSON('palettes.json'),
      loadImage('selection.png'),
      Promise.all([fetch(new URL('../assets/sprite-recipes.bin', import.meta.url)).then(response => {
        if (!response.ok) throw new Error(`Could not load sprite recipes (${response.status})`);
        return response.arrayBuffer();
      }), loadJSON('sprite-recipes.json')]).then(([data, metadata]) => new SpriteRecipes(data, metadata)),
      this.stage.load(),
    ]);
    Object.assign(this, {palettes, selection, recipes});
    const scratch = document.createElement('canvas');
    scratch.width = atlas.width;
    scratch.height = atlas.height;
    const context = scratch.getContext('2d', {willReadFrequently: true});
    context.drawImage(atlas, 0, 0);
    const rgba = context.getImageData(0, 0, atlas.width, atlas.height).data;
    this.indices = new Uint8Array(atlas.width * atlas.height);
    for (let i = 0; i < this.indices.length; i++) this.indices[i] = Math.round(rgba[i * 4] / 17);
    scratch.width = scratch.height = 1;
    await Promise.all([this.loadActor(0), this.loadActor(6), this.loadActor(12)]);
  }

  async loadActor(type) {
    if (!this.poseTables.has(type)) {
      this.poseTables.set(type, loadJSON(`poses-${type}.json`).then(table => {
        this.actorFrames.set(type, table.frames);
        return table.frames;
      }));
    }
    return this.poseTables.get(type);
  }

  tile(code, paletteIndex) {
    const key = code * 16 + paletteIndex;
    if (this.tileCache.has(key)) return this.tileCache.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const context = canvas.getContext('2d');
    const image = context.createImageData(16, 16);
    const palette = this.palettes[paletteIndex];
    const startX = (code & 255) * 16;
    const startY = (code >> 8) * 16;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const color = palette[this.indices[(startY + y) * 4096 + startX + x]];
        image.data.set(color, (y * 16 + x) * 4);
      }
    }
    context.putImageData(image, 0, 0);
    this.tileCache.set(key, canvas);
    return canvas;
  }

  drawActor(type, index, x, y, {mirror = false, targetType = null, scale = 1} = {}) {
    const pose = this.actorFrames.get(type)?.[index];
    if (pose?.override) {
      this.drawPose(this.actorFrames.get(type), index, x, y, mirror, scale);
      return {commands: pose.pieces, missing: false};
    }
    // Match rendering uses actual projected coordinates for original clipping.
    // Scaled explorer previews normalize around the former export origin.
    const result = this.recipes.expand(type, index | (mirror ? 0x8000 : 0), {
      targetType, x: scale === 1 ? Math.round(x) : 128,
      y: scale === 1 ? 232 - Math.round(y) : 128,
    });
    const context = this.context;
    context.save();
    if (scale !== 1) {
      context.translate(Math.round(x), Math.round(y));
      context.scale(scale, scale);
      context.translate(-128, -104);
    }
    this.drawChains(recipePieces(result.commands));
    context.restore();
    return result;
  }

  drawPose(frames, index, x, y, mirror = false, scale = 1) {
    const pose = frames[index];
    if (!pose || (pose.requiresContext && !pose.override)) return;
    const context = this.context;
    context.save();
    context.translate(Math.round(x) + (mirror ? 16 * scale : 0), Math.round(y));
    context.scale(mirror ? -scale : scale, scale);
    this.drawChains(pose.pieces);
    context.restore();
  }

  drawChains(pieces) {
    const context = this.context;
    for (const piece of pieces) {
      if (!(piece.flags & 1)) continue;
      const count = (piece.flags >> 5) + 1;
      const flipX = Boolean(piece.flags & 16);
      const flipY = Boolean(piece.flags & 8);
      for (let tile = 0; tile < count; tile++) {
        const tileY = flipY ? piece.y - 16 * (count - 1) + tile * 16 : piece.y - tile * 16;
        context.save();
        context.translate(piece.x + (flipX ? 16 : 0), tileY + (flipY ? 16 : 0));
        context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
        context.drawImage(this.tile((piece.code + tile) & 65535, piece.color), 0, 0);
        context.restore();
      }
    }
  }

  clear(color = '#171e2a') {
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, 320, 240);
  }

  text(text, x, y, color = '#fff', size = 8, align = 'left') {
    const context = this.context;
    context.font = `bold ${size}px monospace`;
    context.textAlign = align;
    context.fillStyle = '#000';
    context.fillText(text, x + 1, y + 1);
    context.fillStyle = color;
    context.fillText(text, x, y);
  }
}
