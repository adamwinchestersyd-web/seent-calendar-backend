import { execSync } from "child_process";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  execSync("npx --yes vite build --outDir dist/public", { stdio: "inherit" });

  console.log("building server...");
  execSync(
    'npx --yes esbuild server/index.js --bundle --platform=node --format=esm --outfile=dist/index.mjs --minify --define:process.env.NODE_ENV=\'"production"\' --define:__PRODUCTION_BUILD__=true --external:dotenv --external:node-cron --external:node-fetch --external:cors --external:express --external:querystring --banner:js="import { createRequire } from \'module\'; const require = createRequire(import.meta.url);"',
    { stdio: "inherit" }
  );
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
