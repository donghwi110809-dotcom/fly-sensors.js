/*
 * FlyBrain × Microsoft Edge S.U.R.F.
 * FINAL CONTROLLER
 */

(() => {
  "use strict";

  const STEP_MS = 140;
  const HOLD_MS = 95;

  let running = false;
  let loopTimer = null;

  let steps = 0;
  let currentAction = "WAIT";
  let startedAt = 0;

  const ACTION_NAMES = [
    "← LEFT",
    "→ RIGHT",
    "↓ DOWN",
    "⚡ BOOST"
  ];

  // ==============================
  // KEYBOARD CONTROL
  // ==============================

  function sendKey(code, key) {
    const options = {
      code,
      key,
      bubbles: true,
      cancelable: true
    };

    const targets = [
      document,
      window,
      document.body
    ];

    for (const target of targets) {
      if (!target) continue;

      target.dispatchEvent(
        new KeyboardEvent(
          "keydown",
          options
        )
      );
    }

    setTimeout(() => {
      for (const target of targets) {
        if (!target) continue;

        target.dispatchEvent(
          new KeyboardEvent(
            "keyup",
            options
          )
        );
      }
    }, HOLD_MS);
  }

  function executeAction(action) {
    switch (action) {
      case 0:
        sendKey(
          "ArrowLeft",
          "ArrowLeft"
        );
        break;

      case 1:
        sendKey(
          "ArrowRight",
          "ArrowRight"
        );
        break;

      case 2:
        sendKey(
          "ArrowDown",
          "ArrowDown"
        );
        break;

      case 3:
        sendKey(
          "KeyF",
          "f"
        );
        break;
    }

    currentAction =
      ACTION_NAMES[action] ||
      "UNKNOWN";
  }

  // ==============================
  // AI LOOP
  // ==============================

  function aiStep() {
    if (!running) return;

    if (
      !window.FlySensors ||
      !window.FlyBrain
    ) {
      setStatus(
        "모듈 로딩 대기 중..."
      );

      return;
    }

    try {
      const input =
        FlySensors.read();

      const decision =
        FlyBrain.decide(input);

      executeAction(
        decision.action
      );

      FlyBrain.survived();

      steps++;

      updateUI(
        decision
      );

    } catch (error) {
      console.error(
        "FlyBrain step error:",
        error
      );

      setStatus(
        "AI 오류: " +
        error.message
      );
    }
  }

  // ==============================
  // START
  // ==============================

  function start() {
    if (running) return;

    if (
      !window.FlySensors ||
      !window.FlyBrain ||
      !window.FlyLearning
    ) {
      alert(
        "FlyBrain 모듈이 아직 로딩되지 않았습니다."
      );

      return;
    }

    running = true;

    startedAt =
      performance.now();

    /*
     * SPACE = S.U.R.F. 시작
     */
    sendKey(
      "Space",
      " "
    );

    FlyLearning.start();

    loopTimer =
      setInterval(
        aiStep,
        STEP_MS
      );

    const button =
      document.getElementById(
        "fly-toggle"
      );

    if (button) {
      button.textContent =
        "■ AI 정지";
    }

    setStatus(
      "AI 실행 중"
    );
  }

  // ==============================
  // STOP
  // ==============================

  function stop() {
    if (!running) return;

    running = false;

    clearInterval(
      loopTimer
    );

    loopTimer = null;

    if (window.FlyLearning) {
      FlyLearning.stop();
    }

    if (window.FlyBrain) {
      FlyBrain.save();
    }

    const button =
      document.getElementById(
        "fly-toggle"
      );

    if (button) {
      button.textContent =
        "▶ AI 시작";
    }

    setStatus(
      "AI 정지"
    );
  }

  function toggle() {
    if (running) {
      stop();
    } else {
      start();
    }
  }

  // ==============================
  // MANUAL SAVE
  // ==============================

  function saveLearning() {
    if (!window.FlyBrain) {
      return;
    }

    const ok =
      FlyBrain.save();

    if (ok) {
      flash(
        "✓ 학습 저장 완료"
      );
    } else {
      flash(
        "저장 실패"
      );
    }
  }

  // ==============================
  // RESET LEARNING
  // ==============================

  function resetLearning() {
    const yes =
      confirm(
        "지금까지 학습한 내용을 전부 초기화할까요?\n\n" +
        "신경망 가중치, 세대, 보상 기록이 초기화됩니다."
      );

    if (!yes) return;

    stop();

    if (window.FlyLearning) {
      FlyLearning.resetLearning();
    } else if (window.FlyBrain) {
      FlyBrain.resetLearning();
    }

    steps = 0;
    currentAction =
      "RESET";

    updateUI();

    flash(
      "🧠 학습 초기화 완료"
    );
  }

  // ==============================
  // MANUAL BOOST
  // ==============================

  function manualBoost() {
    sendKey(
      "KeyF",
      "f"
    );
  }

  // ==============================
  // UI
  // ==============================

  function createUI() {
    if (
      document.getElementById(
        "flybrain-final-panel"
      )
    ) {
      return;
    }

    const panel =
      document.createElement(
        "div"
      );

    panel.id =
      "flybrain-final-panel";

    panel.innerHTML = `
      <div class="fly-title">
        🪰 FlyBrain × S.U.R.F.
      </div>

      <div class="fly-subtitle">
        Mushroom-body learning controller
      </div>

      <button
        id="fly-toggle"
        class="fly-button fly-start"
      >
        ▶ AI 시작
      </button>

      <button
        id="fly-save"
        class="fly-button"
      >
        💾 학습 저장
      </button>

      <button
        id="fly-reset"
        class="fly-button fly-reset"
      >
        ↺ 학습 리셋
      </button>

      <button
        id="fly-boost"
        class="fly-button"
      >
        ⚡ BOOST
      </button>

      <div class="fly-divider"></div>

      <div id="fly-status">
        준비 완료
      </div>

      <div
        id="fly-stats"
        class="fly-stats"
      ></div>

      <div class="fly-label">
        신경 활성도
      </div>

      <div class="fly-meter">
        <div
          id="fly-neuron-meter"
          class="fly-meter-fill"
        ></div>
      </div>

      <div class="fly-label">
        위험도
      </div>

      <div class="fly-meter">
        <div
          id="fly-danger-meter"
          class="fly-meter-fill"
        ></div>
      </div>

      <div
        id="fly-message"
        class="fly-message"
      ></div>
    `;

    document.body.appendChild(
      panel
    );

    addStyles();

    document
      .getElementById(
        "fly-toggle"
      )
      .onclick =
        toggle;

    document
      .getElementById(
        "fly-save"
      )
      .onclick =
        saveLearning;

    document
      .getElementById(
        "fly-reset"
      )
      .onclick =
        resetLearning;

    document
      .getElementById(
        "fly-boost"
      )
      .onclick =
        manualBoost;

    updateUI();
  }

  function addStyles() {
    const style =
      document.createElement(
        "style"
      );

    style.textContent = `
      #flybrain-final-panel {
        position: fixed;
        top: 10px;
        right: 10px;

        width: 205px;

        z-index: 2147483647;

        box-sizing: border-box;

        padding: 12px;

        border:
          1px solid
          rgba(255,255,255,.20);

        border-radius: 16px;

        background:
          rgba(7,12,20,.91);

        color: white;

        font-family:
          system-ui,
          -apple-system,
          sans-serif;

        font-size: 12px;

        box-shadow:
          0 8px 30px
          rgba(0,0,0,.38);

        backdrop-filter:
          blur(10px);
      }

      .fly-title {
        font-size: 15px;
        font-weight: 800;
      }

      .fly-subtitle {
        opacity: .65;
        font-size: 10px;

        margin-top: 2px;
        margin-bottom: 9px;
      }

      .fly-button {
        border: 0;

        border-radius: 8px;

        padding: 7px 8px;

        margin:
          2px 2px 2px 0;

        font-size: 11px;
        font-weight: 700;

        cursor: pointer;
      }

      .fly-start {
        background: #65df91;
        color: #07120b;
      }

      .fly-reset {
        background: #ff7373;
        color: #210707;
      }

      .fly-divider {
        height: 1px;

        background:
          rgba(255,255,255,.13);

        margin: 9px 0;
      }

      #fly-status {
        font-weight: 800;

        margin-bottom: 6px;
      }

      .fly-stats {
        line-height: 1.55;
        opacity: .94;
      }

      .fly-label {
        margin-top: 7px;
        margin-bottom: 3px;

        opacity: .7;
        font-size: 10px;
      }

      .fly-meter {
        height: 5px;

        width: 100%;

        overflow: hidden;

        border-radius: 99px;

        background:
          rgba(255,255,255,.12);
      }

      .fly-meter-fill {
        width: 0%;
        height: 100%;

        background:
          currentColor;

        transition:
          width .12s linear;
      }

      .fly-message {
        min-height: 15px;

        margin-top: 7px;

        font-size: 10px;
        font-weight: 700;
      }

      @media
      (max-width: 600px) {

        #flybrain-final-panel {
          width: 185px;

          transform:
            scale(.88);

          transform-origin:
            top right;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }

  // ==============================
  // UPDATE UI
  // ==============================

  function updateUI(
    decision = null
  ) {
    const statsElement =
      document.getElementById(
        "fly-stats"
      );

    if (!statsElement)
      return;

    const brain =
      window.FlyBrain
        ? FlyBrain.getStats()
        : {};

    const learning =
      window.FlyLearning
        ? FlyLearning.getStats()
        : {};

    const sensors =
      window.FlySensors
        ? FlySensors.getState()
        : {};

    const survival =
      learning.survivalTime || 0;

    const best =
      learning.bestSurvival || 0;

    const danger =
      Math.max(
        sensors.dangerLeft || 0,
        sensors.dangerCenter || 0,
        sensors.dangerRight || 0
      );

    statsElement.innerHTML =
      "행동: <b>" +
      currentAction +
      "</b>" +

      "<br>세대: " +
      (brain.generation || 0) +

      "<br>판단: " +
      (brain.decisions || 0) +

      "<br>생존: " +
      survival.toFixed(1) +
      "초" +

      "<br>최고 생존: " +
      best.toFixed(1) +
      "초" +

      "<br>충돌: " +
      (learning.crashes || 0) +

      "<br>사망: " +
      (learning.deaths || 0) +

      "<br>회피: " +
      (learning.avoided || 0) +

      "<br>보상: " +
      (
        brain.totalReward || 0
      ).toFixed(2) +

      "<br>탐색률: " +
      (
        (
          brain.exploration || 0
        ) * 100
      ).toFixed(1) +
      "%";

    const neuronMeter =
      document.getElementById(
        "fly-neuron-meter"
      );

    if (
      neuronMeter &&
      decision
    ) {
      const percent =
        Math.min(
          100,
          (
            decision.active /
            256
          ) *
          600
        );

      neuronMeter.style.width =
        percent + "%";
    }

    const dangerMeter =
      document.getElementById(
        "fly-danger-meter"
      );

    if (dangerMeter) {
      dangerMeter.style.width =
        Math.min(
          100,
          danger * 100
        ) + "%";
    }
  }

  function setStatus(text) {
    const el =
      document.getElementById(
        "fly-status"
      );

    if (el) {
      el.textContent = text;
    }
  }

  function flash(text) {
    const el =
      document.getElementById(
        "fly-message"
      );

    if (!el) return;

    el.textContent = text;

    setTimeout(() => {
      el.textContent = "";
    }, 2200);
  }

  // ==============================
  // PERIODIC UI REFRESH
  // ==============================

  setInterval(() => {
    if (
      document.getElementById(
        "flybrain-final-panel"
      )
    ) {
      updateUI();
    }
  }, 500);

  // ==============================
  // INIT
  // ==============================

  function init() {
    createUI();

    console.log(
      "🪰 FlyBrain controller ready"
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

  // Public API
  window.FlyController = {
    start,
    stop,
    toggle,
    saveLearning,
    resetLearning,

    getState() {
      return {
        running,
        steps,
        currentAction,
        startedAt
      };
    }
  };

})();
