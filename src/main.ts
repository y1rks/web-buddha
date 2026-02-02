import * as Tone from "tone";
import { startGpsTracking, type GpsState } from "./gps";

const isV2 = document.body.dataset.variant === "v2";

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
}).toDestination();

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
    speedDisplay.textContent = `${state.speed.toFixed(2)}x`;

    // Debug info
    if (state.current) {
      debugLat.textContent = state.current.lat.toFixed(6);
      debugLon.textContent = state.current.lon.toFixed(6);
      debugAccuracy.textContent = `${state.current.accuracy.toFixed(1)} m`;
    }
    debugRawDist.textContent = `${state.rawDistance.toFixed(1)} m`;

    // Update playback rate
    player.playbackRate = state.speed;
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
