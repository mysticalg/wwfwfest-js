const u16 = value => value & 0xffff;

// $027302/$0273b4: inside the normal ring. These tests use word coordinates,
// slanted side boundaries and the original $140 mat height. Kind/flag fields
// accumulate unless the caller clears them, as the ordinary actor loop does.
export function insideRingCollision({x, y, z, facing = 0, flags32 = 0,
  paddingX = 0, paddingY = 0, paddingZ = 0, kind = 0, flags = 0}) {
  const result = {kind, flags, x: 0, y: 0, z: 0};
  if (flags32 & 0x21) return result;
  x = u16(x + (facing & 0x8000 ? -paddingX : paddingX));
  y = u16(y + paddingY);
  z = u16(z + paddingZ);
  if (y < 0x118) {
    result.flags |= 8;
    result.y = u16(0x118 - y);
    result.kind = 1;
  }
  if (y > 0x198) {
    result.flags |= 4;
    result.y = u16(0x198 - y);
    result.kind = 1;
  }
  if (z < 0x140) {
    result.flags |= 16;
    result.z = u16(0x140 - z + paddingZ);
    z = u16(paddingZ);
  }
  if (x < 0x220) {
    const boundary = u16(Math.trunc((y * 256 + 0x40000) / 0x2e0));
    if (x < boundary) {
      result.flags |= 2;
      if (z < 0x180) {
        result.x = u16(boundary - x);
        result.kind = 1;
      } else result.kind = 2;
      return result;
    }
  }
  if (x > 0x2e0) {
    const boundary = u16(-Math.trunc((y * 256 - 0xa3000) / 0x2e0));
    if (x > boundary) {
      result.flags |= 1;
      if (z < 0x180) {
        result.x = u16(boundary - x);
        result.kind = 1;
      } else result.kind = 2;
    }
  }
  return result;
}

// $0274ae: the normal scene's outside-ring plane, selected by flags33 bit 2.
export function outsideRingCollision({x,y,z,facing=0,flags32=0,paddingX=0,paddingY=0,paddingZ=0,kind=0,flags=0}) {
  const result={kind,flags,x:0,y:0,z:0};
  if(flags32&32)return result;
  x=u16(x+(facing&0x8000?-paddingX:paddingX));y=u16(y+paddingY);z=u16(z+paddingZ);
  if(z<256){result.flags|=16;result.z=u16(256-z+paddingZ);}
  if(x<455){
    const boundary=u16(Math.trunc((y*256+0x28000)/0x2e0));
    if(x<boundary){result.x=u16(boundary-x);result.flags|=2;result.kind=3;return result;}
  }
  if(x>864){
    const boundary=u16(-Math.trunc((y*256-0xba000)/0x2e0));
    if(x>boundary){result.x=u16(boundary-x);result.flags|=1;result.kind=3;}
  }
  return result;
}

// ADD.W to a long position's integer word preserves its fractional word.
export function addPositionWord(position, delta) {
  return (position + (delta << 16)) | 0;
}
