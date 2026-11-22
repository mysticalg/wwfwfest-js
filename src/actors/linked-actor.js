import {GrappleActor} from './grapple.js';
import {Knockdown} from './knockdown.js';
import {insideRingCollision,outsideRingCollision,addPositionWord} from './ring-collision.js';
import {projectionSnapshot} from './projection.js';

const knockdowns=[1,2,3,4,5,6,7,8,9,11,12,13,16,18,19,21,22,23,24,25,27,29,34,35,41];

// Stable linked identities across the translated grapple/knockdown/idle states.
// Unsupported move, counter and outside-state handoffs remain observable.
export class LinkedActor extends GrappleActor {
  get pendingTransition() {
    if(this.state===0||this.state===7)return false;
    if(this.state===4&&knockdowns.includes(this.reaction&255))return false;
    if(this.state===5&&[56,120].includes(this.action))return false;
    return super.pendingTransition;
  }

  step() {
    if(this.state===0)return this.idleStep();
    if((this.state===4&&knockdowns.includes(this.reaction&255))||this.state===7
      ||(this.state===5&&[56,120].includes(this.action))){
      const body=new Knockdown({...this,clock:this.clock,pose:this.clock.pose,
        captureTimer:this.timer,attacker:this.auxiliary||this.attacker,world:this.world});
      body.action=this.action;body.pendingState=this.pendingState;body.previousState=this.previousState&255;
      body.collision=this.collision;
      body.linkIdentity=this;
      for(const key of ['paddingX','paddingY','paddingZ','offsetX','offsetY'])body[key]=this[key]||0;
      body.step({linkedFlags34:this.opponent?.flags34||0});Object.assign(this,body);this.timer=body.captureTimer;
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
      if(this.flags34&64){this.flags34&=~64;if(this.opponent)this.opponent.flags34&=~128;this.sceneRefresh=1;}
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
