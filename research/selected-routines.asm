
; Range $000400 through $00090e
000400  lea.l      $42c.l, a0
000406  clr.w      d0
000408  move.b     $1c0067.l, d0
00040e  andi.w     #$3, d0
000412  lsl.w      #$1, d0
000414  move.b     (a0, d0.w), $1c004b.l
00041c  move.b     $1(a0, d0.w), $1c004d.l
000424  clr.w      $1c004e.l
00042a  rts        
00042c  btst.l     d0, d1
00042e  btst.l     d0, d2
000430  andi.b     #$1, d1
000434  movem.l    d0-d2, -(a7)
000438  clr.w      $140016.l
00043e  bsr.b      $4bc
000440  move.w     $1c0054.l, d0
000446  move.b     #$0, d1
00044a  move.b     $1c0010.l, d2
000450  bsr.w      $48c
000454  move.w     d0, $1c0054.l
00045a  move.b     d2, $1c0010.l
000460  move.w     $1c0078.l, d0
000466  move.b     #$1, d1
00046a  move.b     $1c0011.l, d2
000470  bsr.w      $48c
000474  move.w     d0, $1c0078.l
00047a  move.b     d2, $1c0011.l
000480  clr.w      $140002.l
000486  movem.l    (a7)+, d0-d2
00048a  rte        
00048c  btst.l     d1, $140020.l
000492  beq.b      $4ee
000494  cmpi.w     #$1, d0
000498  bcs.b      $4b0
00049a  cmpi.b     #$4, d2
00049e  bcs.b      $4ac
0004a0  cmpi.w     #$360, d0
0004a4  bcc.w      $556
0004a8  bsr.b      $4f2
0004aa  clr.b      d2
0004ac  clr.w      d0
0004ae  rts        
0004b0  clr.w      d0
0004b2  cmpi.b     #$a, d2
0004b6  bcc.b      $4ba
0004b8  addq.b     #$1, d2
0004ba  rts        
0004bc  btst.b     #$2, $140020.l
0004c4  beq.b      $4de
0004c6  cmpi.b     #$1e, $1c0056.l
0004ce  bls.b      $4d6
0004d0  addq.b     #$1, $1c004f.l
0004d6  clr.b      $1c0056.l
0004dc  rts        
0004de  tst.b      $1c0056.l
0004e4  bmi.b      $4ec
0004e6  addq.b     #$1, $1c0056.l
0004ec  rts        
0004ee  addq.w     #$1, d0
0004f0  rts        
0004f2  clr.w      d1
0004f4  addq.b     #$1, $1c004e.l
0004fa  addq.w     #$1, $1c0052.l
000500  move.w     #$312a, $14000c.l
000508  move.b     $1c004b.l, d1
00050e  cmp.b      $1c004e.l, d1
000514  bhi.b      $554
000516  move.b     $1c004d.l, d1
00051c  clr.w      d2
00051e  move.b     $1c004f.l, d2
000524  add.w      d1, d2
000526  cmpi.w     #$63, d2
00052a  bcs.b      $53c
00052c  move.b     #$63, $1c004f.l
000534  clr.b      $1c004e.l
00053a  bra.b      $554
00053c  add.b      d1, $1c004f.l
000542  add.w      d1, $1c0050.l
000548  move.b     $1c004b.l, d1
00054e  sub.b      d1, $1c004e.l
000554  rts        
000556  clr.w      d0
000558  rts        
00055a  tst.w      d0
00055c  beq.b      $5ce
00055e  cmpi.b     #$2, d0
000562  beq.b      $582
000564  cmpi.b     #$1, d0
000568  beq.b      $58e
00056a  cmpi.b     #$3, d0
00056e  beq.b      $5de
000570  cmpi.b     #$4, d0
000574  beq.w      $638
000578  cmpi.b     #$5, d0
00057c  beq.b      $588
00057e  bra.w      $64e
000582  move.w     #$3, d0
000586  bra.b      $592
000588  move.w     #$2, d0
00058c  bra.b      $592
00058e  move.w     #$4, d0
000592  btst.l     d0, $1c0067.l
000598  bne.b      $5ce
00059a  tst.b      $1c004e.l
0005a0  beq.b      $5ac
0005a2  subq.b     #$1, $1c004e.l
0005a8  bra.w      $648
0005ac  tst.b      $1c004f.l
0005b2  beq.w      $64e
0005b6  subq.b     #$1, $1c004f.l
0005bc  move.b     $1c004b.l, $1c004e.l
0005c6  subq.b     #$1, $1c004e.l
0005cc  bra.b      $648
0005ce  tst.b      $1c004f.l
0005d4  beq.b      $64e
0005d6  subq.b     #$1, $1c004f.l
0005dc  bra.b      $648
0005de  btst.b     #$4, $1c0067.l
0005e6  bne.b      $638
0005e8  move.w     $1c0066.l, d0
0005ee  andi.w     #$3, d0
0005f2  beq.b      $638
0005f4  tst.b      $1c004f.l
0005fa  bne.b      $606
0005fc  cmpi.b     #$2, $1c004e.l
000604  bcs.b      $64e
000606  cmpi.b     #$2, $1c004e.l
00060e  bcs.b      $618
000610  subq.b     #$2, $1c004e.l
000616  bra.b      $648
000618  subq.b     #$1, $1c004f.l
00061e  move.b     $1c004e.l, d0
000624  add.b      $1c004b.l, d0
00062a  move.b     d0, $1c004e.l
000630  subq.b     #$2, $1c004e.l
000636  bra.b      $648
000638  cmpi.b     #$2, $1c004f.l
000640  bcs.b      $64e
000642  subq.b     #$2, $1c004f.l
000648  ori.b      #$1, ccr
00064c  bra.b      $652
00064e  andi.b     #$ee, ccr
000652  rts        
000654  move.w     sr, d0
000656  ori.w      #$700, d0
00065a  move.w     d0, sr
00065c  movea.l    #$1c3fd4, a0
000662  move       a0, usp
000664  moveq      #$0, d0
000666  moveq      #$0, d1
000668  moveq      #$0, d2
00066a  moveq      #$0, d3
00066c  moveq      #$0, d4
00066e  moveq      #$0, d5
000670  moveq      #$0, d6
000672  moveq      #$0, d7
000674  movea.l    #$0, a0
00067a  movea.l    #$0, a1
000680  movea.l    #$0, a2
000686  movea.l    #$0, a3
00068c  movea.l    #$0, a4
000692  movea.l    #$0, a5
000698  movea.l    #$0, a6
00069e  move.w     #$0, $184000.l
0006a6  move.w     #$0, $1c0076.l
0006ae  move.w     #$ffff, $1c007a.l
0006b6  move.w     #$0, $1c1680.l
0006be  bsr.w      $1fd0
0006c2  move.w     #$3100, $14000c.l
0006ca  move.w     sr, d0
0006cc  andi.w     #$d9ff, d0
0006d0  move.w     d0, sr
0006d2  bsr.w      $1f2e
0006d6  bsr.w      $1e2e
0006da  bsr.w      $2016
0006de  bsr.w      $1fd0
0006e2  bsr.w      $400
0006e6  move.w     #$0, $140002.l
0006ee  move.w     #$0, $140000.l
0006f6  jsr        $69d2.l
0006fc  clr.w      $1c007c.l
000702  clr.w      $1c00b2.l
000708  clr.w      $1c0076.l
00070e  jsr        $1f62.l
000714  bset.b     #$7, $1c0076.l
00071c  move.w     #$3100, $14000c.l
000724  btst.b     #$7, $1c0067.l
00072c  bne.b      $790
00072e  bsr.w      $1fd0
000732  bsr.w      $1f7c
000736  bsr.w      $1fee
00073a  bsr.w      $1fae
00073e  bsr.w      $2998
000742  clr.w      $1c0166.l
000748  move.w     #$3, $1c007e.l
000750  move.w     #$3, $1c15f4.l
000758  move.w     #$3, $1c15f8.l
000760  bsr.w      $2a16
000764  jsr        $25998.l
00076a  move.w     #$280, $1c1804.l
000772  move.w     #$600, $1c1806.l
00077a  jsr        $2608c.l
000780  jsr        $25a6a.l
000786  bsr.w      $1e7c
00078a  jsr        $25708.l
000790  bsr.w      $1fd0
000794  bsr.w      $1f7c
000798  bsr.w      $1fee
00079c  bsr.w      $1fae
0007a0  jsr        $2a16.l
0007a6  jsr        $25998.l
0007ac  move.w     #$4, d0
0007b0  jsr        $24262.l
0007b6  jsr        $25a6a.l
0007bc  bsr.w      $1e7c
0007c0  jsr        $25708.l
0007c6  bsr.w      $1fd0
0007ca  bsr.w      $1f7c
0007ce  bsr.w      $1fee
0007d2  bsr.w      $1fae
0007d6  move.w     #$3, $1c007e.l
0007de  move.w     #$3, $1c15f4.l
0007e6  move.w     #$3, $1c15f8.l
0007ee  jsr        $2a16.l
0007f4  jsr        $25998.l
0007fa  move.w     #$3c0, $1c1804.l
000802  move.w     #$600, $1c1806.l
00080a  jsr        $2608c.l
000810  jsr        $25a6a.l
000816  jsr        $1e7c.l
00081c  jsr        $25708.l
000822  bra.w      $90e
000826  btst.b     #$1, $140020.l
00082e  beq.b      $826
000830  movem.l    d0-d7/a0-a6, -(a7)
000834  btst.b     #$7, $1c0076.l
00083c  beq.w      $8fe
000840  bset.b     #$7, $1c006f.l
000848  bne.w      $8fe
00084c  btst.b     #$0, $1c006f.l
000854  beq.w      $8f6
000858  move.w     #$0, $140008.l
000860  jsr        $af7c.l
000866  jsr        $affe.l
00086c  jsr        $26238.l
000872  jsr        $2628c.l
000878  jsr        $26040.l
00087e  jsr        $28690.l
000884  jsr        $25fd2.l
00088a  jsr        $256d0.l
000890  btst.b     #$7, $1c007c.l
000898  bne.b      $8ea
00089a  bsr.w      $96a
00089e  bcc.b      $8ea
0008a0  movea.l    #$1c3bd4, a0
0008a6  movea.l    a0, a7
0008a8  movea.l    #$1c3fd4, a0
0008ae  move       a0, usp
0008b0  clr.w      $1c0076.l
0008b6  clr.w      $140000.l
0008bc  bclr.b     #$7, $1c006f.l
0008c4  bset.b     #$1, $1c006f.l
0008cc  move.w     sr, d0
0008ce  andi.w     #$fcff, d0
0008d2  andi.w     #$dfff, d0
0008d6  move.w     d0, sr
0008d8  bsr.w      $1f7c
0008dc  bsr.w      $1fee
0008e0  bsr.w      $1fae
0008e4  jmp        $5182.l
0008ea  bset.b     #$1, $1c006f.l
0008f2  bsr.w      $1ea2
0008f6  bclr.b     #$7, $1c006f.l
0008fe  movem.l    (a7)+, d0-d7/a0-a6
000902  move.w     #$0, $140000.l
00090a  rte        
00090c  rte        

