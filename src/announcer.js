import {announcerTables as tables} from './data/announcer-tables.js';

// $009ba8/$009ecc: queued wrestler name and move commentary. A new request
// during a phrase is consumed rather than restarting its current sound.
export function stepAnnouncer(world){
 let pending=world.messagePending||0,index=world.messageIndex||0,timer=world.messageTimer||0;
 if(!(pending&255)){
  if(!(world.message&255))return [];
  pending=world.message;
 }else{
  if(world.message&255)world.message&=0xff00;
  timer=(timer-1)&65535;
  if(timer){world.messageTimer=timer;return [];}
 }
 const character=pending>>>8;
 let pair;
 if(character!==15){
  const type=character>=12?character-12:character;
  const actor=world.actors.find(a=>a.active&&a.flags57===type);
  if(actor&&(actor.flags33&1)){pair=tables.names[character];pending=(pending&255)|0x0f00;}
 }else{
  const phrase=tables.phrases[pending&255];
  if(!phrase)throw new RangeError('Unrecovered announcer phrase');
  if(index!==phrase.length)pair=phrase[index++];
 }
 if(!pair){world.messagePending=world.message=world.messageIndex=world.messageTimer=0;return [];}
 world.messagePending=pending;world.messageIndex=index;world.messageTimer=pair[1];
 return world.inGame||!(world.dipSwitches&32)?[pair[0]&255]:[];
}
