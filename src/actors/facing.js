// $00fe28. Only bit 15 changes. Target anchors depend on the target's current
// downed reaction or ground hold, with unsigned word wrapping at the boundary.
export function participantFacing(actor,peer){
 let offset=0;
 if(peer.state===4)offset=(peer.reaction&255)===8?64:(peer.reaction&255)===9?16:0;
 else if(peer.state===5)offset=(peer.action&255)===34?48:(peer.action&255)===82?16:0;
 const target=((peer.xFixed>>>16)+(peer.facing&0x8000?-offset:offset))&65535;
 return target>=(actor.xFixed>>>16)?actor.facing|0x8000:actor.facing&~0x8000;
}