; Range $001e2e through $002090
001e2e  move.w     $140020.l, d0
001e34  andi.w     #$3000, d0
001e38  asl.w      #$2, d0
001e3a  move.w     d0, $1c0066.l
001e40  move.w     $140022.l, d0
001e46  andi.w     #$3f00, d0
001e4a  or.w       d0, $1c0066.l
001e50  move.w     $140024.l, d0
001e56  andi.w     #$3f00, d0
001e5a  lsr.w      #$8, d0
001e5c  or.w       d0, $1c0066.l
001e62  move.w     $140026.l, d0
001e68  andi.w     #$300, d0
001e6c  lsr.w      #$2, d0
001e6e  or.w       d0, $1c0066.l
001e74  not.w      $1c0066.l
001e7a  rts        
001e7c  clr.w      d0
001e7e  clr.w      $1c006e.l
001e84  bset.b     #$0, $1c006f.l
001e8c  btst.b     #$1, $1c006f.l
001e94  beq.b      $1e8c
001e96  addi.w     #$1, d0
001e9a  cmpi.w     #$80, d0
001e9e  bcs.b      $1e7e
001ea0  rts        
001ea2  movem.l    d0, -(a7)
001ea6  move.w     $1c0072.l, d0
001eac  bmi.b      $1eb6
001eae  cmp.w      $1c004e.l, d0
001eb4  beq.b      $1f28
001eb6  move.w     $1c004e.l, $1c0072.l
001ec0  move.b     $1c004f.l, d0
001ec6  andi.w     #$ff, d0
001eca  jsr        $27a0.l
001ed0  move.b     d1, $1c0063.l
001ed6  clr.w      d0
001ed8  jsr        $24262.l
001ede  jsr        $25348.l
001ee4  cmpi.b     #$1, $1c004b.l
001eec  beq.b      $1f28
001eee  tst.b      $1c004e.l
001ef4  beq.b      $1f16
001ef6  move.w     #$2, d0
001efa  jsr        $25348.l
001f00  move.w     #$3, d0
001f04  jsr        $25348.l
001f0a  move.w     #$25, d0
001f0e  jsr        $24262.l
001f14  bra.b      $1f28
001f16  clr.l      $c1e94.l
001f1c  clr.l      $c1e98.l
001f22  clr.l      $c1e9c.l
001f28  movem.l    (a7)+, d0
001f2c  rts        
001f2e  movem.l    a0, -(a7)
001f32  lea.l      $1c0060.l, a0
001f38  clr.b      (a0)+
001f3a  cmpa.l     #$1c3ad4, a0
001f40  bcs.b      $1f38
001f42  movem.l    (a7)+, a0
001f46  rts        
001f48  movem.l    a0, -(a7)
001f4c  lea.l      $1c05ac.l, a0
001f52  clr.b      (a0)+
001f54  cmpa.l     #$1c1cd4, a0
001f5a  bcs.b      $1f52
001f5c  movem.l    (a7)+, a0
001f60  rts        
001f62  movem.l    a0, -(a7)
001f66  lea.l      $1c0160.l, a0
001f6c  clr.b      (a0)+
001f6e  cmpa.l     #$1c1cd4, a0
001f74  bcs.b      $1f6c
001f76  movem.l    (a7)+, a0
001f7a  rts        
001f7c  movem.l    d0/a0-a1, -(a7)
001f80  lea.l      $1c16d2.l, a0
001f86  clr.l      (a0)+
001f88  cmpa.l     #$1c19ae, a0
001f8e  bcs.b      $1f86
001f90  lea.l      $80000.l, a0
001f96  lea.l      $82000.l, a1
001f9c  move.w     #$3ff, d0
001fa0  clr.l      (a0)+
001fa2  clr.l      (a1)+
001fa4  dbra       d0, $1fa0
001fa8  movem.l    (a7)+, d0/a0-a1
001fac  rts        
001fae  movem.l    d0/a0, -(a7)
001fb2  lea.l      $c0000.l, a0
001fb8  move.w     #$7ff, d0
001fbc  clr.l      (a0)+
001fbe  dbra       d0, $1fbc
001fc2  bset.b     #$7, $1c0072.l
001fca  movem.l    (a7)+, d0/a0
001fce  rts        
001fd0  movem.l    d0/a0, -(a7)
001fd4  lea.l      $c0000.l, a0
001fda  move.w     #$fff, d0
001fde  move.l     #$ffc5ff04, (a0)+
001fe4  dbra       d0, $1fde
001fe8  movem.l    (a7)+, d0/a0
001fec  rts        
001fee  lea.l      $1c19b2.l, a0
001ff4  clr.l      (a0)+
001ff6  cmpa.l     #$1c1cd0, a0
001ffc  bcs.b      $1ff4
001ffe  lea.l      $c2000.l, a0
002004  move.w     #$3ff, d0
002008  clr.l      (a0)+
00200a  dbra       d0, $2008
00200e  clr.w      $140008.l
002014  rts        
002016  move.w     #$81, $100008.l
00201e  move.w     #$50, $10000c.l
002026  move.w     #$ab, $140006.l
00202e  move.w     #$78, $140010.l
002036  move.w     #$f7, $140012.l
00203e  move.w     #$1, $140014.l
002046  bclr.b     #$0, $10000b.l
00204e  btst.b     #$6, $1c0067.l
002056  beq.b      $2060
002058  bset.b     #$0, $10000b.l
002060  rts        
002062  movem.l    d0, -(a7)
002066  tst.w      $1c007c.l
00206c  bne.b      $2078
00206e  btst.b     #$5, $1c0067.l
002076  bne.b      $208a
002078  ori.w      #$3100, d0
00207c  move.w     d0, $14000c.l
002082  move.w     #$40, d0
002086  dbra       d0, $2086
00208a  movem.l    (a7)+, d0
00208e  rts        

