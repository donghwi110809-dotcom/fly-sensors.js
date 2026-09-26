/*
 * FlyBrain S.U.R.F. — Sensors
 * 실제 게임 화면을 AI의 감각 입력으로 변환
 */

(() => {
  "use strict";

  const SENSOR_COUNT = 35;

  const state = {
    frame: 0,
    width: 0,
    height: 0,
    playerX: 0.5,
    playerY: 0.5,
    speedX: 0,
    speedY: 0,
    previousX: 0.5,
    previousY: 0.5,
    dangerLeft: 0,
    dangerCenter: 0,
    dangerRight: 0,
    nearestDanger: 1,
    obstacleCount: 0,
    timestamp: performance.now()
  };

  /* 캔버스 찾기 */
  function getCanvas() {
    const canvases = [...document.querySelectorAll("canvas")];

    if (!canvases.length) return null;

    return canvases.sort(
      (a, b) =>
        b.width * b.height -
        a.width * a.height
    )[0];
  }

  /*
   * 화면 픽셀 분석
   *
   * S.U.R.F.가 canvas에 그려지기 때문에
   * 게임 내부 변수를 강제로 수정하지 않고
   * 실제 렌더링된 화면을 센서로 사용한다.
   */
  function scanScreen() {
    const canvas = getCanvas();

    if (!canvas) return null;

    const ctx = canvas.getContext(
      "2d",
      { willReadFrequently: true }
    );

    if (!ctx) return null;

    const W = canvas.width;
    const H = canvas.height;

    if (!W || !H) return null;

    /*
     * 성능을 위해 전체 화면을 64×64 감각망으로 축소.
     */
    const SW = 64;
    const SH = 64;

    let data;

    try {
      const temp =
        document.createElement("canvas");

      temp.width = SW;
      temp.height = SH;

      const tctx =
        temp.getContext(
          "2d",
          { willReadFrequently: true }
        );

      tctx.drawImage(
        canvas,
        0,
        0,
        SW,
        SH
      );

      data =
        tctx.getImageData(
          0,
          0,
          SW,
          SH
        ).data;

    } catch (error) {
      return null;
    }

    return {
      data,
      width: SW,
      height: SH,
      sourceWidth: W,
      sourceHeight: H
    };
  }

  function brightness(data, index) {
    return (
      data[index] +
      data[index + 1] +
      data[index + 2]
    ) / 765;
  }

  /*
   * 화면을 3개의 위험 구역으로 나눈다.
   *
   * LEFT | CENTER | RIGHT
   */
  function detectDanger(scan) {
    if (!scan) {
      return {
        left: 0,
        center: 0,
        right: 0,
        nearest: 1,
        count: 0
      };
    }

    const {
      data,
      width,
      height
    } = scan;

    let left = 0;
    let center = 0;
    let right = 0;

    let leftN = 0;
    let centerN = 0;
    let rightN = 0;

    let count = 0;
    let nearest = 1;

    /*
     * 플레이어보다 앞쪽이라고 가정되는
     * 화면 중앙~상단 영역을 집중 관찰한다.
     */
    const startY =
      Math.floor(height * 0.18);

    const endY =
      Math.floor(height * 0.72);

    for (
      let y = startY;
      y < endY;
      y += 2
    ) {
      for (
        let x = 0;
        x < width;
        x += 2
      ) {
        const i =
          (y * width + x) * 4;

        const alpha =
          data[i + 3] / 255;

        if (alpha < 0.2) continue;

        const b =
          brightness(data, i);

        /*
         * 극단적으로 밝거나 어두운 픽셀을
         * 지형/오브젝트 후보로 취급.
         */
        const contrast =
          Math.abs(b - 0.55);

        if (contrast < 0.20)
          continue;

        const proximity =
          y / height;

        const danger =
          contrast *
          proximity;

        count++;

        nearest =
          Math.min(
            nearest,
            1 - proximity
          );

        if (x < width / 3) {
          left += danger;
          leftN++;
        }

        else if (
          x < width * 2 / 3
        ) {
          center += danger;
          centerN++;
        }

        else {
          right += danger;
          rightN++;
        }
      }
    }

    function normalize(
      value,
      amount
    ) {
      if (!amount) return 0;

      return Math.min(
        1,
        value / amount * 4
      );
    }

    return {
      left:
        normalize(left, leftN),

      center:
        normalize(center, centerN),

      right:
        normalize(right, rightN),

      nearest,

      count
    };
  }

  /*
   * 35개의 감각 뉴런 입력 생성
   */
  function buildSensors() {
    const scan =
      scanScreen();

    const danger =
      detectDanger(scan);

    state.frame++;

    state.width =
      window.innerWidth;

    state.height =
      window.innerHeight;

    state.dangerLeft =
      danger.left;

    state.dangerCenter =
      danger.center;

    state.dangerRight =
      danger.right;

    state.nearestDanger =
      danger.nearest;

    state.obstacleCount =
      danger.count;

    const now =
      performance.now();

    const dt =
      Math.max(
        1,
        now - state.timestamp
      );

    state.timestamp = now;

    const input =
      new Float32Array(
        SENSOR_COUNT
      );

    /*
     * 기본 감각
     */
    input[0] = 1;

    input[1] =
      danger.left;

    input[2] =
      danger.center;

    input[3] =
      danger.right;

    input[4] =
      1 - danger.nearest;

    /*
     * 위험 방향 차이
     */
    input[5] =
      danger.right -
      danger.left;

    input[6] =
      danger.center -
      (
        danger.left +
        danger.right
      ) / 2;

    /*
     * 시간 감각
     */
    input[7] =
      Math.sin(
        state.frame * 0.03
      );

    input[8] =
      Math.cos(
        state.frame * 0.03
      );

    input[9] =
      Math.sin(
        state.frame * 0.007
      );

    /*
     * 화면 비율
     */
    input[10] =
      Math.min(
        1,
        window.innerWidth /
        Math.max(
          1,
          window.innerHeight
        )
      );

    /*
     * 오브젝트 밀도
     */
    input[11] =
      Math.min(
        1,
        danger.count / 500
      );

    /*
     * 위험 조합 뉴런
     */
    input[12] =
      danger.left *
      danger.center;

    input[13] =
      danger.right *
      danger.center;

    input[14] =
      danger.left *
      danger.right;

    input[15] =
      Math.max(
        danger.left,
        danger.center,
        danger.right
      );

    input[16] =
      Math.min(
        danger.left,
        danger.center,
        danger.right
      );

    /*
     * 좌/우 안전도
     */
    input[17] =
      1 - danger.left;

    input[18] =
      1 - danger.center;

    input[19] =
      1 - danger.right;

    /*
     * 급박한 위험 감각
     */
    const urgent =
      Math.max(
        0,
        input[4] - 0.55
      );

    input[20] = urgent;

    input[21] =
      urgent *
      danger.left;

    input[22] =
      urgent *
      danger.center;

    input[23] =
      urgent *
      danger.right;

    /*
     * 방향 선택용 뉴런
     */
    input[24] =
      danger.left <
      danger.right
        ? 1
        : 0;

    input[25] =
      danger.right <
      danger.left
        ? 1
        : 0;

    input[26] =
      danger.center <
      danger.left &&
      danger.center <
      danger.right
        ? 1
        : 0;

    /*
     * 여러 시간 스케일
     */
    input[27] =
      Math.sin(
        state.frame * 0.11
      );

    input[28] =
      Math.cos(
        state.frame * 0.11
      );

    input[29] =
      Math.sin(
        state.frame * 0.017
      );

    input[30] =
      Math.cos(
        state.frame * 0.017
      );

    /*
     * 환경 변화 감지용
     */
    input[31] =
      Math.min(
        1,
        dt / 100
      );

    input[32] =
      (
        danger.left +
        danger.center +
        danger.right
      ) / 3;

    input[33] =
      Math.abs(
        danger.left -
        danger.right
      );

    input[34] =
      Math.max(
        0,
        1 -
        input[32]
      );

    return input;
  }

  /*
   * 다른 FlyBrain 모듈에서 사용할 API
   */
  window.FlySensors = {
    count: SENSOR_COUNT,

    read:
      buildSensors,

    getState() {
      return {
        ...state
      };
    },

    reset() {
      state.frame = 0;

      state.timestamp =
        performance.now();
    }
  };

  console.log(
    "🪰 FlySensors ready:",
    SENSOR_COUNT,
    "sensory neurons"
  );

})();
