import { cp, mkdir, writeFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("assets", "dist/assets", { recursive: true });
await writeFile("dist/.nojekyll", "");
console.log("Sitio estático preparado en dist/");
