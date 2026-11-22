import {Renderer, roster} from './renderer.js';
import {Match, rules} from './game.js';
import {NativeAudio} from './audio/native-audio.js';
import {decodeSample} from './audio/sample-codec.js';
import {MusicSequencer} from './audio/music-sequencer.js';
import {GamepadInput, neutralControls} from './gamepad.js';

const element = id => document.getElementById(id);
const canvas = element('screen');
const renderer = new Renderer(canvas);
export const audio = new NativeAudio();
const held = new Set();
const gamepads = new GamepadInput();
let padControls = neutralControls();
let gamepadWasUsed = false;
export const state = {view: 'play', match: null, paused: false, ready: false, pose: 0, actor: 0, cycling: false};
const tables = new Map();
let accumulator = 0;
let previousTime = performance.now();
let cycleTicks = 0;
let actorRequest = 0;
let matchRequest = 0;
let soundEffect = null;
let soundWaveform = null;
let musicTrack = null;
let musicPreview = null;
let muted = false;

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
  if (!state.ready || element('start').disabled) return;
  const request = ++matchRequest;
  element('start').disabled = true;
  const player = Number(element('player').value);
  const opponent = Number(element('opponent').value);
  element('status').textContent = 'Preparing wrestlers…';
  try {
    await Promise.all([prepareActor(player), prepareActor(opponent)]);
    if (request !== matchRequest) return;
    state.match = new Match(player, opponent);
    state.match.ai = element('ai').checked;
    playSceneAudio(true);
    state.paused = false;
    audio.pause(false);
    element('pause').textContent = 'Pause';
    element('status').textContent = '';
    canvas.focus();
  } catch (error) {
    if (request === matchRequest) element('status').textContent = error.message;
  } finally {
    if (request === matchRequest) element('start').disabled = false;
  }
}

function resetMatch() {
  matchRequest++;
  state.match = null;
  state.paused = false;
  element('start').disabled = !state.ready;
  element('pause').textContent = 'Pause';
  element('status').textContent = '';
  audio.pause(false);
  held.clear();
  playSceneAudio();
}

function playSceneAudio(opening = false) {
  if (!audio.context) return;
  // Original phase transitions send FM stop, effect reset, then the scene
  // command through $002062. The reference run enters the ring with $2f/$04.
  audio.command(0);
  audio.command(0x20);
  if (opening) audio.command(0x2f);
  audio.command(state.match ? 4 : 3);
}

function togglePause() {
  if (!state.match) return;
  state.paused = !state.paused;
  held.clear();
  element('pause').textContent = state.paused ? 'Resume' : 'Pause';
  audio.pause(state.paused);
}

function setView(view) {
  const previousView = state.view;
  held.clear();
  state.view = view;
  element('play-controls').hidden = view !== 'play';
  element('frame-controls').hidden = view !== 'frames';
  element('sound-controls').hidden = view !== 'sound';
  element('play-tab').setAttribute('aria-pressed', String(view === 'play'));
  element('frames-tab').setAttribute('aria-pressed', String(view === 'frames'));
  element('sound-tab').setAttribute('aria-pressed', String(view === 'sound'));
  audio.pause(view === 'play' && state.paused);
  if (view === 'play' && previousView !== 'play') playSceneAudio();
}

function chooseSound() {
  const command = Number(element('sound-command').value);
  musicTrack = command < 0x20 ? audio.music.tracks.find(track => track.command === command) : null;
  if (musicTrack) {
    soundEffect = null;
    soundWaveform = null;
    musicPreview = Array.from({length: 8}, () => new Int16Array(256).fill(-1));
    const notes = new Uint8Array(8);
    const active = new Array(8).fill(false);
    const sequence = new MusicSequencer(audio.music, event => {
      if (event.op !== 'fm') return;
      if (event.register === 8) active[event.value & 7] = Boolean(event.value & 0x78);
      if (event.register >= 0x28 && event.register < 0x30) notes[event.register - 0x28] = event.value;
    });
    sequence.command(command);
    for (let tick = 0; tick < 256; tick++) {
      sequence.tick();
      for (let channel = 0; channel < 8; channel++) if (active[channel]) musicPreview[channel][tick] = notes[channel];
    }
    element('sound-info').textContent = `Music command $${command.toString(16).toUpperCase()} · ROM $${musicTrack.source.toString(16)} · Eight FM channels and one sample channel`;
    return;
  }
  soundEffect = audio.manifest.commands.find(effect => effect.command === command);
  const sample = soundEffect.steps.find(step => step.op === 'sample');
  const bank = soundEffect.bank === 2 ? 0 : soundEffect.bank;
  const entry = sample && audio.manifest.samples.find(entry => entry.bank === bank && entry.sample === sample.sample);
  soundWaveform = entry ? decodeSample(new Uint8Array(audio.samples), bank * 0x40000 + entry.start, bank * 0x40000 + entry.end) : null;
  element('sound-info').textContent = `Command $${soundEffect.command.toString(16).toUpperCase()} · ROM $${soundEffect.source.toString(16)} · Priority ${soundEffect.priority} · ${soundEffect.bank === 2 ? 'Shared samples' : `Bank ${soundEffect.bank}`}`;
}

