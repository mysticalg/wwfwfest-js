import {actorTables} from '../data/actor-tables.js';
import {ActorAnimation} from './animation.js';
import {stepMovement} from './movement.js';
import {insideRingCollision,outsideRingCollision,addPositionWord} from './ring-collision.js';
import {projectionSnapshot} from './projection.js';
import {pursuitDirection,clearAssistanceLinks} from './grapple-services.js';
import {recoverTeamHealth} from './match-services.js';

const u16=value=>value&65535;
const low=(object,key,value)=>{object[key]=(object[key]&0xff00)|(value&255);};
const high=(object,key,value)=>{object[key]=(object[key]&255)|((value&255)<<8);};
const position=(actor,key,value)=>{actor[key]=addPositionWord(actor[key],u16(value)-(actor[key]>>>16));};
const distance=(a,b)=>Math.abs(a-b);

// $01f8a2/$01f924 write the original character-layer tile/attribute words.
// Each buffer holds four rows of eight words, with the hardware $100 row stride.
export function drawCountTiles(world,number) {
  const secondary=Boolean(number&0x8000);number&=0x7fff;
  const glyph=actorTables.referee.countGlyphs[number];
  if(!glyph)throw new RangeError('Unsupported original count glyph');
  const target=world.countTiles[secondary?1:0],column=secondary||number>=10?0:2;
  for(let digit=0;digit<(number>=10?2:1);digit++)for(let row=0;row<4;row++){
    const base=row*8+column+digit*4,index=digit*8+row*2;
    target[base]=glyph[index];target[base+1]=0xea;target[base+2]=glyph[index+1];target[base+3]=0xea;
  }
}
export function clearCountTiles(world) {world.countTiles[0].fill(0);}

// $00f958 resets integer positions and the state/role words. Existing fractions,
// clocks, links and count-layer contents survive; palette allocation is supplied
// by the browser's already-loaded original palette data.
export function initializeReferee(referee) {
  referee.activeWord=0x8000;referee.movementMode=0;referee.type=12;
  position(referee,'xFixed',640);position(referee,'yFixed',408);position(referee,'zFixed',320);
  referee.change(0);referee.flags34=referee.flags35=0;referee.world.controlsRefresh=1;
  return referee;
}

