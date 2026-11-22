import {Renderer, roster} from './renderer.js';
import {Match, rules} from './game.js';

const element = id => document.getElementById(id);
const canvas = element('screen');
const renderer = new Renderer(canvas);
const held = new Set();
export const state = {view: 'play', match: null, paused: false, ready: false, pose: 0, actor: 0, cycling: false};
const tables = new Map();
let accumulator = 0;
let previousTime = performance.now();
let cycleTicks = 0;
let actorRequest = 0;

for (const id of ['player', 'opponent', 'actor']) {
  const names = id === 'actor' ? roster : roster.slice(0, 10);
  names.forEach((name, type) => element(id).add(new Option(name, String(type))));
}
element('opponent').value = '6';

async function prepareActor(type) {
  const frames = await renderer.loadActor(type);
  tables.set(type, frames);
  return frames;
}

async function startMatch() {
  if (!state.ready) return;
  element('start').disabled = true;
  const player = Number(element('player').value);
  const opponent = Number(element('opponent').value);
  element('status').textContent = 'Preparing wrestlers…';
  try {
    await Promise.all([prepareActor(player), prepareActor(opponent)]);
    state.match = new Match(player, opponent);
    state.match.ai = element('ai').checked;
    state.paused = false;
    element('pause').textContent = 'Pause';
    element('status').textContent = '';
    canvas.focus();
  } catch (error) {
    element('status').textContent = error.message;
  } finally {
    element('start').disabled = false;
  }
}

function togglePause() {
  if (!state.match) return;
  state.paused = !state.paused;
  held.clear();
  element('pause').textContent = state.paused ? 'Resume' : 'Pause';
}

function setView(view) {
  held.clear();
  state.view = view;
  element('play-controls').hidden = view !== 'play';
  element('frame-controls').hidden = view !== 'frames';
  element('play-tab').setAttribute('aria-pressed', String(view === 'play'));
  element('frames-tab').setAttribute('aria-pressed', String(view === 'frames'));
}

function setPose(value) {
  if (!tables.has(state.actor)) return;
  state.pose = Math.max(0, Math.min(tables.get(state.actor).length - 1, Math.floor(Number(value) || 0)));
  element('pose-number').value = String(state.pose);
  element('pose-range').value = String(state.pose);
  const pose = tables.get(state.actor)[state.pose];
  element('pose-info').textContent = `Pose ${state.pose} · ROM $${pose.source.toString(16).padStart(6, '0')} · ${pose.pieces.length} sprite chains${pose.requiresContext ? ' · Requires animation context' : ''}`;
}

async function chooseActor() {
  const request = ++actorRequest;
  const actor = Number(element('actor').value);
  const controls = ['pose-number', 'pose-range', 'previous', 'next', 'animate'];
  element('frame-controls').setAttribute('aria-busy', 'true');
  element('pose-info').textContent = 'Loading poses…';
  for (const id of controls) element(id).disabled = true;
  try {
    const frames = await prepareActor(actor);
    if (request !== actorRequest) return;
    state.actor = actor;
    element('pose-number').max = element('pose-range').max = String(frames.length - 1);
    setPose(0);
  } catch (error) {
    element('status').textContent = error.message;
  } finally {
    if (request === actorRequest) {
      element('frame-controls').setAttribute('aria-busy', 'false');
      for (const id of controls) element(id).disabled = false;
    }
  }
}

function drawSelection() {
  renderer.context.drawImage(renderer.selection, 0, 0);
  renderer.context.fillStyle = '#061a57';
  renderer.context.fillRect(10, 30, 300, 183);
  renderer.text('SELECT WRESTLERS', 160, 49, '#ffe64a', 17, 'center');
  const player = Number(element('player').value);
  const opponent = Number(element('opponent').value);
  renderer.context.drawImage(renderer.portraits, player * 160, 0, 160, 160, 8, 40, 160, 160);
  renderer.context.drawImage(renderer.portraits, opponent * 160, 0, 160, 160, 155, 40, 160, 160);
  renderer.text('1P', 83, 77, '#5aff8f', 12, 'center');
  renderer.text('VS', 160, 125, '#ffe64a', 15, 'center');
  renderer.text('CPU', 230, 77, '#ffb1ae', 12, 'center');
  renderer.text(roster[player].toUpperCase(), 83, 191, '#fff', 8, 'center');
  renderer.text(roster[opponent].toUpperCase(), 230, 191, '#fff', 8, 'center');
  renderer.text('PRESS ENTER TO START', 160, 224, '#ffe64a', 10, 'center');
}

