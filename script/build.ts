import { execSync } from "child_process";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  // Pin Vite to v7.x explicitly. Without a version pin, `npx --yes vite`
  // resolves to the latest Vite (currently v8.x), which uses rolldown
  // instead of esbuild. Rolldown ignores the `esbuild.jsxFactory` config in
  // vite.config.js and refuses to parse JSX inside `.tsx` files, breaking
  // the production build. Vite 7 still uses esbuild and works as expected.
  console.log("building client...");
  execSync("npx --yes vite@^7.3.1 build --outDir dist/public", { stdio: "inherit" });

  // Pin esbuild similarly so future major releases can't silently break
  // the server bundle.
  console.log("building server...");
  execSync(
    'npx --yes esbuild@^0.25.0 server/index.js --bundle --platform=node --format=esm --outfile=dist/index.mjs --minify --define:process.env.NODE_ENV=\'"production"\' --define:__PRODUCTION_BUILD__=true --external:dotenv --external:node-cron --external:node-fetch --external:cors --external:express --external:querystring --banner:js="import { createRequire } from \'module\'; const require = createRequire(import.meta.url);"',
    { stdio: "inherit" }
  );
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