; Range $002846 through $002998
002846  movem.l    d0-d5/a0-a5, -(a7)
00284a  clr.w      $1c19b2.l
002850  lea.l      $c2000.l, a2
002856  movea.l    #$1c1c50, a1
00285c  movea.l    #$1c19cc, a6
002862  bsr.w      $2958
002866  bsr.w      $290a
00286a  movea.l    #$1c1bd0, a1
002870  movea.l    #$1c19c8, a6
002876  bsr.w      $2958
00287a  bsr.w      $290a
00287e  movea.l    #$1c1b50, a1
002884  movea.l    #$1c19c4, a6
00288a  bsr.w      $290a
00288e  movea.l    #$1c1ad0, a1
002894  movea.l    #$1c19c0, a6
00289a  bsr.w      $2958
00289e  bsr.w      $290a
0028a2  movea.l    #$1c1a50, a1
0028a8  movea.l    #$1c19bc, a6
0028ae  bsr.w      $290a
0028b2  movea.l    #$1c19d0, a1
0028b8  movea.l    #$1c19b8, a6
0028be  bsr.w      $2958
0028c2  bsr.w      $290a
0028c6  movea.l    a2, a3
0028c8  suba.l     #$c2000, a3
0028ce  move.l     a3, d0
0028d0  lsr.l      #$4, d0
0028d2  move.w     d0, $1c19b2.l
0028d8  move.w     $1c19b4.l, d0
0028de  cmp.w      $1c19b2.l, d0
0028e4  bls.b      $28fa
0028e6  sub.w      $1c19b2.l, d0
0028ec  subq.w     #$1, d0
0028ee  clr.b      $3(a2)
0028f2  adda.w     #$10, a2
0028f6  dbra       d0, $28ee
0028fa  move.w     $1c19b2.l, $1c19b4.l
002904  movem.l    (a7)+, d0-d5/a0-a5
002908  rts        
00290a  tst.w      (a6)
00290c  beq.w      $2956
002910  move.w     (a6), d1
002912  subq.w     #$1, d1
002914  clr.w      (a6)
002916  movea.l    (a1)+, a0
002918  cmpi.b     #$ff, $21(a0)
00291e  beq.w      $2952
002922  move.w     $4(a0), d0
002926  andi.w     #$7fff, d0
00292a  cmpi.w     #$7fff, d0
00292e  beq.w      $2952
002932  movem.l    d1/a0-a1, -(a7)
002936  jsr        $c43c.l
00293c  movem.l    (a7)+, d1/a0-a1
002940  btst.b     #$7, $26(a0)
002946  beq.b      $2952
002948  tst.w      $fe(a0)
00294c  bne.b      $2952
00294e  clr.l      $26(a0)
002952  dbra       d1, $2916
002956  rts        
002958  movem.l    a2, -(a7)
00295c  move.w     (a6), d0
00295e  subq.w     #$2, d0
002960  bcs.b      $2992
002962  move.w     d0, d3
002964  movea.l    a1, a4
002966  clr.b      d2
002968  move.w     d3, d0
00296a  movea.l    $0(a4), a2
00296e  movea.l    $4(a4), a3
002972  move.w     $a(a2), d1
002976  cmp.w      $a(a3), d1
00297a  bge.b      $2986
00297c  move.l     a3, $0(a4)
002980  move.l     a2, $4(a4)
002984  moveq      #$1, d2
002986  adda.w     #$4, a4
00298a  dbra       d0, $296a
00298e  tst.b      d2
002990  bne.b      $2964
002992  movem.l    (a7)+, a2
002996  rts        

