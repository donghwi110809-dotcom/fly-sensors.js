
/*
 * FlyBrain S.U.R.F. — Brain
 * Mushroom-body inspired sparse learning network
 */

(() => {
  "use strict";

  const INPUTS = 35;
  const KENYON = 256;
  const ACTIONS = 4;

  const STORAGE_KEY = "flybrain-surf-v1";

  const ACTION = {
    LEFT: 0,
    RIGHT: 1,
    DOWN: 2,
    BOOST: 3
  };

  let generation = 0;
  let totalReward = 0;
  let bestReward = 0;
  let decisions = 0;

  /*
   * 감각 → Kenyon 연결
   * Kenyon → 행동 연결
   */
  let sensoryWeights;
  let actionWeights;

  /*
   * 직전 판단을 기억한다.
   * 보상이 들어오면 이 연결을 강화/약화한다.
   */
  let lastInput = null;
  let lastHidden = null;
  let lastAction = null;

  const LEARNING_RATE = 0.012;
  const DISCOUNT = 0.96;
  const EXPLORATION_MIN = 0.025;

  let exploration = 0.18;

  function randomWeight(scale = 1) {
    return (
      Math.random() * 2 - 1
    ) * scale;
  }

  /*
   * 새로운 뇌 생성
   */
  function createBrain() {
    sensoryWeights =
      new Array(KENYON);

    for (
      let k = 0;
      k < KENYON;
      k++
    ) {
      sensoryWeights[k] =
        new Float32Array(INPUTS);

      /*
       * 초파리 mushroom body처럼
       * 입력을 희소하게 연결한다.
       */
      for (
        let i = 0;
        i < INPUTS;
        i++
      ) {
        if (Math.random() < 0.12) {
          sensoryWeights[k][i] =
            randomWeight(1);
        }
      }
    }

    actionWeights =
      new Array(ACTIONS);

    for (
      let a = 0;
      a < ACTIONS;
      a++
    ) {
      actionWeights[a] =
        new Float32Array(KENYON);

      for (
        let k = 0;
        k < KENYON;
        k++
      ) {
        actionWeights[a][k] =
          randomWeight(0.05);
      }
    }

    generation = 0;
    totalReward = 0;
    bestReward = 0;
    decisions = 0;
    exploration = 0.18;

    clearMemory();
  }

  /*
   * Kenyon cell 활성화
   */
  function encode(input) {
    const raw =
      new Float32Array(KENYON);

    for (
      let k = 0;
      k < KENYON;
      k++
    ) {
      let sum = 0;

      const weights =
        sensoryWeights[k];

      for (
        let i = 0;
        i < INPUTS;
        i++
      ) {
        sum +=
          input[i] *
          weights[i];
      }

      raw[k] =
        Math.max(0, sum);
    }

    /*
     * 가장 강하게 반응한 약 8%만 살린다.
     * 희소 코딩.
     */
    const values =
      Array.from(raw)
        .filter(v => v > 0)
        .sort((a, b) => b - a);

    let threshold = Infinity;

    if (values.length) {
      const keep =
        Math.max(
          1,
          Math.floor(
            KENYON * 0.08
          )
        );

      threshold =
        values[
          Math.min(
            keep - 1,
            values.length - 1
          )
        ];
    }

    const hidden =
      new Float32Array(KENYON);

    for (
      let k = 0;
      k < KENYON;
      k++
    ) {
      if (
        raw[k] > 0 &&
        raw[k] >= threshold
      ) {
        hidden[k] = raw[k];
      }
    }

    return hidden;
  }

  /*
   * MBON 스타일 행동 출력
   */
  function calculateActions(hidden) {
    const output =
      new Float32Array(ACTIONS);

    for (
      let a = 0;
      a < ACTIONS;
      a++
    ) {
      let sum = 0;

      const weights =
        actionWeights[a];

      for (
        let k = 0;
        k < KENYON;
        k++
      ) {
        sum +=
          hidden[k] *
          weights[k];
      }

      output[a] = sum;
    }

    return output;
  }

  function bestAction(output) {
    let best = 0;

    for (
      let a = 1;
      a < ACTIONS;
      a++
    ) {
      if (
        output[a] >
        output[best]
      ) {
        best = a;
      }
    }

    return best;
  }

  /*
   * 행동 결정
   */
  function decide(input) {
    if (
      !input ||
      input.length !== INPUTS
    ) {
      throw new Error(
        "FlyBrain: invalid sensory input"
      );
    }

    const hidden =
      encode(input);

    const output =
      calculateActions(hidden);

    let action;

    /*
     * 가끔 새로운 행동을 시도.
     * 학습될수록 탐색률 감소.
     */
    if (
      Math.random() <
      exploration
    ) {
      action =
        Math.floor(
          Math.random() *
          ACTIONS
        );
    } else {
      action =
        bestAction(output);
    }

    lastInput =
      Float32Array.from(input);

    lastHidden =
      hidden;

    lastAction =
      action;

    decisions++;

    return {
      action,
      output:
        Array.from(output),

      active:
        Array.from(hidden)
          .filter(v => v > 0)
          .length,

      exploration
    };
  }

  /*
   * Reward-modulated plasticity
   *
   * 좋은 행동 → 연결 강화
   * 나쁜 행동 → 연결 약화
   */
  function reward(value) {
    if (
      lastAction === null ||
      !lastHidden
    ) {
      return;
    }

    value =
      Math.max(
        -10,
        Math.min(10, value)
      );

    const weights =
      actionWeights[
        lastAction
      ];

    for (
      let k = 0;
      k < KENYON;
      k++
    ) {
      const activity =
        lastHidden[k];

      if (!activity)
        continue;

      weights[k] +=
        LEARNING_RATE *
        value *
        activity;

      /*
       * 가중치 폭주 방지
       */
      weights[k] =
        Math.max(
          -3,
          Math.min(
            3,
            weights[k]
          )
        );
    }

    totalReward += value;

    if (
      totalReward >
      bestReward
    ) {
      bestReward =
        totalReward;
    }

    /*
     * 경험이 쌓일수록
     * 랜덤 행동 감소
     */
    exploration =
      Math.max(
        EXPLORATION_MIN,
        exploration *
        0.9997
      );
  }

  /*
   * 생존 보상
   */
  function survived() {
    reward(0.025);
  }

  /*
   * 위험을 피했을 때
   */
  function avoidedDanger() {
    reward(0.25);
  }

  /*
   * 충돌
   */
  function crashed() {
    reward(-3);
  }

  /*
   * 사망
   */
  function died() {
    reward(-7);

    generation++;

    /*
     * 새로운 에피소드.
     * 학습된 가중치는 유지.
     */
    totalReward *=
      DISCOUNT;

    clearMemory();

    save();
  }

  function clearMemory() {
    lastInput = null;
    lastHidden = null;
    lastAction = null;
  }

  /*
   * Float32Array →
   * 저장 가능한 일반 배열
   */
  function serializeMatrix(
    matrix
  ) {
    return matrix.map(
      row =>
        Array.from(row)
    );
  }

  /*
   * 학습 저장
   */
  function save() {
    try {
      const data = {
        version: 1,

        generation,
        totalReward,
        bestReward,
        decisions,
        exploration,

        sensoryWeights:
          serializeMatrix(
            sensoryWeights
          ),

        actionWeights:
          serializeMatrix(
            actionWeights
          )
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      );

      return true;

    } catch (error) {
      console.error(
        "FlyBrain save failed",
        error
      );

      return false;
    }
  }

  /*
   * 기존 학습 불러오기
   */
  function load() {
    try {
      const raw =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!raw)
        return false;

      const data =
        JSON.parse(raw);

      if (
        !data ||
        data.version !== 1 ||
        !data.sensoryWeights ||
        !data.actionWeights
      ) {
        return false;
      }

      sensoryWeights =
        data.sensoryWeights.map(
          row =>
            Float32Array.from(
              row
            )
        );

      actionWeights =
        data.actionWeights.map(
          row =>
            Float32Array.from(
              row
            )
        );

      generation =
        data.generation || 0;

      totalReward =
        data.totalReward || 0;

      bestReward =
        data.bestReward || 0;

      decisions =
        data.decisions || 0;

      exploration =
        typeof data.exploration
          === "number"
          ? data.exploration
          : 0.18;

      clearMemory();

      console.log(
        "🧠 FlyBrain learning loaded"
      );

      return true;

    } catch (error) {
      console.error(
        "FlyBrain load failed",
        error
      );

      return false;
    }
  }

  /*
   * 사용자가 요청한
   * 학습 완전 초기화
   */
  function resetLearning() {
    localStorage.removeItem(
      STORAGE_KEY
    );

    createBrain();

    save();

    console.log(
      "🧠 FlyBrain learning RESET"
    );

    return true;
  }

  function getStats() {
    return {
      generation,
      totalReward,
      bestReward,
      decisions,
      exploration,

      neurons: KENYON,

      inputs: INPUTS,

      actions: ACTIONS
    };
  }

  /*
   * 최초 실행
   */
  createBrain();

  load();

  /*
   * 외부 모듈 API
   */
  window.FlyBrain = {
    ACTION,

    decide,

    reward,

    survived,

    avoidedDanger,

    crashed,

    died,

    save,

    load,

    resetLearning,

    getStats,

    clearMemory
  };

  /*
   * 페이지가 닫히기 전
   * 자동 저장
   */
  window.addEventListener(
    "beforeunload",
    save
  );

  /*
   * 15초마다 자동 저장
   */
  setInterval(
    save,
    15000
  );

  console.log(
    "🪰 FlyBrain ready:",
    INPUTS,
    "sensory →",
    KENYON,
    "Kenyon →",
    ACTIONS,
    "actions"
  );

})();
