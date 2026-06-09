import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";

const banner = { js: "/*! bsky-comments-client | (c) 2026 Francisco Laplace | MIT */" };
const shared = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  target: ["es2020"],
  banner,
  logLevel: "info",
};

await mkdir("dist", { recursive: true });
await build({ ...shared, format: "esm", outfile: "dist/bsky-comments.js" });
await build({ ...shared, format: "iife", minify: true, outfile: "dist/bsky-comments.min.js" });
await copyFile("styles/bsky-comments.css", "dist/bsky-comments.css");
