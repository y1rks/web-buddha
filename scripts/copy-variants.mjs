import { cpSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

const dist = resolve("dist");
const variants = ["v1", "v2"];

// Copy dist to a temp directory first to avoid self-copy error
const tmp = mkdtempSync(resolve(tmpdir(), "web-buddha-"));
cpSync(dist, tmp, { recursive: true });

for (const variant of variants) {
  cpSync(tmp, resolve(dist, variant), { recursive: true });
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