; Range $00c43c through $00c4e6
00c43c  cmpa.l     #$c3ffe, a2
00c442  bcs.b      $c446
00c444  rts        
00c446  jsr        $cee0(pc)
00c44a  cmpi.w     #$0, d0
00c44e  beq.b      $c452
00c450  rts        
00c452  movem.l    d1/a6, -(a7)
00c456  clr.l      d7
00c458  lea.l      -$28(a7), a7
00c45c  clr.w      $12(a7)
00c460  move.w     $16(a0), $2(a7)
00c466  addi.w     #$90, $2(a7)
00c46c  move.w     $14(a0), $0(a7)
00c472  addi.w     #$10, $0(a7)
00c478  movea.l    $26(a0), a1
00c47c  move.l     a1, $14(a7)
00c480  clr.b      $8(a7)
00c484  tst.w      $4(a0)
00c488  bpl.b      $c490
00c48a  bset.b     #$4, $8(a7)
00c490  move.w     $2(a0), d1
00c494  lsl.w      #$1, d1
00c496  lea.l      $3813a.l, a1
00c49c  move.w     (a1, d1.w), d0
00c4a0  lea.l      (a1, d0.w), a1
00c4a4  clr.l      d0
00c4a6  move.w     $4(a0), d0
00c4aa  lsl.w      #$1, d0
00c4ac  move.w     (a1, d0.w), d0
00c4b0  lsl.w      #$1, d1
00c4b2  lea.l      $381de.l, a1
00c4b8  movea.l    (a1, d1.w), a1
00c4bc  move.l     a1, $a(a7)
00c4c0  lea.l      (a1, d0.l), a1
00c4c4  move.w     (a1)+, d0
00c4c6  move.w     d0, d1
00c4c8  rol.w      #$3, d1
00c4ca  andi.w     #$6, d1
00c4ce  lea.l      $c4e6.l, a0
00c4d4  move.w     (a0, d1.w), d1
00c4d8  jsr        (a0, d1.w)
00c4dc  lea.l      $28(a7), a7
00c4e0  movem.l    (a7)+, d1/a6
00c4e4  rts        