async function enableAudio() {
  const initializing = !audio.context;
  await audio.enable();
  audio.mute(muted);
  if (initializing && state.view === 'play') playSceneAudio();
  element('audio-toggle').textContent = muted ? 'Unmute' : 'Mute';
  element('audio-status').textContent = 'Original effects and FM music enabled.';
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
  renderer.stage.draw(match.camera, match.scenery);
  // Native actors remain between the original scrolling stage layers.
  const sorted = [...match.fighters].sort((a, b) => a.y - b.y);
  for (const actor of sorted) {
    const frames = tables.get(actor.type);
    const position = match.drawPosition(actor);
    renderer.drawPose(frames, match.pose(actor, frames), position.x, position.y, match.mirrored(actor));
  }
  renderer.stage.draw(match.camera, match.scenery, true);
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

function drawSoundExplorer() {
  renderer.clear();
  if (musicTrack) {
    renderer.text(`MUSIC $${musicTrack.command.toString(16).toUpperCase()}`, 160, 40, '#ffe64a', 20, 'center');
    renderer.text('FIRST 256 MUSIC TICKS', 160, 68, '#bdc9de', 8, 'center');
    const context = renderer.context;
    for (let channel = 0; channel < 8; channel++) {
      renderer.text(String(channel + 1), 17, 94 + channel * 15, '#bdc9de', 8);
      context.fillStyle = '#303b4d';
      context.fillRect(32, 89 + channel * 15, 256, 1);
      context.fillStyle = '#f2d13e';
      for (let tick = 0; tick < 256; tick++) {
        const note = musicPreview[channel][tick];
        if (note >= 0) context.fillRect(32 + tick, 93 + channel * 15 - (note & 15) / 2, 1, 2);
      }
    }
    return;
  }
  if (!soundEffect) return;
  const context = renderer.context;
  renderer.text(`SOUND $${soundEffect.command.toString(16).toUpperCase()}`, 160, 40, '#ffe64a', 20, 'center');
  renderer.text('FIRST SAMPLE WAVEFORM', 160, 73, '#bdc9de', 8, 'center');
  context.strokeStyle = '#46516a';
  context.beginPath();
  context.moveTo(20, 137);
  context.lineTo(300, 137);
  context.stroke();
  if (!soundWaveform) return;
  context.strokeStyle = '#f2d13e';
  context.beginPath();
  for (let x = 0; x < 280; x++) {
    const start = Math.floor(x * soundWaveform.length / 280);
    const end = Math.max(start + 1, Math.floor((x + 1) * soundWaveform.length / 280));
    let low = 0;
    let high = 0;
    for (let index = start; index < end; index++) {
      low = Math.min(low, soundWaveform[index]);
      high = Math.max(high, soundWaveform[index]);
    }
    context.moveTo(x + 20, 137 + low / 2048 * 46);
    context.lineTo(x + 20, 137 + high / 2048 * 46);
  }
  context.stroke();
  const seconds = soundWaveform.length * audio.manifest.sampleDivisor / audio.manifest.chipClock;
  renderer.text(`${seconds.toFixed(3)} SECONDS`, 160, 214, '#bdc9de', 9, 'center');
}

function input() {
  return {
    horizontal: Math.sign(Number(held.has('ArrowRight')) - Number(held.has('ArrowLeft')) + padControls.horizontal),
    vertical: Math.sign(Number(held.has('ArrowDown')) - Number(held.has('ArrowUp')) + padControls.vertical),
    strike: held.has('KeyZ') || padControls.strike, heavy: held.has('KeyX') || padControls.heavy,
    run: held.has('KeyC') || padControls.run, pin: held.has('Space') || padControls.pin,
  };
}

function pollGamepad() {
  const active = !document.hidden && document.hasFocus();
  const pad = gamepads.poll(active);
  padControls = pad.controls;
  let message = pad.error || 'Controller support ready. Connect a pad and press a button.';
  if (pad.connected) {
    message = `${pad.id}${pad.mapping === 'standard' ? '' : ' · Default button order'}`;
    if (!active) message += ' · Click the game to enable input.';
    else if (pad.waitingForNeutral) message += ' · Release the controls to resume input.';
  }
  if (element('controller-status').textContent !== message) element('controller-status').textContent = message;
  if (pad.lost && gamepadWasUsed && state.match && !state.paused) togglePause();
  if (pad.lost) gamepadWasUsed = false;
  if (pad.activity) gamepadWasUsed = true;
  if (!state.ready || element('start').disabled) return;
  if (pad.backPressed) {
    if (state.view !== 'play') setView('play');
    else if (state.match && (state.paused || state.match.winner !== null)) resetMatch();
  }
  if (pad.startPressed) {
    if (state.view !== 'play') setView('play');
    else if (!state.match || state.match.winner !== null) startMatch();
    else togglePause();
    return;
  }
  if (state.view !== 'play' || state.match) return;
  for (const [id, direction] of [['player', pad.menuHorizontal], ['opponent', pad.menuVertical]]) {
    if (!direction) continue;
    const select = element(id);
    select.selectedIndex = (select.selectedIndex + direction + select.options.length) % select.options.length;
  }
}

function frame(time) {
  accumulator += Math.min(100, time - previousTime);
  previousTime = time;
  pollGamepad();
  if (state.ready) {
    while (accumulator >= 1000 / rules.frameRate) {
      if (state.view === 'play' && state.match && !state.paused) {
        state.match.step(input());
        for (const command of state.match.takeSoundCommands()) audio.command(command);
      }
      if (state.view === 'frames' && state.cycling && ++cycleTicks % 8 === 0) {
        setPose((state.pose + 1) % tables.get(state.actor).length);
      }
      accumulator -= 1000 / rules.frameRate;
    }
    if (state.view === 'sound') drawSoundExplorer();
    else if (state.view === 'frames') drawExplorer();
    else if (state.match) drawMatch();
    else drawSelection();
  } else accumulator = 0;
  requestAnimationFrame(frame);
}

element('start').addEventListener('click', startMatch);
element('reset').addEventListener('click', resetMatch);
element('pause').addEventListener('click', togglePause);
element('play-tab').addEventListener('click', () => setView('play'));
element('frames-tab').addEventListener('click', () => setView('frames'));
element('sound-tab').addEventListener('click', () => setView('sound'));
element('sound-command').addEventListener('change', chooseSound);
audio.onError = message => { element('audio-status').textContent = message; };
element('audio-toggle').addEventListener('click', async () => {
  element('audio-toggle').disabled = true;
  try {
    if (!audio.context) await enableAudio();
    else {
      muted = !muted;
      audio.mute(muted);
      element('audio-toggle').textContent = muted ? 'Unmute' : 'Mute';
    }
  } catch (error) { element('audio-status').textContent = error.message; }
  finally { element('audio-toggle').disabled = false; }
});
element('play-sound').addEventListener('click', async () => {
  try {
    await enableAudio();
    audio.command(Number(element('sound-command').value));
  } catch (error) { element('audio-status').textContent = error.message; }
});
element('stop-sound').addEventListener('click', () => audio.stop());
element('fade-music').addEventListener('click', () => audio.command(0x1f));
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
    gamepadWasUsed = false;
    event.preventDefault();
    togglePause();
    return;
  }
  if (event.target.tagName === 'BUTTON') return;
  if (gameKeys.has(event.code)) { event.preventDefault(); held.add(event.code); gamepadWasUsed = false; }
  if (event.code === 'Enter' && !event.repeat && state.view === 'play') { event.preventDefault(); startMatch(); }
});
window.addEventListener('keyup', event => held.delete(event.code));
function suspendInput() {
  held.clear();
  padControls = neutralControls();
  gamepads.suspend();
  if (gamepadWasUsed && state.match && !state.paused) togglePause();
}
window.addEventListener('blur', suspendInput);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspendInput();
  previousTime = performance.now();
  accumulator = 0;
});
for (const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    gamepadWasUsed = false;
    button.setPointerCapture(event.pointerId);
    held.add(button.dataset.key);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => held.delete(button.dataset.key));
}

try {
  await Promise.all([renderer.load(), audio.load()]);
  await Promise.all([prepareActor(0), prepareActor(6), prepareActor(12)]);
  state.ready = true;
  element('status').textContent = '';
  for (const id of ['start', 'reset', 'pause', 'audio-toggle']) element(id).disabled = false;
  const effects = document.createElement('optgroup');
  effects.label = 'Sample effects';
  for (const effect of audio.manifest.commands) {
    effects.append(new Option(`$${effect.command.toString(16).toUpperCase()}${effect.command === 0x2a ? ' · Coin' : ''}`, String(effect.command)));
  }
  element('sound-command').append(effects);
  const music = document.createElement('optgroup');
  music.label = 'FM music';
  for (const track of audio.music.tracks) {
    music.append(new Option(`$${track.command.toString(16).toUpperCase()}${track.command >= 19 ? ' · Silent' : ''}`, String(track.command)));
  }
  element('sound-command').append(music);
  element('sound-command').value = String(0x2a);
  chooseSound();
  setPose(0);
} catch (error) {
  element('status').textContent = `Asset loading failed. ${error.message}`;
}
requestAnimationFrame(frame);
