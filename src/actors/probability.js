// $0024dc: reject the upper 28% of each byte, at most four draws. The source
// uses a byte accumulator and an inclusive cumulative-weight comparison.
export function computerWeightedChoice(actor,weights){
 let value=50;
 for(let attempt=3;attempt>=0;attempt--){
  const candidate=(actor.random('ai',{weighted:true,attempt})&255)>>>1;
  if(candidate<100){value=candidate||1;break;}
 }
 let sum=0;
 for(let index=0;index<weights.length;index++){
  sum=(sum+weights[index])&255;if(sum>=value)return index;
 }
 throw new RangeError('Original AI probability row does not cover its draw');
}
