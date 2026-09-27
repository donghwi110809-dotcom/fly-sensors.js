(()=>{
"use strict";
const N=35, S={frame:0,dangerLeft:0,dangerCenter:0,dangerRight:0,nearestDanger:1,obstacleCount:0,gameState:"menu",score:0,lastScore:0};
const bg=[56,194,238];
function canvas(){return [...document.querySelectorAll("canvas")].sort((a,b)=>b.width*b.height-a.width*a.height)[0]||null}
function visible(el){if(!el)return false;const s=getComputedStyle(el);return s.visibility!=="hidden"&&s.display!=="none"&&s.opacity!=="0"}
function gameState(){
 const ins=document.querySelector(".instruct-content"), title=document.querySelector(".ui-title");
 if(visible(ins)){
   const t=(ins.textContent||"").toLowerCase();
   if(S.frame>5 && (/again|restart|다시|재시작|game over|게임 오버/.test(t))) return "over";
   if(visible(title)) return "menu";
 }
 return "play";
}
function score(){
 const t=document.querySelector(".score-text");
 const m=t&&(t.textContent||"").match(/[\d,.]+/);
 return m?Number(m[0].replace(/,/g,""))||0:S.score;
}
function scan(){
 const c=canvas(); if(!c||!c.width||!c.height)return null;
 const w=72,h=72,tmp=document.createElement("canvas");tmp.width=w;tmp.height=h;
 const x=tmp.getContext("2d",{willReadFrequently:true});
 try{x.drawImage(c,0,0,w,h);return {d:x.getImageData(0,0,w,h).data,w,h}}catch(e){return null}
}
function danger(sc){
 if(!sc)return {l:0,c:0,r:0,n:1,count:0};
 let sums=[0,0,0], nums=[0,0,0], count=0, nearest=1;
 // Player is rendered around 50% x / 40% y. Inspect the forward corridor above and around it.
 for(let y=8;y<48;y+=2)for(let x=2;x<70;x+=2){
   const i=(y*sc.w+x)*4,a=sc.d[i+3]/255;if(a<.25)continue;
   const rr=sc.d[i],g=sc.d[i+1],b=sc.d[i+2];
   // distance from the normal ocean background; sprites/rocks/objects score high
   const delta=(Math.abs(rr-bg[0])+Math.abs(g-bg[1])+Math.abs(b-bg[2]))/765;
   if(delta<.18)continue;
   const forward=Math.max(0,1-Math.abs(y-31)/31);
   const centerBias=.45+.55*(1-Math.min(1,Math.abs(x-36)/36));
   const v=delta*forward*centerBias;
   const z=x<24?0:(x<48?1:2); sums[z]+=v;nums[z]++;count++;
   if(v>.18) nearest=Math.min(nearest,Math.max(0,(40-y)/40));
 }
 const norm=(v,n)=>Math.min(1,n?v/n*5:0);
 return {l:norm(sums[0],nums[0]),c:norm(sums[1],nums[1]),r:norm(sums[2],nums[2]),n:nearest,count};
}
function read(){
 S.frame++; const d=danger(scan()); S.dangerLeft=d.l;S.dangerCenter=d.c;S.dangerRight=d.r;S.nearestDanger=d.n;S.obstacleCount=d.count;
 S.gameState=gameState();S.lastScore=S.score;S.score=score();
 const x=new Float32Array(N), max=Math.max(d.l,d.c,d.r), urgent=Math.max(0,max-.45);
 x[0]=1;x[1]=d.l;x[2]=d.c;x[3]=d.r;x[4]=max;x[5]=d.r-d.l;x[6]=d.c-(d.l+d.r)/2;
 x[7]=1-d.l;x[8]=1-d.c;x[9]=1-d.r;x[10]=urgent;x[11]=urgent*d.l;x[12]=urgent*d.c;x[13]=urgent*d.r;
 x[14]=d.l<d.r?1:0;x[15]=d.r<d.l?1:0;x[16]=d.c<Math.min(d.l,d.r)?1:0;
 x[17]=Math.min(1,d.count/350);x[18]=Math.max(0,S.score-S.lastScore)/10;x[19]=S.gameState==="play"?1:0;
 x[20]=Math.sin(S.frame*.025);x[21]=Math.cos(S.frame*.025);x[22]=Math.sin(S.frame*.006);x[23]=Math.cos(S.frame*.006);
 x[24]=d.l*d.c;x[25]=d.r*d.c;x[26]=d.l*d.r;x[27]=Math.abs(d.l-d.r);x[28]=(d.l+d.c+d.r)/3;
 x[29]=Math.max(0,d.c-Math.min(d.l,d.r));x[30]=Math.max(0,d.l-d.r);x[31]=Math.max(0,d.r-d.l);
 x[32]=1-max;x[33]=d.n;x[34]=1-d.n;
 return x;
}
window.FlySensors={count:N,read,getState:()=>({...S}),reset(){S.frame=0;S.lastScore=S.score}};
})();