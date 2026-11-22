import {LinkedActor} from './linked-actor.js';
import {ActorAnimation} from './animation.js';
import {Referee,initializeReferee} from './referee.js';
import {canStartPin} from './pin.js';
import {cleanupGrappleLinks,startGrapple,grappleRegion} from './grapple.js';
import {ArcadeRandom} from './random.js';
import {Running} from './running.js';
import {actorTables} from '../data/actor-tables.js';
import {participantFacing} from './facing.js';
import {stepComputerGrapple} from './computer-grapple.js';
import {initializeHealth,advanceDamageService} from './match-services.js';
import {worldPosition,updateScreenPosition} from './projection.js';

// Stable original pool records for the practice match. Legacy movement/contact
// adapters synchronize into these records; grapple and pin participants stay in
// the shared native dispatcher through linked changes and recovery. Full tag/AI and
// outside dispatch remain separate work.
export class MatchActors {
 constructor(match){
  this.match=match;const world=match.world;
  this.random=new ArcadeRandom(world.randomSeed||0,world.randomRegisters);
  Object.assign(world,{rope:[0,0,0,0],scene:0,message:0,messageExtra:0,textRequests:[],switchTimer:0,resultTimer:0,controlsRefresh:0});
  this.pool=Array.from({length:9},(_,slot)=>new LinkedActor({slot,active:false,state:0x8000,flags32:1,flags56:slot<4?64:128,flags57:0,flags104:128,world}));
  world.actors=this.pool;
  for(const record of this.pool){
   record.partner=this.pool[record.slot^1]||this.pool[8];
   record.entropy=(kind,actor,context)=>this.entropy(kind,actor,context);
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
 get active(){return this.match.fighters.some(f=>f.nativeBody);}
 sync(){
  for(const fighter of this.match.fighters){
   if(fighter.nativeBody)continue;
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
   if(!body){if(fighter.standingAction)record.action=fighter.standingAction.button?114:0;if(fighter.standingReaction)record.reaction=fighter.standingReaction.kind?10:0;}
  }
 }
 beginPin(fighter,target){
  const actor=fighter.original,peer=target.original;if(!canStartPin(actor,peer))return false;
  actor.auxiliary=peer;if(!peer.auxiliary)peer.auxiliary=actor;
  actor.change(5,72);
  this.attach([fighter,target]);return true;
 }
 attach(fighters){
  for(const visible of fighters){
   const record=visible.original;
   this.match.setState(visible,'grapple');visible.nativeBody=record;visible.animation=record.clock;
   record.lastPose=record.clock.pose;
  }
 }
 entropy(kind,actor,context={}){
  const world=this.match.world;
  if(typeof world.entropy==='function')return world.entropy(kind,actor,context);
  const frame=(this.match.ticks-1)>>>0;
  if(kind==='contest')return this.random.contest(actor,context.kind,context.counter,frame);
  const registers=[...this.random.registers];
  if(kind==='ai'&&context.weighted)registers[0]=context.attempt;
  if(kind==='arbitration'){
   registers[1]=world.mode&1?actorTables.grappleRumbleWeights[actor.grappleIndex]:actorTables.grappleWeights[world.round*4+actor.grappleIndex];
   registers[2]=Math.abs((actor.yFixed>>>16)-(context.target.yFixed>>>16));registers[3]=world.mode&1?registers[3]:world.round*8;
  }
  return this.random.next(frame,registers)&(kind==='arbitration'?15:255);
 }
 arbitrate(){
  const world=this.match.world,frame=(this.match.ticks-1)>>>0;this.random.next(frame);
  for(const actor of this.pool)if(actor.active)actor.region=grappleRegion({x:actor.xFixed>>>16,y:actor.yFixed>>>16,...actor});
  if(world.grapples===false)return;
  for(const actor of this.pool){
   if(!actor.active||!actor.opponent?.active)continue;
   const peer=actor.opponent;
   const result=startGrapple(actor,peer,{...world,phase:frame,randomNibble:()=>this.entropy('arbitration',actor,{target:peer})});
   if(result)this.attach([actor.owner,peer.owner]);
  }
 }
 input(){for(const fighter of this.match.fighters)if(fighter.nativeBody){
  const body=fighter.original;if(!(body.flags56&0xc0))body.inputBlockA=body.inputBlockB=0;
  if(!(body.flags56&0xc0))body.input({pressed:fighter.pressedButtons,mask:fighter.inputMask});else body.pressedButtons=0;
  body.runInput(fighter.inputMask);
  if(!(body.flags56&0xc0)&&body.state===0){
   if(body.flags34&2){if(body.flags33&1)body.flags34&=~2;else{body.change(1);body.walkMode=4;}}
   else body.facing=participantFacing(body,body.opponent);
  }
 }}
 computer(){if(this.match.ai)for(const fighter of this.match.fighters)if(fighter.nativeBody)stepComputerGrapple(fighter.original);}
 stepReferee(){this.referee.step();this.match.soundCommands.push(...this.referee.sounds);}
 advance(fighter){
  const body=fighter.nativeBody;if(!body)return false;
  body.cameraY=this.match.camera.y;
  // The component tag graph requires four active records. Keep the current
  // two-wrestler browser adapter's dependency visible until that pool is wired.
  if(body.state===5&&(body.action&255)===102&&!body.partner?.active){
   this.match.handoff={slot:body.slot,state:body.state,action:body.action,reaction:body.reaction,reason:'tag-team-pool'};body.sounds=[];
  }else if(!body.pendingTransition)body.step();
  else if(body.forced&0x8000){
   body.sounds=[];
   this.match.winner=this.match.fighters.findIndex(f=>!(f.original.forced&1));
  }else{
   this.match.handoff={slot:body.slot,state:body.state,action:body.action,reaction:body.reaction};body.sounds=[];
  }
  this.match.soundCommands.push(...body.sounds);this.syncVisible(fighter);return true;
 }
 syncVisible(fighter){
  const body=fighter.nativeBody;if(!body)return;
  updateScreenPosition(fighter,body);fighter.animation=body.clock;fighter.projection=body.projection;
  fighter.facing=body.facing&0x8000?1:-1;fighter.contact=body.contact;fighter.movementMode=body.movementMode;
  fighter.spriteOffsetX=body.offsetX;fighter.spriteOffsetY=body.offsetY;fighter.linkedActor=body.auxiliary?.owner||null;
  for(const key of ['health','maximumHealth','severity','forced','pendingDamage','healthAccumulator','comboCount','comboTimer','flags32'])fighter[key]=body[key];
  fighter.state=body.state===5?(body.action&255)===74?'pinned':(body.action&255)===72?'pin':[75,86].includes(body.action&255)?'escaping':'grapple':
   [11,12,255].includes(body.state)?'grapple':body.state===0?'idle':'down';
 }
 finishActors(){
  cleanupGrappleLinks(this.pool);
  for(const fighter of this.match.fighters){
   this.syncVisible(fighter);const body=fighter.nativeBody;
   if(body?.state===0&&!body.pendingState&&!body.auxiliary&&!body.forced&&(!(body.flags56&128)||this.match.ai)){
    fighter.nativeBody=null;this.match.setState(fighter,'idle');fighter.animation=new ActorAnimation(body.clock);fighter.projection=body.projection;
   }else if(body&&[2,3,6].includes(body.state)&&!body.auxiliary){
    const clock=new ActorAnimation(body.clock);
    this.match.setState(fighter,'run');
    const running=new Running({...body,clock,pose:clock.pose,bounceCount:body.holdFlags});
    running.pendingState=body.pendingState;running.inputInitialized=body.inputInitialized;running.collision=body.collision;running.projection=body.projection;running.owner=fighter;
    fighter.running=running;fighter.animation=running.clock;
   }
  }
  this.match.count=this.referee.state===6?this.match.world.countWord>>>8:0;
 }
 damage(){
  const keys=['health','maximumHealth','severity','forced','pendingDamage','healthAccumulator','comboCount','comboTimer','flags32','idleTimer'];
  for(const fighter of this.match.fighters)if(!fighter.nativeBody){
   for(const key of keys)fighter.original[key]=fighter[key]||0;
  }
  advanceDamageService(this.pool);
  for(const fighter of this.match.fighters){
   if(fighter.nativeBody)this.syncVisible(fighter);
   else for(const key of keys)fighter[key]=fighter.original[key];
  }
 }
}