function drawMatch() {
  const match = state.match;
  const context = renderer.context;
  context.drawImage(renderer.arena, 0, 0);
  // The photographed camera position is fixed during this first native slice.
  // Characters are independent JS objects drawn between original stage layers.
  const sorted = [...match.fighters].sort((a, b) => a.y - b.y);
  for (const actor of sorted) {
    const frames = tables.get(actor.type);
    renderer.drawPose(frames, match.pose(actor, frames), actor.x, actor.y - 8, actor.facing > 0);
  }
  context.drawImage(renderer.foreground, 0, 0);
  context.fillStyle = '#071323';
  context.fillRect(0, 0, 320, 29);
  match.fighters.forEach((actor, index) => {
    const x = index === 0 ? 9 : 180;
    renderer.text(roster[actor.type].toUpperCase(), x, 10, index === 0 ? '#68ffa1' : '#ffb5a7', 8);
    context.fillStyle = '#5c2635';
    context.fillRect(x, 16, 130, 5);
    context.fillStyle = '#f8df33';
    context.fillRect(x, 16, 130 * actor.health / rules.maximumHealth, 5);
  });
  context.fillStyle = '#071323';
  context.fillRect(0, 222, 320, 18);
  renderer.text(`${Math.floor(match.time / 60)}:${String(match.time % 60).padStart(2, '0')}`, 160, 235, '#f8df33', 11, 'center');
  if (match.count) renderer.text(String(match.count), 160, 101, '#fff', 28, 'center');
  if (state.paused || match.winner !== null) {
    context.fillStyle = '#061020df';
    context.fillRect(15, 80, 290, 65);
    renderer.text(state.paused ? 'PAUSED' : `${match.winner === 0 ? 'PLAYER' : 'CPU'} WINS`, 160, 108, '#ffe64a', 20, 'center');
    renderer.text(state.paused ? 'P TO RESUME' : 'ENTER FOR REMATCH', 160, 130, '#fff', 9, 'center');
  }
}

function drawExplorer() {
  renderer.clear();
  const context = renderer.context;
  context.strokeStyle = '#303b4d';
  context.beginPath();
  context.moveTo(0, 207);
  context.lineTo(320, 207);
  context.moveTo(160, 38);
  context.lineTo(160, 220);
  context.stroke();
  renderer.text(roster[state.actor].toUpperCase(), 160, 21, '#ffe64a', 12, 'center');
  renderer.drawPose(tables.get(state.actor), state.pose, 160, 190, element('mirror').checked, 1.5);
  const pose = tables.get(state.actor)[state.pose];
  if (!pose.pieces.length) renderer.text(pose.requiresContext ? 'CONTEXT REQUIRED' : 'EMPTY POSE', 160, 125, '#bdc9de', 11, 'center');
  renderer.text(`FRAME ${state.pose}`, 160, 232, '#bdc9de', 10, 'center');
}

function input() {
  return {
    horizontal: Number(held.has('ArrowRight')) - Number(held.has('ArrowLeft')),
    vertical: Number(held.has('ArrowDown')) - Number(held.has('ArrowUp')),
    strike: held.has('KeyZ'), heavy: held.has('KeyX'), run: held.has('KeyC'), pin: held.has('Space'),
  };
}

function frame(time) {
  accumulator += Math.min(100, time - previousTime);
  previousTime = time;
  if (state.ready) {
    while (accumulator >= 1000 / rules.frameRate) {
      if (state.view === 'play' && state.match && !state.paused) state.match.step(input());
      if (state.view === 'frames' && state.cycling && ++cycleTicks % 8 === 0) {
        setPose((state.pose + 1) % tables.get(state.actor).length);
      }
      accumulator -= 1000 / rules.frameRate;
    }
    if (state.view === 'frames') drawExplorer();
    else if (state.match) drawMatch();
    else drawSelection();
  } else accumulator = 0;
  requestAnimationFrame(frame);
}

element('start').addEventListener('click', startMatch);
element('reset').addEventListener('click', () => { state.match = null; held.clear(); });
element('pause').addEventListener('click', togglePause);
element('play-tab').addEventListener('click', () => setView('play'));
element('frames-tab').addEventListener('click', () => setView('frames'));
element('ai').addEventListener('change', () => { if (state.match) state.match.ai = element('ai').checked; });
element('actor').addEventListener('change', chooseActor);
element('pose-number').addEventListener('input', event => setPose(event.target.value));
element('pose-range').addEventListener('input', event => setPose(event.target.value));
element('previous').addEventListener('click', () => setPose(state.pose - 1));
element('next').addEventListener('click', () => setPose(state.pose + 1));
element('animate').addEventListener('click', () => {
  state.cycling = !state.cycling;
  element('animate').textContent = state.cycling ? 'Stop cycling' : 'Cycle poses';
});
element('fullscreen').addEventListener('click', async () => {
  try { await canvas.requestFullscreen(); }
  catch { element('status').textContent = 'Fullscreen is unavailable in this browser.'; }
});

const gameKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyZ', 'KeyX', 'KeyC', 'Space']);
window.addEventListener('keydown', event => {
  if (['INPUT', 'SELECT'].includes(event.target.tagName)) return;
  if (event.code === 'KeyP' && !event.repeat) {
    event.preventDefault();
    togglePause();
    return;
  }
  if (event.target.tagName === 'BUTTON') return;
  if (gameKeys.has(event.code)) { event.preventDefault(); held.add(event.code); }
  if (event.code === 'Enter' && !event.repeat && state.view === 'play') { event.preventDefault(); startMatch(); }
});
window.addEventListener('keyup', event => held.delete(event.code));
window.addEventListener('blur', () => held.clear());
document.addEventListener('visibilitychange', () => { held.clear(); previousTime = performance.now(); accumulator = 0; });
for (const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    held.add(button.dataset.key);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => held.delete(button.dataset.key));
}

try {
  await renderer.load();
  await Promise.all([prepareActor(0), prepareActor(6), prepareActor(12)]);
  state.ready = true;
  element('status').textContent = '';
  for (const id of ['start', 'reset', 'pause']) element(id).disabled = false;
  setPose(0);
} catch (error) {
  element('status').textContent = `Asset loading failed. ${error.message}`;
}
requestAnimationFrame(frame);
