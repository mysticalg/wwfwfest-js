import {GrappleActor} from './grapple.js';
import {Knockdown} from './knockdown.js';
import {Running} from './running.js';
import {insideRingCollision,outsideRingCollision,addPositionWord} from './ring-collision.js';
import {projectionSnapshot} from './projection.js';
import {actorTables} from '../data/actor-tables.js';
import {pinEscapeInput} from './pin.js';

const knockdowns=[1,2,3,4,5,6,7,8,9,11,12,13,14,15,16,18,19,21,22,23,24,25,27,29,33,34,35,36,37,38,41];

// Stable linked identities across the translated grapple/knockdown/idle states.
// Unsupported move, counter and outside-state handoffs remain observable.
export class LinkedActor extends GrappleActor {
  get pendingTransition() {
    if([0,2,3,6,7].includes(this.state))return false;
    if(this.state===4&&knockdowns.includes(this.reaction&255))return false;
    if(this.state===5&&[56,120].includes(this.action))return false;
    return super.pendingTransition;
  }

  change(state,action=this.action) { super.change(state,action);this.inputInitialized=false; }

  input({pressed=0,mask=0}={}) {
    if(!this.pendingState&&!this.forced&&!(this.flags56&0xc0)){
      pinEscapeInput(this,pressed);
      if(pressed&&this.mash===0x4000&&this.state===4&&!(this.opponent?.flags34&16)){
        const reaction=this.reaction&255,peer=this.auxiliary;
        const blocked=reaction===9&&peer?.state===5&&[53,14,15,35].includes(peer.action&255)&&!(peer.action&0x1000);
        if([8,9].includes(reaction)&&!blocked){this.change(5,reaction===8?56:120);this.mash=0;}
      }
    }
    return super.input({pressed,mask});
  }

  // $00e58c belongs to the input phase, before either participant updates.
  runInput(mask=0) {
    if(this.state===2){
      const initialized=Boolean(this.inputInitialized);
      this.bounceCount=this.holdFlags;Running.prototype.input.call(this,mask,Boolean(this.flags34&2));
      // $00e61e reads absolute $00a3, not the actor's sampled button byte.
      if(initialized&&this.state===2&&(actorTables.runProximityInput&3)&&(this.world.mode&1)
        &&(this.holdFlags&255)===1&&this.opponent
        &&Math.abs((this.xFixed>>>16)-(this.opponent.xFixed>>>16))<96&&!(this.timer&0x100)){
        this.timer|=0x100;if(this.contest(3))this.change(3);
      }
    }
  }

  step() {
    if(this.state===0)return this.idleStep();
    if([2,3,6].includes(this.state)){
      const body=new Running({...this,clock:this.clock,pose:this.clock.pose,bounceCount:this.holdFlags});
      body.pendingState=this.pendingState;body.inputInitialized=Boolean(this.inputInitialized);body.collision=this.collision;
      body.step({sampleInput:false,forcedStop:Boolean(this.forced&0x8000)});Object.assign(this,body);this.holdFlags=body.bounceCount;
      for(const event of body.ropeEvents){
        const index=event.side==='left'?0:2;
        if(event.strength===2||!(this.world.rope[index]&255))this.world.rope[index]=this.world.rope[index+1]=event.strength;
      }
      return this;
    }
    if((this.state===4&&knockdowns.includes(this.reaction&255))||this.state===7
      ||(this.state===5&&[56,120].includes(this.action))){
      const body=new Knockdown({...this,clock:this.clock,pose:this.clock.pose,
        captureTimer:this.timer,attacker:this.auxiliary||this.attacker,world:this.world});
      body.action=this.action;body.pendingState=this.pendingState;body.previousState=this.previousState&255;
      body.collision=this.collision;
      body.linkIdentity=this;
      for(const key of ['paddingX','paddingY','paddingZ','offsetX','offsetY'])body[key]=this[key]||0;
      body.step({pressed:this.pressedButtons,sampleRecoveryInput:false,linkedFlags34:this.opponent?.flags34||0});
      if(body.comboTimerStart)body.comboTimer=body.comboTimerStart;
      if(body.comboReset)body.comboCount=body.comboTimer=0;
      Object.assign(this,body);this.timer=body.captureTimer;
      return this;
    }
    return super.step();
  }

  idleStep() {
    this.sounds=[];
    if(this.pendingState){this.previousState=this.clock.flags&255;this.clock.flags=0;this.pendingState=false;}
    this.collision={...this.collision,kind:0,flags:0};
    if(this.movementMode){
      this.collision=(this.flags33&4?outsideRingCollision:insideRingCollision)({x:this.xFixed>>>16,y:this.yFixed>>>16,
        z:this.zFixed>>>16,facing:this.facing,flags32:this.flags32,paddingX:this.paddingX||0,paddingY:this.paddingY||0,paddingZ:this.paddingZ||0});
      for(const[key,delta]of [['xFixed','x'],['yFixed','y'],['zFixed','z']])this[key]=addPositionWord(this[key],this.collision[delta]);
    }
    const initialized=Boolean(this.clock.flags&0x8000);
    this.clock.idle(this.facing);
    if(!initialized){
      this.movementMode=0;this.flags33&=~0x58;this.flags32&=~4;
      this.mash=this.holdFlags=this.timer=0;this.offsetX=this.offsetY=this.paddingX=this.paddingY=this.paddingZ=0;
      this.flags32&=~8;
      if(!this.idleTimer)this.idleTimer=208;
      if(this.flags32&16)this.change(5,122);
      if(this.flags34&64){this.flags34&=~64;if(this.opponent)this.opponent.flags34&=~128;this.sceneRefresh=1;this.world.controlsRefresh=1;}
    }else{
      this.contact=1;
      if(!this.forced&&this.auxiliary&&(this.auxiliary.unlinkMarked||this.auxiliary.auxiliary!==this)){this.auxiliary=null;this.unlinkMarked=false;}
    }
    if(this.flags74&128){
      this.contact=14;this.offsetY=(this.offsetY&0xff00)|16;this.clock.pose=(this.flags75&1?130:126)|this.facing;
    }
    if(this.forced&0x8000){
      this.flags34&=~16;
      if(this.forced&1)this.change(5,140);
      else if(!(this.forced&2)){this.change(1);this.walkMode=12;}
    }
    this.projection=projectionSnapshot(this);return this;
  }
}
