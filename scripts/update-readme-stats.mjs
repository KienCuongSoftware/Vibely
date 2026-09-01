#!/usr/bin/env node
/**
 * Fetches /api/public/stats and refreshes README.md (LIVE-STATS block) + docs/stats/platform-stats.json.
 * Usage: node scripts/update-readme-stats.mjs
 * Env:   STATS_URL (default https://vibely.sbs/api/public/stats)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const JSON_PATH = path.join(ROOT, "docs/stats/platform-stats.json");
const README_PATH = path.join(ROOT, "README.md");
const STATS_URL = process.env.STATS_URL || "https://vibely.sbs/api/public/stats";

function formatCount(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("en-US");
}

function formatUpdatedAt(iso) {
  try {
    return `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC`;
  } catch {
    return "unknown";
  }
}

function statusLabel(apiStatus) {
  const s = (apiStatus || "").toUpperCase();
  if (s === "UP") return "online";
  if (s === "PENDING") return "pending deploy";
  return "degraded";
}

function buildBlock(stats) {
  const users = Number(stats.activeUsers) || 0;
  const videos = Number(stats.publishedVideos) || 0;
  const views = Number(stats.totalViews) || 0;
  const locales = Number(stats.supportedLocales) || 56;
  const viewsK = views >= 1_000 ? Math.round(views / 1_000) : views;
  const yMax = Math.max(
    60,
    Math.ceil(Math.max(users, videos, viewsK, locales) * 1.2 / 10) * 10
  );

  return `<!-- LIVE-STATS:START -->
### Production metrics · [vibely.sbs](https://vibely.sbs)

| Metric | Count |
|--------|------:|
| Active creators | **${formatCount(users)}** |
| Published videos | **${formatCount(videos)}** |
| Total views | **${formatCount(views)}** |
| UI locales | **${locales}** |
| Status | **${statusLabel(stats.apiStatus)}** |

<sub>Updated ${formatUpdatedAt(stats.generatedAt)} · <a href="https://vibely.sbs/api/public/stats">JSON</a> · daily GitHub Action</sub>

\`\`\`mermaid
xychart-beta
    title "Vibely production"
    x-axis [Creators, Videos, "Views (k)", Locales]
    y-axis "Count" 0 --> ${yMax}
    bar [${users}, ${videos}, ${viewsK}, ${locales}]
\`\`\`
<!-- LIVE-STATS:END -->`;
}

function updateReadme(block) {
  const readme = fs.readFileSync(README_PATH, "utf8");
  const marker = /<!-- LIVE-STATS:START -->[\s\S]*?<!-- LIVE-STATS:END -->/;
  if (!marker.test(readme)) {
    throw new Error("README.md is missing <!-- LIVE-STATS:START --> … <!-- LIVE-STATS:END --> markers");
  }
  fs.writeFileSync(README_PATH, readme.replace(marker, block));
}

async function fetchStats() {
  const res = await fetch(STATS_URL, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${STATS_URL}`);
  }
  const body = await res.json();
  if (!body.success || !body.data) {
    throw new Error(body.error?.message || "API returned success=false");
  }
  return {
    ...body.data,
    source: "api",
    generatedAt: body.data.generatedAt || new Date().toISOString(),
  };
}

function loadCachedOrSeed() {
  if (fs.existsSync(JSON_PATH)) {
    return JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  }
  return {
    activeUsers: 0,
    publishedVideos: 0,
    totalViews: 0,
    supportedLocales: 56,
    apiStatus: "PENDING",
    generatedAt: new Date().toISOString(),
    source: "seed",
  };
}

async function main() {
  let stats;
  try {
    stats = await fetchStats();
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, `${JSON.stringify(stats, null, 2)}\n`);
    console.log("Fetched live stats from", STATS_URL);
  } catch (err) {
    console.warn("Live fetch failed:", err.message);
    stats = loadCachedOrSeed();
    if (!fs.existsSync(JSON_PATH)) {
      fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
      fs.writeFileSync(JSON_PATH, `${JSON.stringify(stats, null, 2)}\n`);
    }
    console.log("Using", stats.source === "seed" ? "seed defaults" : "cached JSON");
  }

  updateReadme(buildBlock(stats));
  console.log("README live-stats block updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
