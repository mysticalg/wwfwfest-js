import {actorTables} from '../data/actor-tables.js';
import {healthSeverity} from './projection.js';

const u16=value=>value&65535;

// $001e2e wires the two physical DIP banks into the game's active-high word.
export const decodeDipSwitches=(dipA,dipB)=>u16(~((dipA&255)|((dipB&255)<<8)));
// Defaults recorded by the hardware driver: A=$ef, B=$ff. Difficulty is normal,
// and the original clear-stage recovery table selects 24 points.
export const defaultMatchSettings=Object.freeze({mode:0,round:0,dipSwitches:decodeDipSwitches(0xef,0xff)});

// $00f9c2. The selection identity at $57 is distinct from control flags at $56.
// Human health survives later rounds unless the original reset byte requests it.
export function initializeHealth(actor,world=actor.world||defaultMatchSettings) {
  const computer=Boolean(actor.flags56&128);
  if(!computer){
    const reset=actor.flags104&128;actor.flags104=(actor.flags104||0)&~128;
    if(!reset&&(world.round&255))return false;
  }
  let health;
  if(!computer)health=actorTables.initialHumanHealth[(actor.flags57??actor.type)&15];
  else if(world.mode&1)health=135;
  else{
    health=actorTables.initialComputerHealth[world.round];
    if(health===undefined)throw new RangeError('Unsupported original computer health round');
    if(actor.slot!==4)health=u16(health-15);
    health=u16(health+actorTables.difficultyHealth[((world.dipSwitches||0)&0x300)>>>8]);
  }
  actor.health=actor.maximumHealth=health;actor.severity=0;return true;
}

// $02407e, one active actor. A forced result protects health and retains any
// pending request. The damage display word records the negative whole request.
export function applyActorDamage(actor) {
  const damage=u16(actor.pendingDamage||0);
  if(damage&&!u16(actor.forced||0)){
    const health=u16(actor.health);actor.health=damage>health?0:u16(health-damage);
    actor.severity=healthSeverity(actor.health,u16(actor.maximumHealth),actor.severity);
    actor.healthAccumulator=u16(-damage);actor.pendingDamage=0;
  }
  const timer=u16(actor.comboTimer||0);
  actor.comboTimer=timer?timer-1:0;
  if(!timer)actor.comboCount=0;
  if((actor.flags32&8)&&actor.idleTimer){
    actor.idleTimer=u16(actor.idleTimer-1);if(!actor.idleTimer)actor.flags32&=~8;
  }
}

// The original iterator $00251e considers nine pool records in order.
export function advanceDamageService(actors) {
  for(const actor of actors.slice(0,9))if(actor?.active)applyActorDamage(actor);
}
