import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {spriteDrawOrder} from '../src/sprite-order.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/sprite-order-reference.json',import.meta.url)));
test('original sprite queues, clipping and stable depth order match 512 source cases',()=>{
 for(const c of fixture.cases)assert.deepEqual(spriteDrawOrder(c.entries,c.camera).map(entry=>entry.index),c.expected,`case ${c.index}`);
});
