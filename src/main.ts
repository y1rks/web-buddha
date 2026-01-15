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
    console.log("音声ファイルが読み込まれました");
    playButton.disabled = false;
    playButton.style.opacity = "1";
  },
  onerror: (error) => {
    console.error("音声ファイルの読み込みに失敗しました:", error);
    alert("音声ファイルの読み込みに失敗しました。");
  },
}).toDestination();

let isPlaying = false;

// 再生/停止の切り替え
playButton.addEventListener("click", async () => {
  // 読み込み完了を確認
  if (!player.loaded) {
    console.log("音声ファイルを読み込み中です...");
    return;
  }

  // ブラウザのオーディオコンテキストを開始（モバイル対応）
  // iOS Safariでは必ずユーザー操作内でawaitする必要がある
  await Tone.start();
  console.log("AudioContext started:", Tone.getContext().state);

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
