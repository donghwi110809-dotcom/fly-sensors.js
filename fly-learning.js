/*
 * FlyBrain S.U.R.F. — Learning System
 * 생존 / 위험회피 / 충돌 / 사망을 보상으로 변환
 */

(() => {
  "use strict";

  const STATE = {
    running: false,

    episodeStart: 0,
    survivalTime: 0,
    bestSurvival: 0,

    crashes: 0,
    deaths: 0,
    avoided: 0,

    lastDanger: 0,
    dangerPeak: 0,

    reward: 0,

    lastTick: performance.now(),

    lastCrashTime: 0,
    lastDeathTime: 0
  };


  /*
   * 게임 상태를 직접 읽을 수 없는 경우에도
   * FlySensors의 위험도 변화로
   * 보상 신호를 생성한다.
   */

  function getDanger() {

    if (!window.FlySensors)
      return 0;

    const s =
      FlySensors.getState();

    return Math.max(
      s.dangerLeft || 0,
      s.dangerCenter || 0,
      s.dangerRight || 0
    );
  }


  /*
   * 캔버스 존재 여부
   */

  function gameVisible() {

    const canvas =
      document.querySelector("canvas");

    if (!canvas)
      return false;

    return (
      canvas.width > 0 &&
      canvas.height > 0
    );
  }


  /*
   * 생존 보상
   */

  function rewardSurvival(dt) {

    if (!window.FlyBrain)
      return;

    /*
     * 약 1초마다 작은 보상
     */

    const reward =
      Math.min(
        0.04,
        dt / 1000 * 0.025
      );

    FlyBrain.reward(
      reward
    );

    STATE.reward +=
      reward;
  }


  /*
   * 위험 회피 판정

   * 위험도가 높았다가
   * 빠르게 떨어지면
   * 장애물을 피했다고 판단.
   */

  function detectAvoidance(
    danger
  ) {

    if (!window.FlyBrain)
      return;

    if (
      STATE.lastDanger > 0.60 &&
      danger < 0.35
    ) {

      FlyBrain.avoidedDanger();

      STATE.avoided++;

      STATE.reward +=
        0.25;
    }

    STATE.lastDanger =
      danger;

    STATE.dangerPeak =
      Math.max(
        STATE.dangerPeak,
        danger
      );
  }


  /*
   * 충돌 신호

   * Controller에서 실제 충돌을
   * 감지하면 이 함수를 호출할 수 있다.
   */

  function crash() {

    const now =
      performance.now();

    /*
     * 같은 충돌을 여러 번
     * 계산하지 않도록 제한.
     */

    if (
      now -
      STATE.lastCrashTime <
      1000
    ) {
      return;
    }

    STATE.lastCrashTime =
      now;

    STATE.crashes++;

    STATE.reward -= 3;

    if (window.FlyBrain) {
      FlyBrain.crashed();
    }

    dispatch(
      "flybrain-crash",
      getStats()
    );
  }


  /*
   * 사망 / 게임 종료
   */

  function death() {

    const now =
      performance.now();

    if (
      now -
      STATE.lastDeathTime <
      1500
    ) {
      return;
    }

    STATE.lastDeathTime =
      now;

    STATE.deaths++;

    STATE.reward -= 7;

    STATE.bestSurvival =
      Math.max(
        STATE.bestSurvival,
        STATE.survivalTime
      );

    if (window.FlyBrain) {
      FlyBrain.died();
    }

    dispatch(
      "flybrain-death",
      getStats()
    );

    resetEpisode();
  }


  /*
   * 새로운 게임 시작
   */

  function resetEpisode() {

    STATE.episodeStart =
      performance.now();

    STATE.survivalTime = 0;

    STATE.lastDanger = 0;

    STATE.dangerPeak = 0;

    if (window.FlySensors) {
      FlySensors.reset();
    }
  }


  /*
   * 학습 루프
   */

  function tick() {

    if (!STATE.running)
      return;

    const now =
      performance.now();

    const dt =
      Math.min(
        250,
        now -
        STATE.lastTick
      );

    STATE.lastTick =
      now;

    if (!gameVisible())
      return;

    STATE.survivalTime =
      (
        now -
        STATE.episodeStart
      ) / 1000;

    rewardSurvival(dt);

    const danger =
      getDanger();

    detectAvoidance(
      danger
    );

    /*
     * 아주 높은 위험이 계속되면
     * 작은 음수 보상.

     * 위험한 곳으로 계속 향하는
     * 행동을 줄인다.
     */

    if (
      danger > 0.88 &&
      window.FlyBrain
    ) {

      FlyBrain.reward(
        -0.015
      );

      STATE.reward -=
        0.015;
    }
  }


  /*
   * START
   */

  function start() {

    if (STATE.running)
      return;

    STATE.running = true;

    STATE.lastTick =
      performance.now();

    resetEpisode();

    dispatch(
      "flybrain-learning-start",
      getStats()
    );
  }


  /*
   * STOP
   */

  function stop() {

    STATE.running = false;

    if (window.FlyBrain) {
      FlyBrain.save();
    }

    dispatch(
      "flybrain-learning-stop",
      getStats()
    );
  }


  /*
   * 학습 전체 리셋
   */

  function resetLearning() {

    stop();

    if (window.FlyBrain) {
      FlyBrain.resetLearning();
    }

    STATE.survivalTime = 0;
    STATE.bestSurvival = 0;

    STATE.crashes = 0;
    STATE.deaths = 0;
    STATE.avoided = 0;

    STATE.reward = 0;

    STATE.lastDanger = 0;
    STATE.dangerPeak = 0;

    resetEpisode();

    dispatch(
      "flybrain-learning-reset",
      getStats()
    );

    return true;
  }


  /*
   * 현재 학습 정보
   */

  function getStats() {

    const brain =
      window.FlyBrain
        ? FlyBrain.getStats()
        : {};

    return {

      running:
        STATE.running,

      survivalTime:
        STATE.survivalTime,

      bestSurvival:
        STATE.bestSurvival,

      crashes:
        STATE.crashes,

      deaths:
        STATE.deaths,

      avoided:
        STATE.avoided,

      episodeReward:
        STATE.reward,

      danger:
        STATE.lastDanger,

      generation:
        brain.generation || 0,

      decisions:
        brain.decisions || 0,

      exploration:
        brain.exploration || 0

    };
  }


  /*
   * UI와 통신용 이벤트
   */

  function dispatch(
    name,
    detail
  ) {

    window.dispatchEvent(
      new CustomEvent(
        name,
        {
          detail
        }
      )
    );
  }


  /*
   * 50ms 학습 주기
   */

  setInterval(
    tick,
    50
  );


  /*
   * 외부 API
   */

  window.FlyLearning = {

    start,

    stop,

    crash,

    death,

    resetEpisode,

    resetLearning,

    getStats,

    isRunning() {
      return STATE.running;
    }

  };


  console.log(
    "🪰 FlyLearning ready"
  );

})();
