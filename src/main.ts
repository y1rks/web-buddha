import * as Tone from "tone";

// DOM要素の取得
const playButton = document.getElementById("playButton") as HTMLButtonElement;
const playIcon = playButton.querySelector(".play-icon") as HTMLSpanElement;
const speedSlider = document.getElementById("speedSlider") as HTMLInputElement;
const speedValue = document.getElementById("speedValue") as HTMLSpanElement;
const debugEl = document.getElementById("debug") as HTMLDivElement;

// デバッグログ表示
function log(message: string) {
  console.log(message);
  const time = new Date().toLocaleTimeString();
  debugEl.innerHTML += `${time}: ${message}<br>`;
  debugEl.scrollTop = debugEl.scrollHeight;
}

// Viteのベースパスを考慮（GitHub Pages対応）
const audioUrl = `${import.meta.env.BASE_URL}loop.mp3`;
log(`Audio URL: ${audioUrl}`);

// 読み込み中はボタンを無効化
playButton.disabled = true;
playButton.style.opacity = "0.5";

// Tone.js Playerの作成
const player = new Tone.Player({
  url: audioUrl,
  loop: true,
  onload: () => {
    log("Audio loaded successfully");
    playButton.disabled = false;
    playButton.style.opacity = "1";
  },
  onerror: (error) => {
    log(`Load error: ${error}`);
  },
}).toDestination();

let isPlaying = false;

// AudioContextを確実に開始する
async function ensureAudioContext(): Promise<boolean> {
  const context = Tone.getContext();
  log(`Context state before: ${context.state}`);

  if (context.state === "suspended") {
    try {
      await Tone.start();
      // iOSでは追加でresumeが必要な場合がある
      await context.resume();
      log(`Context state after: ${context.state}`);
    } catch (e) {
      log(`Error starting context: ${e}`);
      return false;
    }
  }

  // 状態がrunningになるまで少し待つ（iOS対策）
  if (context.state !== "running") {
    await new Promise((resolve) => setTimeout(resolve, 100));
    log(`Context state after wait: ${context.state}`);
  }

  return context.state === "running";
}

// 再生/停止の切り替え
async function togglePlayback() {
  log("Button clicked");

  // 読み込み完了を確認
  if (!player.loaded) {
    log("Audio not loaded yet");
    return;
  }

  // AudioContextを開始
  const contextReady = await ensureAudioContext();
  if (!contextReady) {
    log("Failed to start AudioContext");
    return;
  }

  if (isPlaying) {
    // 停止
    player.stop();
    isPlaying = false;
    playButton.classList.remove("playing");
    playIcon.innerHTML = "&#9658;";
    log("Stopped");
  } else {
    // 再生
    try {
      player.start();
      isPlaying = true;
      playButton.classList.add("playing");
      playIcon.innerHTML = "&#9632;";
      log(`Started playback`);
      log(`Player state: ${player.state}`);
      log(`Player volume: ${player.volume.value}dB`);
      log(`Destination volume: ${Tone.getDestination().volume.value}dB`);

      // 1秒後に状態を再確認
      setTimeout(() => {
        log(`After 1s - Player state: ${player.state}`);
        log(`After 1s - Context state: ${Tone.getContext().state}`);
      }, 1000);
    } catch (e) {
      log(`Playback error: ${e}`);
    }
  }
}

// クリックイベント
playButton.addEventListener("click", togglePlayback);

// 再生速度の変更
speedSlider.addEventListener("input", () => {
  const speed = parseFloat(speedSlider.value);
  player.playbackRate = speed;
  speedValue.textContent = `${speed.toFixed(2)}x`;
});

// 初期値の表示
speedValue.textContent = `${parseFloat(speedSlider.value).toFixed(2)}x`;

// 初期状態をログ
log(`UA: ${navigator.userAgent.slice(0, 50)}...`);
