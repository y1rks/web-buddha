import { copyFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

const dist = resolve("dist");

// Per-variant config: audioFile overrides loop.mp3 if specified
const variants = [
  { name: "v1" },
  { name: "v2", audioFile: "korogari.mp3" },
];

// Copy dist to a temp directory first to avoid self-copy error
const tmp = mkdtempSync(resolve(tmpdir(), "web-buddha-"));
cpSync(dist, tmp, { recursive: true });

for (const { name, audioFile } of variants) {
  cpSync(tmp, resolve(dist, name), { recursive: true });

  // Rewrite title and h1 for each variant
  const htmlPath = resolve(dist, name, "index.html");
  const html = readFileSync(htmlPath, "utf-8")
    .replace(/<title>Web Buddha Machine<\/title>/, `<title>Web Buddha Machine ${name}</title>`)
    .replace(/<h1>Web Buddha Machine<\/h1>/, `<h1>Web Buddha Machine ${name}</h1>`);
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
