// Original-program references, using an external offline research CPU.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [hardwarePath, programPath, outputPath] = process.argv.slice(2);
const {default: MC68000} = await import(pathToFileURL(hardwarePath));
const memory = new Uint8Array(0x200000);
memory.set(readFileSync(programPath));
const cpu = new MC68000(), sounds = [];
for (let page = 0; page < 0x2000; page++) {
  cpu.memorymap[page].base = memory.subarray(page * 256, (page + 1) * 256);
  cpu.memorymap[page].write = null;
}
cpu.memorymap[0x1400].write16 = (address, value) => { if (address === 0x14000c) sounds.push(value & 255); };
const word = address => memory[address] * 256 + memory[address + 1];
const long = address => (word(address) * 65536 + word(address + 2)) | 0;
const putWord = (address, value) => { memory[address] = value >> 8; memory[address + 1] = value; };
const putLong = (address, value) => { putWord(address, value >>> 16); putWord(address + 2, value); };
const actor = 0x1c05b0, target = actor + 0x10c;
function call(address, current = actor) {
  cpu.pc = address; cpu.sr = 0x2700; cpu.a[7] = 0x1c3a00; cpu.a[0] = current;
  cpu.a[1] = current === actor ? target : actor;
  putLong(cpu.a[7], 0x7ff00);
  let steps = 0;
  while (cpu.pc !== 0x7ff00 && steps++ < 50000) cpu._execute();
  assert(steps < 50000, `Running attack did not return: $${cpu.pc.toString(16)}`);
}
putWord(0x1c007c, 1);
const selections = [], unique = new Map();
for (let type = 0; type < 12; type++) for (const severity of [0,1,2]) {
  for (const toggle of [0,128]) for (const buttons of [1,2,3]) {
    memory.fill(0, actor, target + 0x10c);
    putWord(actor + 2, type); putWord(actor + 0x20, 0x8002);
    putLong(actor + 0x7a, target); putLong(actor + 0x82, target);
    memory[actor + 0x62] = toggle; memory[actor + 0xa3] = buttons;
    putWord(target + 0x70, severity);
    call(0xd0c6);
    const action = word(actor + 0x60);
    selections.push({type, severity, toggle, buttons, action, nextToggle: memory[actor + 0x62], state: word(actor + 0x20)});
    unique.set(`${type}:${action}`, {type, action});
  }
}
const scenarios = [];
for (const {type, action} of unique.values()) for (const facing of [0,0x8000]) {
  for (const x of [475,640,790]) for (const fraction of [0,0x1234]) {
    const initial = {type, action, facing, pose: facing ^ 9, clock: {flags:0xc002, remaining:2, index:0},
      xFixed: x * 65536 + fraction, yFixed: 336 * 65536 + fraction,
      zFixed: 320 * 65536 + fraction, speed: memory[0x10f8a + type],
      direction: facing ? 64 : 192, flags33:16, movementMode:1};
    memory.fill(0, actor, target + 0x10c);
    memory[actor] = 128; memory[actor + 1] = 1;
    putWord(actor + 2, type); putWord(actor + 4, initial.pose); putWord(actor + 0x90, initial.pose);
    putWord(actor + 0x1c, 0xc002); putWord(actor + 0x20, 5); putWord(actor + 0x60, action);
    putWord(actor + 0x22, 2); putWord(actor + 0x2e, facing);
    putWord(actor + 0x2a, initial.speed); putWord(actor + 0x2c, initial.direction);
    memory[actor + 0x33] = 16;
    putLong(actor + 6, initial.xFixed); putLong(actor + 10, initial.yFixed); putLong(actor + 14, initial.zFixed);
    const hash = createHash('sha256'), rows = [];
    for (let tick = 0; tick < 260; tick++) {
      sounds.length = 0; putWord(0x1c1150,0); putWord(0x1c11b0,0);
      const state = word(actor + 0x20);
      if (!(state & 0x8000)) {
        putWord(actor + 0x1e, word(actor + 0x1c)); putWord(actor + 0x1c,state); putWord(actor + 0x20,state|0x8000);
      }
      putWord(actor + 0x36,0);
      if (memory[actor + 1]) {
        call(0x27302);
        for (const [position, correction] of [[6,0x38],[10,0x3a],[14,0x3c]]) putWord(actor+position,word(actor+position)+word(actor+correction));
      }
      call(0x1b27e); call(0x2218); call(0x232b6);
      const row = [word(actor+0x20)&255, word(actor+0x60), word(actor+0x64),word(actor+0x1c),word(actor+0x22),word(actor+0x24),word(actor+4),
        long(actor+6),long(actor+10),long(actor+14),memory[actor+1],word(actor+0x2a),word(actor+0x2c),word(actor+0x2e),
        word(actor+0x58),word(actor+0x5a),word(actor+0x5c),word(actor+0x5e),memory[actor+0x32],memory[actor+0x33],memory[actor+0x34],
        word(actor+0x3e),word(actor+0x4c),word(actor+0x18),word(actor+0x1a),memory[actor+0x36],memory[actor+0x37],word(actor+0x68),[...sounds],word(0x1c1150),word(0x1c11b0)];
      hash.update(JSON.stringify(row)+'\n'); rows.push(row);
      if ((word(actor+0x20)&255)!==5) break;
    }
    assert(rows.length<260);
    scenarios.push({initial,count:rows.length,sha256:hash.digest('hex'),final:rows.at(-1),...(process.env.DETAIL?{rows}:{})});
  }
}
const responses = [];
for (const contact of [3,6,11,16,19,22,23,24]) for (const type of [0,4,5]) for (const facing of [0,0x8000]) {
  for (const direction of [64,192]) for (const targetFacing of [0,0x8000]) for (const flags33 of [0,16]) {
    for (const targetContact of [1,3,16,26,0x4001,0x8001]) for (const targetState of contact===3?[0,2]:[0]) {
      memory.fill(0,actor,target+0x10c); sounds.length=0;
      putWord(actor+2,type);putWord(actor+0x2e,facing);putWord(actor+0x2c,direction);putWord(actor+0x60,65);
      putWord(target+0x2e,targetFacing);putWord(target+0x4c,targetContact);memory[target+0x33]=flags33;
      putWord(target+0x20,targetState);
      cpu.a[2]=0x2411c+contact*7;cpu.a[3]=0x2411c+(targetContact&255)*7;
      call(0x23580);
      const accepted=!(cpu.sr&1);
      responses.push({contact,attacker:{type,facing,direction,action:65},target:{facing:targetFacing,contact:targetContact,flags33,state:targetState},
        response:{accepted,damage:word(target+0x68),reaction:word(target+0x64),facing:word(target+0x2e),sounds:[...sounds],
          ...(contact===3&&accepted?{selfReaction:word(actor+0x64),recoveryTimer:word(target+0x9a),selfRecoveryTimer:word(actor+0x9a)}:{})}});
    }
  }
}
const matchChoices = new Map();
for (const choice of selections) matchChoices.set(`${choice.type}:${choice.action}:${choice.severity}`, choice);
const matches = [];
const filter = process.env.MATCH_FILTER ? JSON.parse(process.env.MATCH_FILTER) : {};
for (const choice of matchChoices.values()) for (const facing of [0,0x8000]) {
  for (const attackerIndex of [0,1]) for (const distance of [40,80,120]) for (const targetRunning of choice.action===65?[false,true]:[false]) {
    const initial = {...choice, facing, attackerIndex, distance, targetRunning, frames:420};
    if (!Object.entries(filter).every(([key,value])=>initial[key]===value)) continue;
    memory.fill(0,actor,target+0x10c*2);
    const bases=[actor,target], attacker=bases[attackerIndex], victim=bases[1-attackerIndex];
    for (const base of bases) {
      memory[base]=128;
      putLong(base+0x7a,base===actor?target:actor);putLong(base+0x82,base===actor?target:actor);putLong(base+0x86,base===actor?target:actor);
      putWord(base+0x20,0x8000);putWord(base+0x1c,0x8000);putWord(base+0x4c,1);
      putWord(base+0x66,100);putWord(base+0x72,100);
      putLong(base+6,640*65536+0x1234);putLong(base+10,336*65536+0x5678);putLong(base+14,320*65536);
    }
    putWord(attacker+2,choice.type);putWord(victim+2,6);
    putLong(victim+6,(640+(facing?distance:-distance))*65536+0x1234);
    putWord(attacker+0x2e,facing);putWord(victim+0x2e,facing^0x8000);
    putWord(attacker+4,facing^9);putWord(attacker+0x90,facing^9);
    putWord(victim+4,facing^0x8000);putWord(victim+0x90,facing^0x8000);
    memory[attacker+1]=1;memory[attacker+0x33]=18;memory[attacker+0x62]=choice.toggle;
    putWord(attacker+0x20,0xc002);putWord(attacker+0x1c,0xc002);putWord(attacker+0x22,2);
    putWord(attacker+0x2a,memory[0x10f8a+choice.type]);putWord(attacker+0x2c,facing?64:192);putWord(attacker+0x4c,3);
    putWord(victim+0x66,[100,45,20][choice.severity]);putWord(victim+0x70,choice.severity);
    memory[target+0x56]=128;
    if(targetRunning){
      memory[victim+1]=1;memory[victim+0x33]=18;
      putWord(victim+0x20,0xc002);putWord(victim+0x1c,0xc002);putWord(victim+0x22,2);
      putWord(victim+4,(facing^0x8000)^9);putWord(victim+0x90,(facing^0x8000)^9);
      putWord(victim+0x2a,memory[0x10f8a+6]);putWord(victim+0x2c,facing?192:64);putWord(victim+0x4c,3);
    }
    const rows=[],hash=createHash('sha256');
    for(let tick=0;tick<initial.frames;tick++){
      sounds.length=0;
      for(const base of bases){
        memory[base+0xa3]=tick===4&&base===attacker?choice.buttons:0;
        putWord(base+0xa8,0);
        if(memory[base+0xa3])call(0xd0c6,base);
        const state=word(base+0x20)&255;
        if(state===2)call(0xe58c,base);
        if(state===0||state===1)call(0xfe28,base);
      }
      for(const base of bases){
        const state=word(base+0x20);
        if(!(state&0x8000)){putWord(base+0x1e,word(base+0x1c));putWord(base+0x1c,state);putWord(base+0x20,state|0x8000);}
        putWord(base+0x36,0);
        if(memory[base+1]){
          call(0x27302,base);
          for(const [position,correction]of [[6,0x38],[10,0x3a],[14,0x3c]])putWord(base+position,word(base+position)+word(base+correction));
        }
        call(0x1b27e,base);call(0x2218,base);
      }
      call(0x232b6);call(0x23288);call(0x2407e);
      const row={actors:bases.map(base=>{const state=word(base+0x20)&255;return[state,state===5?word(base+0x60):state===4?word(base+0x64):0,
        word(base+4),word(base+0x4c),long(base+6),long(base+10),long(base+14),word(base+0x66),word(base+0x70),word(base+0x2e),
        memory[base+1],word(base+0x18),word(base+0x1a)];}),sounds:[...sounds]};
      hash.update(JSON.stringify(row)+'\n');if(process.env.DETAIL)rows.push(row);
      for(const base of bases)if((word(base+4)&0x7fff)!==0x7fff&&(memory[base+0x26]&128)&&!word(base+0xfe))putLong(base+0x26,0);
    }
    matches.push({initial,count:initial.frames,sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
  }
}
writeFileSync(outputPath,JSON.stringify({source:'Original US rev 2 running action selection and handlers',selections,scenarios,responses,matches},null,2)+'\n');
console.log(`Recorded ${selections.length} selections and ${scenarios.length} attack sequences`);
console.log(`Recorded ${matches.length} integrated match sequences`);
