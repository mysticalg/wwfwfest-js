import {actorTables} from '../data/actor-tables.js';
import {recoverTeamHealth} from './match-services.js';

const u16=value=>value&65535;
const ai=actor=>Boolean(actor.flags56&128);
const human=actor=>Boolean(actor.flags33&2);
const flagAssistance=actor=>{actor.inputBlockA=(actor.inputBlockA||0)|128;};
const clearAssistance=actor=>{actor.inputBlockA=(actor.inputBlockA||0)&~128;};

// $00fea0. Held states use distinct counters, including the zero-health pin
// counter. Keep the original signed test and word wrapping.
export function initializeMash(actor,kind=1) {
  if(actor.mash&&actor.mash<0x8000)return;
  if(kind===0){
    const count=u16(42-actor.health);
    actor.mash=!actor.health?256:count&0x8000?1:count;
  }else if(kind===1){
    const quarter=actor.maximumHealth>>>2;let threshold=quarter,index=3;
    while(threshold<actor.health&&index){threshold=u16(threshold+quarter);index--;}
    actor.mash=actorTables.recoveryMashCounts[index];
  }else actor.mash=u16(actorTables.heldMashCounts[(kind-1)*3+actor.severity]-1);
}

// $00ff44, including the global prompt request used by held participants.
export function mashHeldInput(actor,pressed=0) {
  if(actor.flags56&0xc0)return;
  actor.world.mashPrompt=(actor.world.mashPrompt||0)|128;
  if(actor.mash!==0x4000&&pressed){actor.mash=u16(actor.mash-1);if(!actor.mash)actor.mash=0x4000;}
}

// $020aa4: choose the closest eligible Rumble assistant in slots 4 through 8.
export function selectRumbleAssistant(actor) {
  const world=actor.world,peer=actor.auxiliary,attack=(actor.action&255)===72;
  let selected=null;world.assistDistance=1024;
  for(const candidate of (world.actors||[]).slice(4,9)){
    if(!candidate||candidate===actor||candidate===peer||!candidate.active
      ||((candidate.inputBlockA||0)&0x88)||(candidate.flags32&16))continue;
    const target=attack?peer:actor;
    if(!target||Boolean((candidate.flags56^target.flags56)&32)!==attack)continue;
    const distance=u16(Math.abs((target.xFixed>>>16)-(candidate.xFixed>>>16))
      +Math.abs((target.yFixed>>>16)-(candidate.yFixed>>>16)));
    if(distance<world.assistDistance){world.assistDistance=distance;world.assistCandidate=candidate;selected=candidate;}
  }
  if(selected){flagAssistance(selected);selected.inputBlockB=(selected.inputBlockB||0)&~0x8000;}
  return selected;
}

// $0207dc, called when an attacker commits a pin/submission hold. The Rumble
// action-72 weighted branch belongs to a separate pin entry handler.
export function beginAttackAssistance(actor) {
  const world=actor.world,peer=actor.auxiliary;
  if(!world.inGame)return;
  if(world.mode&1){
    if((actor.action&255)===72)throw new Error('Rumble action 72 requires its weighted pin service');
    return;
  }
  if((actor.flags32&1)||!(actor.flags33&1))return;
  const partner=actor.partner;
  if(!partner)throw new Error('Attack assistance requires a partner');
  partner.flags34=(partner.flags34|1)&~2;
  if(!(partner.flags32&1)){
    world.switchTimer=250;
    if(human(partner))return;
    if(human(actor)){
      partner.flags56&=~64;actor.flags33&=~2;partner.flags33|=2;partner.flags35|=8;
    }else if(!(partner.flags74&128)){
      flagAssistance(partner);partner.assistanceTarget=peer.partner;actor.assistanceTarget=partner;
    }
  }else{
    partner.supportTimer=[72,35,26,14].includes(actor.action&255)?1:actorTables.attackAssistTimers[partner.severity];
    partner.flags34|=4;
    if(human(partner)||human(actor)){
      partner.opponent=peer.partner;
      if(!human(partner)){actor.flags33&=~2;partner.flags33|=2;partner.flags35|=8;}
    }else{flagAssistance(partner);partner.assistanceTarget=peer.partner;}
  }
}

