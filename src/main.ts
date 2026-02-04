import * as Tone from "tone";
import { startGpsTracking, distanceToEqBalance, type GpsState } from "./gps";

const isV2 = document.body.dataset.variant === "v2";
const isV3 = document.body.dataset.variant === "v3";

// DOM要素の取得
const playButton = document.getElementById("playButton") as HTMLButtonElement;
const playIcon = playButton.querySelector(".play-icon") as HTMLSpanElement;

// Viteのベースパスを考慮（GitHub Pages対応）
const audioUrl = `${import.meta.env.BASE_URL}loop.mp3`;

// 読み込み中はボタンを無効化
playButton.disabled = true;
playButton.style.opacity = "0.5";

// Tone.js Playerの作成
const player = new Tone.Player({
  url: audioUrl,
  loop: true,
  onload: () => {
    playButton.disabled = false;
    playButton.style.opacity = "1";
  },
});

// v3: EQ3 + lowpass filter chain; others: direct to destination
let eq3: Tone.EQ3 | null = null;
let lpFilter: Tone.Filter | null = null;

if (isV3) {
  eq3 = new Tone.EQ3({
    low: 0,
    mid: 0,
    high: 0,
    lowFrequency: 250,
    highFrequency: 2500,
  });
  lpFilter = new Tone.Filter({
    type: "lowpass",
    frequency: 18000,
    rolloff: -24,
  });
  player.chain(eq3, lpFilter, Tone.getDestination());
} else {
  player.toDestination();
}

let isPlaying = false;

