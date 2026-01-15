import * as Tone from "tone";

// DOM要素の取得
const playButton = document.getElementById("playButton") as HTMLButtonElement;
const playIcon = playButton.querySelector(".play-icon") as HTMLSpanElement;
const speedSlider = document.getElementById("speedSlider") as HTMLInputElement;
const speedValue = document.getElementById("speedValue") as HTMLSpanElement;

// Tone.js Playerの作成
// Viteのベースパスを考慮（GitHub Pages対応）
const audioUrl = `${import.meta.env.BASE_URL}loop.mp3`;

const player = new Tone.Player({
  url: audioUrl,
  loop: true,
  onload: () => {
    console.log("音声ファイルが読み込まれました");
  },
  onerror: (error) => {
    console.error("音声ファイルの読み込みに失敗しました:", error);
    alert("音声ファイルの読み込みに失敗しました。public/loop.mp3 を配置してください。");
  },
}).toDestination();

let isPlaying = false;

// 再生/停止の切り替え
playButton.addEventListener("click", async () => {
  // ブラウザのオーディオコンテキストを開始（ユーザー操作が必要）
  if (Tone.getContext().state !== "running") {
    await Tone.start();
  }

  if (isPlaying) {
    // 停止
    player.stop();
    isPlaying = false;
    playButton.classList.remove("playing");
    playIcon.innerHTML = "&#9658;"; // 再生アイコン
  } else {
    // 再生
    player.start();
    isPlaying = true;
    playButton.classList.add("playing");
    playIcon.innerHTML = "&#9632;"; // 停止アイコン
  }
});

// 再生速度の変更
speedSlider.addEventListener("input", () => {
  const speed = parseFloat(speedSlider.value);
  player.playbackRate = speed;
  speedValue.textContent = `${speed.toFixed(2)}x`;
});

// 初期値の表示
speedValue.textContent = `${parseFloat(speedSlider.value).toFixed(2)}x`;
