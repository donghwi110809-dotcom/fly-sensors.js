(()=>{
"use strict";
const STEP=120,HOLD=80,A=["← LEFT","→ RIGHT","↓ DOWN","⚡ BOOST"];
let running=false,timer=null,steps=0,lastState="menu",action="WAIT",episode=0;
function key(code,k){const o={code,key:k,bubbles:true,cancelable:true};[document,window,document.body].forEach(t=>t&&t.dispatchEvent(new KeyboardEvent("keydown",o)));setTimeout(()=>[document,window,document.body].forEach(t=>t&&t.dispatchEvent(new KeyboardEvent("keyup",o))),HOLD)}
function act(a){action=A[a]||"WAIT"; if(a===0)key("ArrowLeft","ArrowLeft");else if(a===1)key("ArrowRight","ArrowRight");else if(a===2)key("ArrowDown","ArrowDown");else key("KeyF","f")}
function startGame(){key("Space"," ");setTimeout(()=>key("Space"," "),180)}
function loop(){
 if(!running||!window.FlySensors||!window.FlyBrain)return;
 const input=FlySensors.read(), s=FlySensors.getState();
 if(lastState==="play"&&s.gameState==="over"){
   FlyLearning&&FlyLearning.death(); episode++; FlyBrain.save(); setStatus("사망 → 학습 저장 → 자동 재시작");
   setTimeout(()=>{if(running){startGame();FlyLearning&&FlyLearning.resetEpisode()}},650);
   lastState=s.gameState;update();return;
 }
 if(s.gameState==="over"){setTimeout(()=>running&&startGame(),250);lastState=s.gameState;update();return}
 if(s.gameState!=="play"){startGame();lastState=s.gameState;update();return}
 const d=FlyBrain.decide(input);act(d.action);FlyBrain.survived();steps++;lastState=s.gameState;update(d);
}
function start(){if(running)return;if(!window.FlySensors||!window.FlyBrain||!window.FlyLearning){setStatus("AI 모듈 로딩 중");return}running=true;FlyLearning.start();startGame();timer=setInterval(loop,STEP);const b=$("#fly-toggle");if(b)b.textContent="■ AI 정지";setStatus("실제 화면 감지 + 학습 중")}
function stop(){running=false;clearInterval(timer);timer=null;FlyLearning&&FlyLearning.stop();FlyBrain&&FlyBrain.save();const b=$("#fly-toggle");if(b)b.textContent="▶ AI 시작";setStatus("AI 정지 / 학습 저장됨")}
const $=s=>document.querySelector(s);
function setStatus(t){const e=$("#fly-status");if(e)e.textContent=t}
function ui(){
 if($("#flybrain-final-panel"))return;
 const p=document.createElement("div");p.id="flybrain-final-panel";
 p.innerHTML='<b>🪰 FlyBrain AI — FINAL</b><div class="sub">실제 화면 센서 · 보상학습 · 자동 재시작</div><button id="fly-toggle">▶ AI 시작</button><button id="fly-save">💾 저장</button><button id="fly-reset">↺ 리셋</button><div id="fly-status">준비 완료</div><div id="fly-stats"></div><div class="meter"><i id="fly-danger"></i></div>';
 document.body.appendChild(p);
 const st=document.createElement("style");st.textContent=`#flybrain-final-panel{position:fixed;z-index:2147483647;top:8px;left:8px;width:220px;padding:12px;border:2px solid #52df8b;border-radius:16px;background:rgba(7,13,22,.93);color:#fff;font:12px/1.45 system-ui}#flybrain-final-panel b{font-size:15px}.sub{font-size:10px;opacity:.7;margin:2px 0 8px}#flybrain-final-panel button{border:0;border-radius:8px;padding:8px;margin:2px;font-weight:800}#fly-toggle{background:#52df8b}#fly-reset{background:#ff8585}#fly-status{margin:8px 0 4px;font-weight:800}.meter{height:6px;background:#ffffff22;border-radius:8px;overflow:hidden;margin-top:6px}.meter i{display:block;height:100%;width:0;background:#ffcf4a}`;
 document.head.appendChild(st);
 $("#fly-toggle").onclick=()=>running?stop():start();$("#fly-save").onclick=()=>{FlyBrain.save();setStatus("학습 저장 완료")};$("#fly-reset").onclick=()=>{stop();FlyLearning.resetLearning();steps=episode=0;setStatus("학습 초기화 완료");update()};
 update();
}
function update(d){
 const e=$("#fly-stats");if(!e)return;const s=window.FlySensors?FlySensors.getState():{},b=window.FlyBrain?FlyBrain.getStats():{},l=window.FlyLearning?FlyLearning.getStats():{},danger=Math.max(s.dangerLeft||0,s.dangerCenter||0,s.dangerRight||0);
 e.innerHTML=`상태: <b>${s.gameState||"?"}</b> · 행동: <b>${action}</b><br>세대: ${b.generation||0} · 판단: ${b.decisions||0}<br>생존: ${(l.survivalTime||0).toFixed(1)}초 · 최고: ${(l.bestSurvival||0).toFixed(1)}초<br>사망: ${l.deaths||0} · 회피: ${l.avoided||0}<br>보상: ${(b.totalReward||0).toFixed(2)} · 탐색: ${((b.exploration||0)*100).toFixed(1)}%<br>위험 L/C/R: ${(s.dangerLeft||0).toFixed(2)} / ${(s.dangerCenter||0).toFixed(2)} / ${(s.dangerRight||0).toFixed(2)}`;
 const m=$("#fly-danger");if(m)m.style.width=Math.min(100,danger*100)+"%";
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ui);else ui();
setInterval(update,500);
window.FlyController={start,stop,toggle:()=>running?stop():start(),getState:()=>({running,steps,episode,action})};
})();