; Range $025708 through $025868
025708  movem.l    d0-d7/a0-a2, -(a7)
02570c  lea.l      $1c1cd4.l, a0
025712  move.w     #$3ff, d0
025716  clr.l      (a0)+
025718  dbra       d0, $25716
02571c  move.w     $1c0076.l, d7
025722  bclr.b     #$7, $1c0076.l
02572a  btst.b     #$2, $140026.l
025732  beq.b      $2572a
025734  movea.l    #$180000, a0
02573a  movea.l    #$1c1cd4, a1
025740  jsr        $25958.l
025746  movea.l    #$182000, a0
02574c  movea.l    #$1c1ed4, a1
025752  jsr        $25958.l
025758  movea.l    #$186000, a0
02575e  movea.l    #$1c20d4, a1
025764  jsr        $25958.l
02576a  movea.l    #$188000, a0
025770  movea.l    #$1c22d4, a1
025776  jsr        $25958.l
02577c  btst.b     #$2, $140026.l
025784  bne.b      $2577c
025786  move.l     #$7, d0
02578c  movea.l    #$1c1cd4, a0
025792  movea.l    #$1c24d4, a1
025798  jsr        $25868.l
02579e  movea.l    #$1c1ed4, a0
0257a4  movea.l    #$1c26d4, a1
0257aa  jsr        $25868.l
0257b0  movea.l    #$1c20d4, a0
0257b6  movea.l    #$1c28d4, a1
0257bc  jsr        $25868.l
0257c2  movea.l    #$1c22d4, a0
0257c8  movea.l    #$1c2ad4, a1
0257ce  jsr        $25868.l
0257d4  btst.b     #$2, $140026.l
0257dc  beq.b      $257d4
0257de  movea.l    #$180000, a0
0257e4  movea.l    #$1c24d4, a1
0257ea  jsr        $25978.l
0257f0  movea.l    #$182000, a0
0257f6  movea.l    #$1c26d4, a1
0257fc  jsr        $25978.l
025802  movea.l    #$186000, a0
025808  movea.l    #$1c28d4, a1
02580e  jsr        $25978.l
025814  movea.l    #$188000, a0
02581a  movea.l    #$1c2ad4, a1
025820  jsr        $25978.l
025826  btst.b     #$2, $140026.l
02582e  bne.b      $25826
025830  btst.b     #$2, $140026.l
025838  beq.b      $25830
02583a  btst.b     #$2, $140026.l
025842  bne.b      $2583a
025844  btst.b     #$2, $140026.l
02584c  beq.b      $25844
02584e  btst.b     #$2, $140026.l
025856  bne.b      $2584e
025858  dbra       d0, $2578c
02585c  move.w     d7, $1c0076.l
025862  movem.l    (a7)+, d0-d7/a0-a2
025866  rts        