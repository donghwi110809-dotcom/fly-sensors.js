(()=>{
"use strict";
const STEP=120, HOLD=80, A=["← LEFT","→ RIGHT","↓ DOWN","⚡ BOOST"], SIZE_KEY="flybrain-panel-size-v2", POSITION_KEY="flybrain-panel-position-v1", BEST_KEY="flybrain-best-score-v1";
const $=s=>document.querySelector(s);
let running=false,timer=null,steps=0,lastState="loading",action="WAIT",episode=0,lastStart=-Infinity,bootTimer=null,learning=false;
let bestScore=0;
try{const stored=Number(localStorage.getItem(BEST_KEY));if(Number.isFinite(stored)&&stored>=0)bestScore=stored}catch{}
function fitPanel(panel,x=panel.offsetLeft,y=panel.offsetTop){
 panel.style.left=Math.max(8,Math.min(x,Math.max(8,innerWidth-panel.offsetWidth-8)))+"px";
 panel.style.top=Math.max(8,Math.min(y,Math.max(8,innerHeight-panel.offsetHeight-8)))+"px";
}
function savePosition(panel){try{localStorage.setItem(POSITION_KEY,JSON.stringify({x:panel.offsetLeft,y:panel.offsetTop}))}catch{}}
function moveUI(panel){
 const handle=$("#fly-move");let drag=null;
 try{const pos=JSON.parse(localStorage.getItem(POSITION_KEY));if(pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.y))fitPanel(panel,pos.x,pos.y)}catch{}
 handle.addEventListener("pointerdown",e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:panel.offsetLeft,top:panel.offsetTop};handle.setPointerCapture(e.pointerId)});
 handle.addEventListener("pointermove",e=>{if(drag&&drag.id===e.pointerId)fitPanel(panel,drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y)});
 function end(){if(drag){drag=null;savePosition(panel)}}
 handle.addEventListener("pointerup",end);handle.addEventListener("pointercancel",end);handle.addEventListener("lostpointercapture",end);
 handle.addEventListener("keydown",e=>{const delta={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];if(!delta)return;e.preventDefault();e.stopPropagation();fitPanel(panel,panel.offsetLeft+delta[0],panel.offsetTop+delta[1]);savePosition(panel)});
}
function key(code,k){const opts={code,key:k,bubbles:true,cancelable:true};document.dispatchEvent(new KeyboardEvent("keydown",opts));setTimeout(()=>document.dispatchEvent(new KeyboardEvent("keyup",opts)),HOLD)}
function act(a){action=A[a]||"WAIT";if(a===0)key("ArrowLeft","ArrowLeft");else if(a===1)key("ArrowRight","ArrowRight");else if(a===2)key("ArrowDown","ArrowDown");else key("KeyF","f")}
function ready(){return window.FlySensors&&window.FlyBrain&&window.FlyLearning&&document.querySelector("#game-ui")&&document.querySelector("canvas")}
function startGame(){const now=performance.now();if(now-lastStart<1200)return;lastStart=now;action="자동 시작";key("Space"," ")}
function setStatus(t){const e=$("#fly-status");if(e)e.textContent=t}
function loop(){
 if(!running||!ready())return;
 try{
 const input=FlySensors.read(),s=FlySensors.getState();
 if(s.gameState!=="play"){
  if(s.gameState==="over"&&lastState!=="over"){FlyLearning.death();episode++;FlyBrain.save()}
  if(learning){FlyLearning.stop();learning=false}
  setStatus(s.gameState==="over"?"게임 종료 · 학습 저장 · 자동 재시작":"게임 시작 대기 · 자동 시작 중");
  lastState=s.gameState;startGame();update();return;
 }
 if(!learning){FlyLearning.start();learning=true}
 lastState="play";setStatus("자동 플레이 · 화면 감지 + 학습 중");
 const d=FlyBrain.decide(input);act(d.action);steps++;update();
 }catch(e){stop();setStatus("AI 오류: "+e.message);console.error(e)}
}
function start(){if(running)return;if(!ready()){setStatus("게임 로딩 중 · 준비되면 자동 시작");return}running=true;lastStart=-Infinity;lastState="loading";$("#fly-toggle").textContent="■ AI 정지";loop();timer=setInterval(loop,STEP)}
function stop(){clearInterval(bootTimer);bootTimer=null;running=false;clearInterval(timer);timer=null;if(window.FlyLearning)FlyLearning.stop();learning=false;if(window.FlyBrain)FlyBrain.save();const b=$("#fly-toggle");if(b)b.textContent="▶ AI 시작";action="WAIT";setStatus("AI 정지 · 학습 저장됨")}
function resizeUI(panel){
 const handle=$("#fly-resize");let drag=null;
 function bounds(){return {w:Math.max(100,innerWidth-16),h:Math.max(80,innerHeight-16)}}
 function apply(w,h){const b=bounds();panel.style.width=Math.min(b.w,Math.max(Math.min(180,b.w),w))+"px";panel.style.height=Math.min(b.h,Math.max(Math.min(110,b.h),h))+"px";fitPanel(panel);savePosition(panel)}
 function save(){try{localStorage.setItem(SIZE_KEY,JSON.stringify({w:panel.offsetWidth,h:panel.offsetHeight}))}catch{}}
 try{const v=JSON.parse(localStorage.getItem(SIZE_KEY));if(v&&Number.isFinite(v.w)&&Number.isFinite(v.h))apply(v.w,v.h)}catch{}
 handle.addEventListener("pointerdown",e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();drag={id:e.pointerId,x:e.clientX,y:e.clientY,w:panel.offsetWidth,h:panel.offsetHeight};handle.setPointerCapture(e.pointerId)});
 handle.addEventListener("pointermove",e=>{if(!drag||e.pointerId!==drag.id)return;apply(drag.w+e.clientX-drag.x,drag.h+e.clientY-drag.y)});
 function end(){if(drag){drag=null;save()}}
 handle.addEventListener("pointerup",end);handle.addEventListener("pointercancel",end);handle.addEventListener("lostpointercapture",end);
 handle.addEventListener("keydown",e=>{const changes={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]};if(!changes[e.key])return;e.preventDefault();e.stopPropagation();const [x,y]=changes[e.key];apply(panel.offsetWidth+x,panel.offsetHeight+y);save()});
 $("#fly-smaller").onclick=()=>{apply(panel.offsetWidth-30,panel.offsetHeight-30);save()};
 $("#fly-larger").onclick=()=>{apply(panel.offsetWidth+30,panel.offsetHeight+30);save()};
 addEventListener("resize",()=>apply(panel.offsetWidth,panel.offsetHeight));
}
function ui(){
 if($("#flybrain-final-panel"))return;
 const p=document.createElement("section");p.id="flybrain-final-panel";p.setAttribute("aria-label","FlyBrain AI 제어 창");
 p.innerHTML='<div class="fly-content"><header><button id="fly-move" aria-label="AI 창 이동" title="잡아서 이동 또는 방향키로 이동"><b>🪰 FlyBrain AI</b> ⠿</button><span><button id="fly-smaller" aria-label="AI 창 축소">−</button><button id="fly-larger" aria-label="AI 창 확대">＋</button></span></header><div class="fly-sub">자동 시작 · 화면 감지 · 자동 재시작</div><button id="fly-toggle">▶ AI 시작</button><button id="fly-save">💾 저장</button><button id="fly-reset">↺ 리셋</button><div id="fly-status">게임 로딩 중 · 준비되면 자동 시작</div><div id="fly-score" aria-label="점수 기록"></div><div id="fly-stats"></div><div class="fly-meter"><i id="fly-danger"></i></div><div class="fly-hint">이동: 제목 드래그 · 크기: −/＋ 또는 ↘</div></div><button id="fly-resize" aria-label="AI 창 크기 조절" title="드래그 또는 방향키로 창 크기 조절">↘</button>';
 document.body.appendChild(p);
 const st=document.createElement("style");st.textContent=`#flybrain-final-panel{position:fixed;z-index:2147483647;top:8px;left:8px;width:270px;height:340px;max-width:calc(100vw - 16px);max-height:calc(100dvh - 16px);box-sizing:border-box;border:2px solid #52df8b;border-radius:16px;background:rgba(7,13,22,.94);color:#fff;font:12px/1.45 system-ui;overflow:hidden}#flybrain-final-panel .fly-content{height:100%;box-sizing:border-box;overflow:auto;padding:10px 12px 32px}#flybrain-final-panel header{display:flex;align-items:center;justify-content:space-between;gap:5px}#flybrain-final-panel b{font-size:inherit}#flybrain-final-panel header b{font-size:15px}#flybrain-final-panel .fly-sub{font-size:10px;opacity:.75;margin:2px 0 8px}#flybrain-final-panel button{border:0;border-radius:8px;padding:8px;margin:2px;font-weight:800;cursor:pointer;color:#071322;background:#edf4f7}#flybrain-final-panel #fly-move{background:transparent;color:#fff;cursor:grab;touch-action:none;user-select:none;padding:4px 0;text-align:left;flex:1;margin:0}#flybrain-final-panel #fly-move:active{cursor:grabbing}#flybrain-final-panel header span{display:flex;flex-shrink:0}#flybrain-final-panel #fly-score{margin:8px 0;padding:8px;border:1px solid #52df8b66;border-radius:8px;background:#52df8b15;font-weight:800;color:#a4ffd0}#flybrain-final-panel #fly-toggle{background:#52df8b}#flybrain-final-panel #fly-reset{background:#ff8585}#flybrain-final-panel #fly-status{margin:8px 0 4px;font-weight:800}#flybrain-final-panel .fly-meter{height:6px;background:#ffffff22;border-radius:8px;overflow:hidden;margin-top:6px}#flybrain-final-panel .fly-meter i{display:block;height:100%;width:0;background:#ffcf4a}#flybrain-final-panel .fly-hint{font-size:10px;opacity:.65;margin-top:6px}#flybrain-final-panel #fly-resize{position:absolute;right:0;bottom:0;margin:0;width:32px;height:32px;padding:0;border-radius:12px 0 10px 0;background:#52df8b;font-size:22px;cursor:nwse-resize;touch-action:none;user-select:none}`;
 document.head.appendChild(st);moveUI(p);resizeUI(p);
 $("#fly-toggle").onclick=()=>running?stop():start();
 $("#fly-save").onclick=()=>setStatus(window.FlyBrain&&FlyBrain.save()?"학습 저장 완료":"학습 저장 실패");
 $("#fly-reset").onclick=()=>{const resume=running;stop();if(window.FlyLearning)FlyLearning.resetLearning();steps=episode=0;lastState="loading";setStatus("학습 초기화 완료");update();if(resume)start()};
 update();bootTimer=setInterval(()=>{if(ready()){clearInterval(bootTimer);bootTimer=null;start()}},250);
}
function update(){const e=$("#fly-stats");if(!e)return;const s=window.FlySensors?FlySensors.getState():{},b=window.FlyBrain?FlyBrain.getStats():{},l=window.FlyLearning?FlyLearning.getStats():{},danger=Math.max(s.dangerLeft||0,s.dangerCenter||0,s.dangerRight||0);const text=($("#score-text")?.textContent||"0").replace(/,/g,"");const score=Math.max(0,parseInt(text,10)||0);
 const nativeBest=[...document.querySelectorAll("#modal-root p")].find(p=>/best score|최고 점수/i.test(p.textContent||""));
 const nativeValue=nativeBest?Number((nativeBest.textContent.replace(/,/g,"").match(/\d+/)||[0])[0]):0;
 const newBest=Math.max(bestScore,score,nativeValue);
 if(newBest!==bestScore){bestScore=newBest;try{localStorage.setItem(BEST_KEY,String(bestScore))}catch{}}
 $("#fly-score").textContent=`현재 ${score.toLocaleString()} m · 🏆 최고 ${bestScore.toLocaleString()} m`;
 e.innerHTML=`상태: <b>${s.gameState||"loading"}</b> · 행동: <b>${action}</b><br>세대: ${b.generation||0} · 판단: ${b.decisions||0}<br>생존: ${(l.survivalTime||0).toFixed(1)}초 · 최고: ${(l.bestSurvival||0).toFixed(1)}초<br>사망: ${l.deaths||0} · 회피: ${l.avoided||0}<br>보상: ${(b.totalReward||0).toFixed(2)} · 탐색: ${((b.exploration||0)*100).toFixed(1)}%<br>위험 L/C/R: ${(s.dangerLeft||0).toFixed(2)} / ${(s.dangerCenter||0).toFixed(2)} / ${(s.dangerRight||0).toFixed(2)}`;$("#fly-danger").style.width=Math.min(100,danger*100)+"%"}
window.FlyController={start,stop,toggle:()=>running?stop():start(),getState:()=>({running,steps,episode,action})};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ui);else ui();setInterval(update,500);
})();