// $01eb3a-$01f95e. Referee state bit 15 means pending initialization, the
// opposite convention to ordinary wrestler state words. Its byte clocks also
// advance at zero, separately from the wrestler descriptor underflow clock.
export class Referee {
  constructor(initial={}) {
    this.world=initial.world||{actors:[],mode:0,round:0,inGame:true,switchTimer:0,countWord:0,resultTimer:0,
      message:0,messageExtra:0,dipSwitches:0,countTiles:[Array(32).fill(0),Array(32).fill(0)]};
    Object.assign(this,{activeWord:0x8000,type:12,state:0,pendingState:true,xFixed:640*65536,yFixed:408*65536,zFixed:320*65536,
      movementMode:0,speed:0,direction:0,facing:0,centerX:0,centerY:0,targetX:0,targetY:0,
      flags32:0,flags33:0,flags34:0,flags35:0,offsetX:0,offsetY:0,paddingX:0,paddingY:0,paddingZ:0,
      focus:null,participants:[null,null],soundCommand:0,scenePriority:0,world:this.world},initial);
    this.participants=[...this.participants];
    this.clock=new ActorAnimation(initial.clock);
    this.collision={kind:0,flags:0,x:0,y:0,z:0,...initial.collision};this.sounds=[];
    this.world.countTiles??=[Array(32).fill(0),Array(32).fill(0)];this.world.countWord??=0;
    this.inputBlockA??=0;this.inputBlockB??=0;this.assistanceTarget??=null;this.auxiliary??=null;
  }
  // $02057e is called with the referee still in A0 in the Rumble pin path.
  // Its action-word alias therefore reads this record's target-X word at $60.
  get action() {return this.targetX;}
  // The global $1c1214 request word is this record's state word ($20).
  // Wrestler services can change it after the referee's update in the frame.
  get state() {return this.world.matchResult&255;}
  set state(value) {this.world.matchResult=((this.world.matchResult||0)&0xff00)|(value&255);}
  get pendingState() {return Boolean(this.world.matchResult&0x8000);}
  set pendingState(value) {this.world.matchResult=((this.world.matchResult||0)&0x7fff)|(value?0x8000:0);}
  change(state) {this.world.matchResult=0x8000|(state&255);}
  sound(command) {if(this.world.inGame||!(this.world.dipSwitches&32))this.sounds.push(command&255);}
  pose(value) {low(this.clock,'pose',value);}
  poseFacing() {high(this.clock,'pose',this.facing>>>8);}
  face(value) {high(this,'facing',value>>>8);}
  delay(value) {low(this.clock,'remaining',value);}
  frame(value) {low(this.clock,'index',value);}
  decrementDelay() {low(this.clock,'remaining',this.clock.remaining-1);return !(this.clock.remaining&255);}
  scanParticipants() {
    let index=0;
    for(const actor of this.world.actors.slice(0,9))if(actor?.active&&(actor.flags33&1)){
      if(index>1)throw new Error('Original midpoint service requires two main participants');
      this.participants[index++]=actor;
    }
    if(!this.participants[0]||!this.participants[1])throw new Error('Original referee participant pointers are missing');
    return this.participants;
  }
  scanHolds() {
    if(this.world.inGame)for(const actor of this.world.actors.slice(0,9)){
      if(!actor?.active)continue;
      if(actor.flags35&1){this.change(1);this.focus=actor;return true;}
      if((actor.flags35&2)&&(actor.flags33&1)){this.change(4);this.focus=actor;return true;}
    }
    return false;
  }
  center() { // $01f6d8: midpoint arithmetic truncates before adding.
    const[a,b]=this.scanParticipants();let x=a.xFixed>>>16,y=a.yFixed>>>16;
    if(!(a.flags33&64)){
      x=u16(Math.min(x,b.xFixed>>>16)+(distance(x,b.xFixed>>>16)>>>1));
      y=u16(Math.min(y,b.yFixed>>>16)+(distance(y,b.yFixed>>>16)>>>1));
    }
    this.centerX=x;this.centerY=y;
  }
  centerFlags() {
    this.flags35&=~0x18;if(this.centerX<624)this.flags35|=8;if(this.centerY<352)this.flags35|=16;
  }
  early() {
    const world=this.world;
    if(this.state===0&&world.switchTimer){
      world.switchTimer=u16(world.switchTimer-1);
      if(!world.switchTimer){this.change(2);this.focus=world.activeA;return;}
    }
    if(this.state===0||this.state===5){
      if(world.mode&1){this.centerX=616;this.centerY=344;}else this.center();
      this.centerFlags();if(!this.focus||!this.focus.forced)this.scanHolds();
    }else if(this.state===1||this.state===6){
      if(this.state===6&&(this.clock.index&255)>=6)return;
      if(!(this.focus.flags35&1)){clearCountTiles(world);this.change(5);}
    }else if(this.state===2||this.state===7){
      if(this.focus.forced){this.change(5);return;}
      if(!this.scanHolds()&&((this.focus.flags32&1)||(this.focus.state===1&&(this.focus.walkMode&255)===4))){
        if(this.focus===world.activeB)this.change(5);
        else{this.focus=world.activeB;this.change(2);}
      }
    }else if(this.state===4||this.state===8){
      if(this.focus.forced||!(this.focus.flags35&2)){this.change(5);return;}
      for(const actor of world.actors.slice(0,9))if(actor&&(actor.flags35&1)){this.focus=actor;this.change(1);return;}
    }else if(this.state===3){
      if(world.mode&2)world.switchTimer=0;
      const[a,b]=this.scanParticipants(),x=(a.xFixed>>>16),other=b.xFixed>>>16;
      const center=u16(Math.min(x,other)+(distance(x,other)>>>1)),current=this.xFixed>>>16,delta=distance(center,current);
      low(this,'direction',center<current?192:64);
      if(delta<32)this.direction^=128;
      else if(delta<40){this.speed=0;return;}
      low(this,'speed',20);
    }
  }
  collisionAt() {
    const result=(this.flags33&4?outsideRingCollision:insideRingCollision)({x:this.xFixed>>>16,y:this.yFixed>>>16,z:this.zFixed>>>16,
      facing:this.facing,flags32:this.flags32,paddingX:this.paddingX,paddingY:this.paddingY,paddingZ:this.paddingZ});
    if(!(this.flags32&32)&&(this.facing&0x8000))this.paddingX=u16(-this.paddingX);
    this.collision=result;return result;
  }
  correctPosition() {
    for(const[key,axis]of [['xFixed','x'],['yFixed','y']])this[key]=addPositionWord(this[key],this.collision[axis]);
  }
  cycleWalk(delay=8) {
    if(!this.decrementDelay())return;
    this.delay(delay);this.frame(this.clock.index-1);
    if(!(this.clock.index&255)){this.pose(0);this.frame(4);}else this.pose(this.clock.pose+1);
  }
  roam(initialized) { // $01ed6c
    if(this.world.mode&1){if(!initialized){this.clock.flags|=0x8000;this.delay(8);this.poseFacing();this.movementMode=1;}return;}
    if(!initialized){this.clock.flags|=0x8000;this.delay(8);this.frame(4);this.pose(0);this.poseFacing();this.movementMode=1;}
    let direction=(this.flags35&0x1e)>>>1;
    const delta=u16(this.centerX-(this.xFixed>>>16)),masked=direction&10;
    if(delta<8&&masked&&masked!==10){this.world.actorScratch1=masked;this.speed=0;return;}
    // $01f7d2 leaves D1 live for subsequent actor handlers. Action 29's first
    // loop has a cosmetic effect gate that reads that byte without loading it.
    this.world.actorScratch1=this.centerX;
    if(this.centerX<(this.xFixed>>>16)){direction|=16;this.facing|=0x8000;}
    low(this,'direction',actorTables.referee.walkDirections[direction]);low(this,'speed',22);
    stepMovement(this);this.collisionAt();
    if(this.collision.kind){
      this.correctPosition();this.flags35&=~6;
      if(this.collision.flags&1)this.flags35|=6;
      else if(this.collision.flags&2)this.flags35|=2;
      else if(this.collision.flags&8)this.flags35|=4;
    }
    this.cycleWalk();
  }
  approach(initialized) { // $01ee48
    const peer=this.focus;
    if(!initialized){
      this.clock.flags|=0x8000;this.face(0);this.delay(1);this.frame(4);this.pose(0);low(this,'speed',28);
      this.targetX=peer.xFixed>>>16;this.targetY=peer.yFixed>>>16;let offset=80;
      if(this.state===4){
        offset=48;this.targetY=u16(this.targetY-16);
        if(peer.state===5&&(peer.action&255)===34)this.targetY=u16(this.targetY-16);
        else if(peer.state===5&&(peer.action&255)===9)offset=80;
      }
      this.targetX=u16(this.targetX+((peer.xFixed>>>16)>640?-offset:offset));
      if(this.targetX<(this.xFixed>>>16))this.facing|=0x8000;else this.facing&=~0x8000;
      this.poseFacing();
    }
    low(this,'direction',pursuitDirection(this.xFixed>>>16,this.yFixed>>>16,this.targetX,this.targetY));
    stepMovement(this);this.collisionAt();
    const arrived=this.collision.flags?(this.correctPosition(),true):
      distance(this.xFixed>>>16,this.targetX)<6&&distance(this.yFixed>>>16,this.targetY)<6;
    if(arrived){
      if((this.clock.flags&255)===2){position(this,'yFixed',(peer.yFixed>>>16)+1);this.change(7);}
      else if((this.clock.flags&255)===1){position(this,'yFixed',(peer.yFixed>>>16)+1);this.clock.index=0;this.change(6);}
      else this.change(8);
    }else this.cycleWalk();
  }
  returnToRing(initialized) { // $01f178, also state 10's Rumble exit
    if(!initialized){
      this.clock.flags|=0x8000;low(this,'speed',22);this.pose(0);this.frame(4);this.delay(1);
      low(this,'direction',(this.clock.flags&255)===10?192:actorTables.referee.returnDirections[(this.flags35&6)>>>1]);
    }
    stepMovement(this);this.collisionAt();
    if(this.collision.kind){
      if((this.clock.flags&255)===10)this.speed=0;
      else{
        this.correctPosition();const mask=actorTables.referee.returnMasks[(this.flags35&6)>>>1];
        if((this.collision.flags&mask)===mask){this.change(0);return;}
      }
    }
    this.cycleWalk(6);
  }
  victorySound() {this.sound(this.world.round===4||this.world.round===9?9:5);}
  pinCount(initialized) { // $01f248
    const world=this.world,peer=this.focus,victim=peer.auxiliary;
    if(!initialized){
      this.clock.flags|=0x8000;world.countWord=0;this.clock.index=0;this.soundCommand=0x3162;
      this.face(peer.facing);this.poseFacing();this.delay(20);this.pose(4);
    }
    if(!this.decrementDelay())return;
    this.frame(this.clock.index+1);
    // Rumble can unlink the victim during the final 72-update tail. The source
    // then attempts $109 through a null pointer; the ROM mapping ignores it.
    if(victim)victim.pinStatus=(victim.pinStatus&0xff00)|(((victim.pinStatus||0)+1)&255);
    if((this.clock.index&255)===7){
      clearCountTiles(world);
      if(world.mode&1)this.change(5);else{this.change(9);peer.resultPose=4;}return;
    }
    if(!(this.clock.index&1)){
      high(world,'countWord',(world.countWord>>>8)+1);drawCountTiles(world,this.clock.index>>>1);
      this.sound(this.soundCommand);this.soundCommand=u16(this.soundCommand+1);
    }
    if((this.clock.pose&255)===5){this.delay(56);this.pose(6);}else{this.delay(32);this.pose(5);}
    if((this.clock.index&255)!==6)return;
    this.delay(this.clock.remaining+16);
    if(world.mode&1){clearAssistanceLinks(this);peer.eliminations=u16((peer.eliminations||0)+1);victim.flags32|=16;}
    else{
      peer.forced=peer.partner.forced=0x4000;victim.forced=victim.partner.forced=0x4001;
      world.resultTimer=0;recoverTeamHealth(world.actors,world.dipSwitches);
    }
  }
  countout(initialized) { // $01ef84, including the shared $01f01a service
    const world=this.world;
    if(!initialized){this.clock.flags|=0x8000;world.countWord=0;this.clock.index=0;this.soundCommand=0x3165;this.delay(8);this.pose(9);this.poseFacing();}
    stepMovement(this);
    const x=this.xFixed>>>16;if(x<664)position(this,'xFixed',664);else if(x>=912)position(this,'xFixed',912);
    this.clock.remaining=u16(this.clock.remaining-1);
    if(!this.clock.remaining){
      this.delay(8);
      if((this.clock.pose&255)===12)this.pose(9);
      else{this.pose(this.clock.pose+1);if((this.clock.pose&255)===12)this.delay(this.clock.remaining+4);}
      this.poseFacing();
    }
    if((world.countWord&255)===20)return;
    this.clock.index=u16(this.clock.index+1);if(this.clock.index<80)return;this.clock.index=0;world.countWord=u16(world.countWord+1);
    if((world.countWord&255)===20){const[a,b]=this.scanParticipants();if(!(a.flags33&4)&&!(b.flags33&4))return;}
    drawCountTiles(world,world.countWord);
    if((world.countWord&255)<17)return;
    this.sound(this.soundCommand);this.soundCommand=u16(this.soundCommand+1);
    if((world.countWord&255)!==20)return;
    this.clock.remaining=0x1000;const[a,b]=this.scanParticipants();
    if((a.flags33&4)&&(b.flags33&4)){
      a.forced=a.partner.forced=b.forced=b.partner.forced=0x8005;this.sound(8);world.resultTimer=0;(world.textRequests??=[]).push(82);return;
    }
    const winner=a.flags33&4?b:a,loser=winner===a?b:a;
    winner.forced=winner.partner.forced=0x8002;loser.forced=loser.partner.forced=0x8003;
    recoverTeamHealth(world.actors,world.dipSwitches);world.resultTimer=0;
    // $01f104/$01f154 inspect the losing participant's partner.
    if(loser.partner.flags56&128)this.victorySound();else{this.sound(8);(world.textRequests??=[]).push(82);}
  }
  gesture(initialized,submission) { // $01f4e0 / $01f57a
    const world=this.world,peer=this.focus;
    if(!initialized){
      this.clock.flags|=0x8000;this.delay(10);this.pose(submission&&!(peer.flags32&1)?13:7);
      this.face((peer.xFixed>>>16)>=(this.xFixed>>>16)?0x8000:0);this.poseFacing();
      if(!submission)for(const actor of [world.activeA,world.activeB]){
        if(!(actor.flags32&1))actor.flags34|=2;actor.flags34&=~1;
      }
    }
    if(!this.decrementDelay())return;
    const pose=this.clock.pose&255;
    if(!submission){if(pose===7){this.delay(8);this.pose(8);}else{this.delay(16);this.pose(7);}}
    else if(peer.flags32&1){if(pose===8){this.delay(8);this.pose(7);}else{this.delay(10);this.pose(8);}}
    else if(pose===13){this.delay(8);this.pose(14);}else{this.delay(10);this.pose(13);}
  }
  victory(initialized) { // $01f614
    const world=this.world,peer=this.focus;
    if(!initialized){this.clock.flags|=0x8000;this.delay(8);this.pose(15);}
    if(!this.decrementDelay())return;
    if((this.clock.pose&255)===16){
      this.victorySound();
      if(!(world.mode&1)&&!(peer.flags56&128))world.message=0x0f2a;
      else{world.messageExtra=0;world.message=0x0f2c;}
    }else if((this.clock.pose&255)===17){
      if(world.mode&1)this.change(10);
      else{
        if(peer.flags56&128)this.sound(8);
        peer.forced|=0x8000;peer.partner.forced|=0x8000;peer.auxiliary.forced|=0x8000;peer.auxiliary.partner.forced|=0x8000;this.change(5);
      }
      return;
    }
    this.pose(this.clock.pose+1);this.delay(18);
  }
  foregroundOverlay() { // $00eb24, the scene-bit-1 clipping helper record.
    this.scenePriority=1;
    const overlay=this.world.refereeOverlay??={activeWord:0,type:0,pose:0,scenePriority:0,xFixed:0,yFixed:0,zFixed:0,facing:0,offsetX:0,offsetY:0};
    overlay.scenePriority=0;overlay.activeWord=0x8000;overlay.type=14;
    const x=this.xFixed>>>16;
    if(x<656){overlay.pose=1;position(overlay,'xFixed',617);position(overlay,'zFixed',326);}
    else if(x>=944){overlay.pose=0x8001;position(overlay,'xFixed',967);position(overlay,'zFixed',326);}
    else{overlay.pose=0;position(overlay,'xFixed',x);position(overlay,'zFixed',318);}
    position(overlay,'yFixed',337);overlay.projection=projectionSnapshot(overlay);
  }
  step() {
    this.sounds=[];this.early();
    if(this.pendingState){this.clock.flags=this.state;this.pendingState=false;}
    const initialized=Boolean(this.clock.flags&0x8000),state=this.clock.flags&255;
    if(state===0)this.roam(initialized);
    else if([1,2,4].includes(state))this.approach(initialized);
    else if(state===3)this.countout(initialized);
    else if(state===5||state===10)this.returnToRing(initialized);
    else if(state===6)this.pinCount(initialized);
    else if(state===7||state===8)this.gesture(initialized,state===8);
    else if(state===9)this.victory(initialized);
    else throw new RangeError(`Unsupported referee state ${state}`);
    this.projection=projectionSnapshot(this);if(this.world.mode&2)this.foregroundOverlay();return this;
  }
}
