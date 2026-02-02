import { copyFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

const dist = resolve("dist");

// Per-variant config: audioFile overrides loop.mp3 if specified
const variants = [
  { name: "v1" },
  { name: "v2", audioFile: "korogari.mp3" },
];

// GPS UI markup to replace the slider controls in v2
const gpsControlsHtml = `
        <div class="controls">
          <div id="gpsStatus" class="gps-status idle">GPS待機中</div>
          <div class="distance-display" id="distanceDisplay">0.0 m</div>
          <div class="speed-display" id="speedDisplay">1.00x</div>
          <div class="gps-debug">
            緯度: <span id="debugLat">--</span><br>
            経度: <span id="debugLon">--</span><br>
            精度: <span id="debugAccuracy">--</span><br>
            生距離: <span id="debugRawDist">--</span>
          </div>
        </div>`;

const sliderControlsRegex = /<div class="controls">[\s\S]*?<\/div>\s*<\/div>\s*(<\/div>)/;

// Copy dist to a temp directory first to avoid self-copy error
const tmp = mkdtempSync(resolve(tmpdir(), "web-buddha-"));
cpSync(dist, tmp, { recursive: true });

for (const { name, audioFile } of variants) {
  cpSync(tmp, resolve(dist, name), { recursive: true });

  // Rewrite title and h1 for each variant
  const htmlPath = resolve(dist, name, "index.html");
  let html = readFileSync(htmlPath, "utf-8")
    .replace(/<title>Web Buddha Machine<\/title>/, `<title>Web Buddha Machine ${name}</title>`)
    .replace(/<h1>Web Buddha Machine<\/h1>/, `<h1>Web Buddha Machine ${name}</h1>`);

  // v2: inject data-variant and replace slider with GPS UI
  if (name === "v2") {
    html = html.replace("<body>", '<body data-variant="v2">');
    html = html.replace(
      sliderControlsRegex,
      gpsControlsHtml + "\n      $1",
    );
  }

  writeFileSync(htmlPath, html);

  // Override audio file if specified
  if (audioFile) {
    copyFileSync(resolve(dist, name, audioFile), resolve(dist, name, "loop.mp3"));
  }
}

rmSync(tmp, { recursive: true });

writeFileSync(
  resolve(dist, "index.html"),
  `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=v1/">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="v1/">v1/</a></p>
</body>
</html>
`
);

console.log("Created variants:", variants.map((v) => v.name).join(", "));
