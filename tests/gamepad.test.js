import assert from 'node:assert/strict';
import test from 'node:test';
import {GamepadInput, neutralControls} from '../src/gamepad.js';

function pad(index = 0) {
  return {index, id: `Standard pad ${index}`, mapping: 'standard', connected: true,
    axes: [0, 0, 0, 0], buttons: Array.from({length: 16}, () => ({pressed: false, value: 0}))};
}

function press(controller, index, value = true) {
  controller.buttons[index] = {pressed: value, value: Number(value)};
}

test('standard face buttons map to all four gameplay actions', () => {
  const controller = pad();
  const input = new GamepadInput(() => [controller]);
  for (const index of [0, 1, 2, 3]) press(controller, index);
  assert.deepEqual(input.poll().controls, {...neutralControls(), strike: true, heavy: true, run: true, pin: true});
});

test('stick dead zone suppresses drift and d-pad has priority over the stick', () => {
  const controller = pad();
  const input = new GamepadInput(() => [controller]);
  controller.axes = [0.24, -0.25];
  assert.deepEqual(input.poll().controls, neutralControls());
  controller.axes = [0.8, -0.8];
  assert.equal(input.poll().controls.horizontal, 1);
  assert.equal(input.poll().controls.vertical, -1);
  press(controller, 14);
  press(controller, 13);
  assert.equal(input.poll().controls.horizontal, -1);
  assert.equal(input.poll().controls.vertical, 1);
  press(controller, 15);
  assert.equal(input.poll().controls.horizontal, 0);
});

test('held start and menu directions create a single press edge', () => {
  const controller = pad();
  const input = new GamepadInput(() => [controller]);
  press(controller, 9);
  controller.axes[0] = 1;
  assert.equal(input.poll().startPressed, true);
  for (let frame = 0; frame < 120; frame++) {
    const result = input.poll();
    assert.equal(result.startPressed, false);
    assert.equal(result.menuHorizontal, 0);
  }
  press(controller, 9, false);
  controller.axes[0] = 0;
  input.poll();
  press(controller, 9);
  controller.axes[0] = -1;
  const next = input.poll();
  assert.equal(next.startPressed, true);
  assert.equal(next.menuHorizontal, -1);
});

test('sparse device slots and later devices retain the selected controller', () => {
  const controller = pad(2);
  let devices = [null, null, controller];
  const input = new GamepadInput(() => devices);
  assert.equal(input.poll().id, controller.id);
  devices = [pad(0), null, controller];
  assert.equal(input.poll().id, controller.id);
  assert.equal(input.poll().lost, false);
});

test('disconnect clears held actions and reconnect waits for neutral input', () => {
  const controller = pad();
  let devices = [controller];
  const input = new GamepadInput(() => devices);
  controller.axes[0] = 1;
  press(controller, 0);
  assert.equal(input.poll().controls.strike, true);
  devices = [];
  const disconnected = input.poll();
  assert.equal(disconnected.lost, true);
  assert.deepEqual(disconnected.controls, neutralControls());
  assert.equal(input.poll().lost, false);
  devices = [controller];
  press(controller, 9);
  const reconnect = input.poll();
  assert.equal(reconnect.waitingForNeutral, true);
  assert.equal(reconnect.startPressed, false);
  assert.deepEqual(reconnect.controls, neutralControls());
  controller.axes[0] = 0;
  press(controller, 0, false);
  press(controller, 9, false);
  input.poll();
  press(controller, 9);
  assert.equal(input.poll().startPressed, true);
});

test('background input stays neutral until held controls are released', () => {
  const controller = pad();
  const input = new GamepadInput(() => [controller]);
  press(controller, 9);
  assert.deepEqual(input.poll(false).controls, neutralControls());
  assert.equal(input.poll(true).startPressed, false);
  press(controller, 9, false);
  input.poll(true);
  press(controller, 9);
  assert.equal(input.poll(true).startPressed, true);
  input.suspend();
  assert.equal(input.poll().startPressed, false);
});

test('browser access errors release a previously active controller', () => {
  const controller = pad();
  let blocked = false;
  const input = new GamepadInput(() => {
    if (blocked) throw new Error('Controller access blocked');
    return [controller];
  });
  input.poll();
  blocked = true;
  const result = input.poll();
  assert.equal(result.error, 'Controller access blocked');
  assert.equal(result.lost, true);
  assert.deepEqual(result.controls, neutralControls());
});

test('short nonstandard pads and legacy numeric buttons remain usable', () => {
  const controller = pad();
  controller.mapping = '';
  controller.axes = [NaN];
  controller.buttons = [1, 0.1];
  const input = new GamepadInput(() => [controller]);
  assert.deepEqual(input.poll().controls, {...neutralControls(), strike: true});
});
