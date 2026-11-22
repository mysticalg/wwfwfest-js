import {LinkedActor} from './linked-actor.js';
import {ActorAnimation} from './animation.js';
import {Referee,initializeReferee} from './referee.js';
import {canStartPin} from './pin.js';
import {cleanupGrappleLinks} from './grapple.js';
import {initializeHealth,advanceDamageService} from './match-services.js';
import {worldPosition,updateScreenPosition} from './projection.js';

// Stable original pool records for the practice match. Legacy movement/contact
// adapters synchronize into these records; pin participants stay in the shared
// native dispatcher through their linked changes and recovery. Full tag/AI and
// outside dispatch remain separate work.
export class MatchActors {
 constructor(match){
  this.match=match;const world=match.world;
  Object.assign(world,{rope:[0,0,0,0],scene:0,message:0,messageExtra:0,textRequests:[],switchTimer:0,resultTimer:0,controlsRefresh:0});
  this.pool=Array.from({length:9},(_,slot)=>new LinkedActor({slot,active:false,state:0x8000,flags32:1,flags56:slot<4?64:128,flags57:0,flags104:128,world}));
  world.actors=this.pool;
  for(const record of this.pool){
   record.partner=this.pool[record.slot^1]||this.pool[8];
   initializeHealth(record,world);
  }
  for(const fighter of match.fighters){
   const record=this.pool[fighter.slot];fighter.original=record;record.owner=fighter;record.active=true;
   record.type=fighter.type;record.flags57=fighter.type;record.flags56=fighter.flags56;record.flags33=fighter.slot?0x81:3;
  }
  const[a,b]=match.fighters.map(f=>f.original);a.opponent=b;b.opponent=a;
  world.activeA=a;world.activeB=b;
  this.referee=initializeReferee(new Referee({world}));this.sync();
 }
 get active(){return this.match.fighters.some(f=>f.pinBody);}
 sync(){
  for(const fighter of this.match.fighters){
   if(fighter.pinBody)continue;
   const record=fighter.original,body=fighter.runningAttack||fighter.knockdown||fighter.running;
   const state=body?.state??({idle:0,walk:1,strike:5,heavy:5,hurt:4}[fighter.state]??0);
   if(body)for(const key of ['speed','direction','holdFlags','timer','action','reaction','previousState','mash','recoveryTimer',
    'offsetX','offsetY','paddingX','paddingY','paddingZ','velocityX','velocityY','velocityZ','gravity',
    'flags34','flags35','flags74','flags75','unlinkMarked'])if(Object.hasOwn(body,key))record[key]=body[key];
   Object.assign(record,worldPosition(fighter),{type:fighter.type,state,pendingState:body?.pendingState??!(fighter.animation.flags&0x8000),
    clock:new ActorAnimation(fighter.animation),facing:fighter.facing>0?0x8000:0,health:fighter.health,maximumHealth:fighter.maximumHealth,
    severity:fighter.severity,forced:fighter.forced,flags56:fighter.flags56,flags33:(body?.flags33||0)|(fighter.slot?0x81:3),
    pendingDamage:fighter.pendingDamage,healthAccumulator:fighter.healthAccumulator,comboCount:fighter.comboCount,comboTimer:fighter.comboTimer,
    flags32:fighter.flags32,active:true,world:this.match.world,owner:fighter,movementMode:fighter.movementMode,
    auxiliary:body?.linked?(body.target?.owner||body.attacker?.owner)?.original||null:null});
   if(!body){record.action=fighter.standingAction?.button?114:0;record.reaction=fighter.standingReaction?0:record.reaction;}
  }
 }
 beginPin(fighter,target){
  const actor=fighter.original,peer=target.original;if(!canStartPin(actor,peer))return false;
  actor.auxiliary=peer;if(!peer.auxiliary)peer.auxiliary=actor;
  actor.change(5,72);
  for(const visible of [fighter,target]){
   const record=visible.original;
   this.match.setState(visible,'pin');visible.pinBody=record;visible.animation=record.clock;
   record.lastPose=record.clock.pose;
  }
  return true;
 }
 input(){for(const fighter of this.match.fighters)if(fighter.pinBody)fighter.original.input({pressed:fighter.pressedButtons,mask:fighter.inputMask});}
 stepReferee(){this.referee.step();this.match.soundCommands.push(...this.referee.sounds);}
 advance(fighter){
  const body=fighter.pinBody;if(!body)return false;
  body.cameraY=this.match.camera.y;
  if(!body.pendingTransition)body.step();
  else if(body.forced&0x8000){
   body.sounds=[];
   this.match.winner=this.match.fighters.findIndex(f=>!(f.original.forced&1));
  }else throw new RangeError(`Pin participant needs state ${body.state}, action ${body.action}, reaction ${body.reaction}`);
  this.match.soundCommands.push(...body.sounds);this.syncVisible(fighter);return true;
 }
 syncVisible(fighter){
  const body=fighter.pinBody;if(!body)return;
  updateScreenPosition(fighter,body);fighter.animation=body.clock;fighter.projection=body.projection;
  fighter.facing=body.facing&0x8000?1:-1;fighter.contact=body.contact;fighter.movementMode=body.movementMode;
  fighter.spriteOffsetX=body.offsetX;fighter.spriteOffsetY=body.offsetY;fighter.linkedActor=body.auxiliary?.owner||null;
  for(const key of ['health','maximumHealth','severity','forced','pendingDamage','healthAccumulator','comboCount','comboTimer','flags32'])fighter[key]=body[key];
  fighter.state=body.state===5?(body.action&255)===74?'pinned':(body.action&255)===72?'pin':'escaping':body.state===0?'idle':'down';
 }
 finishActors(){
  cleanupGrappleLinks(this.pool);
  for(const fighter of this.match.fighters){
   this.syncVisible(fighter);const body=fighter.pinBody;
   if(body?.state===0&&!body.pendingState&&!body.auxiliary&&!body.forced){
    fighter.pinBody=null;this.match.setState(fighter,'idle');fighter.animation=new ActorAnimation(body.clock);fighter.projection=body.projection;
   }
  }
  this.match.count=this.referee.state===6?this.match.world.countWord>>>8:0;
 }
 damage(){
  const keys=['health','maximumHealth','severity','forced','pendingDamage','healthAccumulator','comboCount','comboTimer','flags32','idleTimer'];
  for(const fighter of this.match.fighters)if(!fighter.pinBody){
   for(const key of keys)fighter.original[key]=fighter[key]||0;
  }
  advanceDamageService(this.pool);
  for(const fighter of this.match.fighters){
   if(fighter.pinBody)this.syncVisible(fighter);
   else for(const key of keys)fighter[key]=fighter.original[key];
  }
 }
}
