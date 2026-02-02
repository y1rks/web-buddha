import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

const dist = resolve("dist");
const variants = ["v1", "v2"];

// Copy dist to a temp directory first to avoid self-copy error
const tmp = mkdtempSync(resolve(tmpdir(), "web-buddha-"));
cpSync(dist, tmp, { recursive: true });

for (const variant of variants) {
  cpSync(tmp, resolve(dist, variant), { recursive: true });

  // Rewrite title and h1 for each variant
  const htmlPath = resolve(dist, variant, "index.html");
  const html = readFileSync(htmlPath, "utf-8")
    .replace(/<title>Web Buddha Machine<\/title>/, `<title>Web Buddha Machine ${variant}</title>`)
    .replace(/<h1>Web Buddha Machine<\/h1>/, `<h1>Web Buddha Machine ${variant}</h1>`);
  writeFileSync(htmlPath, html);
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

console.log("Created variants:", variants.join(", "));