// AudioContextを確実に開始する
async function ensureAudioContext(): Promise<boolean> {
  const context = Tone.getContext();

  if (context.state === "suspended") {
    await Tone.start();
    await context.resume();
  }

  if (context.state !== "running") {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return context.state === "running";
}

if (isV2) {
  // --- v2: GPS-controlled playback ---
  const gpsStatus = document.getElementById("gpsStatus") as HTMLElement;
  const distanceDisplay = document.getElementById(
    "distanceDisplay",
  ) as HTMLElement;
  const speedDisplay = document.getElementById("speedDisplay") as HTMLElement;
  const debugLat = document.getElementById("debugLat") as HTMLElement;
  const debugLon = document.getElementById("debugLon") as HTMLElement;
  const debugAccuracy = document.getElementById("debugAccuracy") as HTMLElement;
  const debugRawDist = document.getElementById("debugRawDist") as HTMLElement;

  let stopGps: (() => void) | null = null;

  let bypassed = false;
  const bypassToggle = document.getElementById("bypassToggle") as HTMLInputElement;
  bypassToggle.addEventListener("change", () => {
    bypassed = bypassToggle.checked;
    if (bypassed) {
      player.playbackRate = 1.0;
      speedDisplay.textContent = "1.00x";
    }
  });

  function updateGpsUi(state: GpsState) {
    // Status indicator
    gpsStatus.className = "gps-status " + state.status;
    const statusLabels: Record<GpsState["status"], string> = {
      idle: "GPS待機中",
      acquiring: "GPS取得中...",
      active: "GPS有効",
      error: "GPSエラー",
    };
    gpsStatus.textContent = statusLabels[state.status];
    if (state.status === "error" && state.errorMessage) {
      gpsStatus.textContent += `: ${state.errorMessage}`;
    }

    // Distance & speed
    distanceDisplay.textContent = `${state.smoothedDistance.toFixed(1)} m`;

    // Debug info
    if (state.current) {
      debugLat.textContent = state.current.lat.toFixed(6);
      debugLon.textContent = state.current.lon.toFixed(6);
      debugAccuracy.textContent = `${state.current.accuracy.toFixed(1)} m`;
    }
    debugRawDist.textContent = `${state.rawDistance.toFixed(1)} m`;

    // Update playback rate (skip when bypassed)
    if (!bypassed) {
      player.playbackRate = state.speed;
      speedDisplay.textContent = `${state.speed.toFixed(2)}x`;
    }
  }

  async function togglePlayback() {
    if (!player.loaded) return;

    const contextReady = await ensureAudioContext();
    if (!contextReady) return;

    if (isPlaying) {
      player.stop();
      isPlaying = false;
      playButton.classList.remove("playing");
      playIcon.innerHTML = "&#9658;";
      if (stopGps) {
        stopGps();
        stopGps = null;
      }
    } else {
      player.start();
      isPlaying = true;
      playButton.classList.add("playing");
      playIcon.innerHTML = "&#9632;";
      stopGps = startGpsTracking(updateGpsUi);
    }
  }

  playButton.addEventListener("click", togglePlayback);
} else if (isV3) {
  // --- v3: GPS-controlled EQ ---
  const gpsStatus = document.getElementById("gpsStatus") as HTMLElement;
  const distanceDisplay = document.getElementById(
    "distanceDisplay",
  ) as HTMLElement;
  const eqBalanceDisplay = document.getElementById(
    "eqBalanceDisplay",
  ) as HTMLElement;
  const eqBarLow = document.getElementById("eqBarLow") as HTMLElement;
  const eqBarHigh = document.getElementById("eqBarHigh") as HTMLElement;
  const debugLat = document.getElementById("debugLat") as HTMLElement;
  const debugLon = document.getElementById("debugLon") as HTMLElement;
  const debugAccuracy = document.getElementById("debugAccuracy") as HTMLElement;
  const debugRawDist = document.getElementById("debugRawDist") as HTMLElement;

  let stopGps: (() => void) | null = null;

  let bypassed = false;
  const bypassToggle = document.getElementById("bypassToggle") as HTMLInputElement;
  bypassToggle.addEventListener("change", () => {
    bypassed = bypassToggle.checked;
    if (bypassed) {
      applyEqBalance(0);
      eqBalanceDisplay.textContent = "FLAT";
      eqBarLow.style.width = "0%";
      eqBarHigh.style.width = "0%";
    }
  });

  function applyEqBalance(balance: number) {
    if (!eq3 || !lpFilter) return;

    // EQ3 gains: balance -1 = bass-heavy, +1 = treble-heavy
    eq3.low.value = -15 * balance;
    eq3.mid.value = -3;
    eq3.high.value = 15 * balance;

    // Lowpass filter sweep (logarithmic): 800Hz … 18000Hz
    const logMin = Math.log(800);
    const logMax = Math.log(18000);
    const t = (balance + 1) / 2; // map -1..+1 to 0..1
    lpFilter.frequency.value = Math.exp(logMin + t * (logMax - logMin));
  }

  function updateGpsUi(state: GpsState) {
    // Status indicator
    gpsStatus.className = "gps-status " + state.status;
    const statusLabels: Record<GpsState["status"], string> = {
      idle: "GPS待機中",
      acquiring: "GPS取得中...",
      active: "GPS有効",
      error: "GPSエラー",
    };
    gpsStatus.textContent = statusLabels[state.status];
    if (state.status === "error" && state.errorMessage) {
      gpsStatus.textContent += `: ${state.errorMessage}`;
    }

    // Distance
    distanceDisplay.textContent = `${state.smoothedDistance.toFixed(1)} m`;

    // EQ balance (skip when bypassed)
    if (!bypassed) {
      const balance = distanceToEqBalance(state.smoothedDistance);
      applyEqBalance(balance);

      // UI labels
      let label: string;
      if (balance < -0.3) label = "BASS";
      else if (balance > 0.3) label = "TREBLE";
      else label = "FLAT";
      eqBalanceDisplay.textContent = label;

      // Balance bar widths
      const lowPct = Math.max(0, -balance) * 50;
      const highPct = Math.max(0, balance) * 50;
      eqBarLow.style.width = `${lowPct}%`;
      eqBarHigh.style.width = `${highPct}%`;
    }

    // Debug info
    if (state.current) {
      debugLat.textContent = state.current.lat.toFixed(6);
      debugLon.textContent = state.current.lon.toFixed(6);
      debugAccuracy.textContent = `${state.current.accuracy.toFixed(1)} m`;
    }
    debugRawDist.textContent = `${state.rawDistance.toFixed(1)} m`;
  }

  async function togglePlayback() {
    if (!player.loaded) return;

    const contextReady = await ensureAudioContext();
    if (!contextReady) return;

    if (isPlaying) {
      player.stop();
      isPlaying = false;
      playButton.classList.remove("playing");
      playIcon.innerHTML = "&#9658;";
      if (stopGps) {
        stopGps();
        stopGps = null;
      }
    } else {
      player.start();
      isPlaying = true;
      playButton.classList.add("playing");
      playIcon.innerHTML = "&#9632;";
      stopGps = startGpsTracking(updateGpsUi);
    }
  }

  playButton.addEventListener("click", togglePlayback);
} else {
  // --- v1: Slider-controlled playback ---
  const speedSlider = document.getElementById(
    "speedSlider",
  ) as HTMLInputElement;
  const speedValue = document.getElementById("speedValue") as HTMLSpanElement;

  async function togglePlayback() {
    if (!player.loaded) return;

    const contextReady = await ensureAudioContext();
    if (!contextReady) return;

    if (isPlaying) {
      player.stop();
      isPlaying = false;
      playButton.classList.remove("playing");
      playIcon.innerHTML = "&#9658;";
    } else {
      player.start();
      isPlaying = true;
      playButton.classList.add("playing");
      playIcon.innerHTML = "&#9632;";
    }
  }

  playButton.addEventListener("click", togglePlayback);

  speedSlider.addEventListener("input", () => {
    const speed = parseFloat(speedSlider.value);
    player.playbackRate = speed;
    speedValue.textContent = `${speed.toFixed(2)}x`;
  });

  // 初期値の表示
  speedValue.textContent = `${parseFloat(speedSlider.value).toFixed(2)}x`;
}
