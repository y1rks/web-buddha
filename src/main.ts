import * as Tone from "tone";

// DOM要素の取得
const playButton = document.getElementById("playButton") as HTMLButtonElement;
const playIcon = playButton.querySelector(".play-icon") as HTMLSpanElement;
const speedSlider = document.getElementById("speedSlider") as HTMLInputElement;
const speedValue = document.getElementById("speedValue") as HTMLSpanElement;

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

// 再生/停止の切り替え
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