// $020958, called by the hidden pin/submission victim.
export function beginVictimAssistance(actor) {
  const world=actor.world;
  if(!world.inGame)return;
  if(world.mode&1){
    const candidate=selectRumbleAssistant(actor);
    if(candidate){
      if((actor.action&255)===74)throw new Error('Rumble action 74 requires its weighted pin service');
      candidate.assistanceTarget=actor.auxiliary;actor.assistanceTarget=candidate;
    }
    return;
  }
  if(!(actor.flags33&1))return;
  const partner=actor.partner;
  if(!partner)throw new Error('Victim assistance requires a partner');
  partner.flags34=(partner.flags34|1)&~2;
  if(!(partner.flags32&1)){
    world.switchTimer=250;
    if(!human(partner)&&!(partner.flags74&128)){
      flagAssistance(partner);partner.assistanceTarget=actor.auxiliary;actor.assistanceTarget=partner;
    }
  }else{
    partner.supportTimer=[74,100,94].includes(actor.action&255)?1:actorTables.victimAssistTimers[partner.severity];
    partner.flags34|=4;
    if(human(partner))partner.opponent=actor.auxiliary;
    else{flagAssistance(partner);partner.assistanceTarget=actor.auxiliary;}
  }
}

// $010672 releases the partner's paired animation flags during a human hold.
export function clearPartnerMotion(actor) {
  const partner=actor.partner;
  if((actor.world.mode&1)||ai(actor)||!partner||!(partner.flags34&0xc0))return;
  partner.flags34&=~0xc0;if(partner.opponent)partner.opponent.flags34&=~0xc0;
}

// $02057e and $0204c6: release assistance and restore the original controller.
export function clearAssistanceLinks(actor) {
  actor.inputBlockB=(actor.inputBlockB||0)|0x8000;
  if(actor.assistanceTarget){
    clearAssistance(actor.assistanceTarget);actor.assistanceTarget.inputBlockB=(actor.assistanceTarget.inputBlockB||0)|0x8000;
  }
  if((actor.action&255)===83&&actor.assistanceTarget){
    const peer=actor.auxiliary;peer.inputBlockB=(peer.inputBlockB||0)|0x8000;
    if(peer.assistanceTarget){clearAssistance(peer.assistanceTarget);peer.assistanceTarget.inputBlockB=(peer.assistanceTarget.inputBlockB||0)|0x8000;}
    else throw new Error('Original action-83 assistance chain re-enters with a missing link');
  }
}
export function finishAssistance(actor) {
  if(!actor.world.inGame)return;
  if(actor.world.mode&1){clearAssistanceLinks(actor);return;}
  for(const body of [actor,actor.auxiliary]){
    if(!(body.flags33&1))continue;
    const partner=body.partner;
    if(human(body)&&human(partner))partner.flags56&=~64;
    else{
      if(human(body)||ai(body))clearAssistance(partner);
      else{body.flags33|=2;partner.flags33&=~2;partner.flags35|=32;partner.flags56|=64;}
      actor.world.controlsRefresh=(actor.world.controlsRefresh||0)|1;
    }
    if((partner.flags32&1)||(body.auxiliary.partner.flags32&1)){
      partner.flags34&=~5;partner.supportTimer=0;
    }
  }
}

// $010408. Two eligible zero-health visits are required: the first sets the
// action's completion bit, and the next performs the match/partner requests.
export function submissionComplete(actor) {
  const world=actor.world,peer=actor.auxiliary;
  if(!world.inGame||(actor.flags33&4)||!(actor.flags33&1)||!(peer.flags33&1)||peer.health)return false;
  const prior=actor.action&0x800;actor.action|=0x800;if(!prior)return false;
  if(!(world.mode&1)){
    world.matchResult=0x8009;world.resultTimer=0;actor.sounds.push(50,50);
    actor.forced=actor.partner.forced=0x8000;peer.forced=peer.partner.forced=0x8001;
    recoverTeamHealth(world.actors||[actor,peer,actor.partner,peer.partner],world.dipSwitches||0);
    actor.resultPose=4;
    if(!ai(actor)){world.message=0x0f2a;(world.textRequests??=[]).push(38);return true;}
  }
  actor.eliminations=u16((actor.eliminations||0)+1);clearAssistanceLinks(actor);return true;
}

// $0020d8/$01e382: integer direction approximation, including saturation and
// the source's asymmetrical quadrant lookup. No trigonometric approximation.
export function pursuitDirection(x,y,targetX,targetY) {
  let dx=u16(targetX-x),dy=u16(targetY-y),quadrant=0;
  if(dx&0x8000){quadrant|=1;dx=u16(-dx);}if(dy&0x8000){quadrant|=2;dy=u16(-dy);}
  dx=Math.min(dx,255);dy=Math.min(dy,255);
  const numerator=quadrant===0||quadrant===3?dx:dy;
  return (Math.trunc(numerator*64/(dx+dy||1))+actorTables.directionQuadrants[quadrant])&255;
}
export function pursuePoint(actor) {
  const x=actor.xFixed>>>16,y=actor.yFixed>>>16;
  if(Math.abs(x-actor.targetX)<8&&Math.abs(y-actor.targetY)<8)return false;
  actor.direction=(actor.direction&0xff00)|pursuitDirection(x,y,actor.targetX,actor.targetY);return true;
}
