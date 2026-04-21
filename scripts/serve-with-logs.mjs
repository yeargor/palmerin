import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";

const rootDir = process.cwd();
const port = Number.parseInt(process.env.PORT || "4173", 10);
const host = process.env.HOST || "0.0.0.0";
const battleLogDir = path.join(rootDir, "artifacts", "battle");
const battleLogFile = path.join(battleLogDir, "battle-events.jsonl");

const contentTypeByExt = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sanitizePathname(urlPathname) {
  const safePath = path.normalize(decodeURIComponent(urlPathname)).replace(/^([.][.][/\\])+/, "");
  const joined = path.join(rootDir, safePath);
  if (!joined.startsWith(rootDir)) {
    return rootDir;
  }
  return joined;
}

async function writeBattleEvent(event) {
  await fs.mkdir(battleLogDir, { recursive: true });
  const line = `${JSON.stringify(event)}\n`;
  await fs.appendFile(battleLogFile, line, "utf8");
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleBattleTelemetry(req, res) {
  try {
    const raw = await collectBody(req);
    const payload = raw ? JSON.parse(raw) : {};
    const event = {
      receivedAt: new Date().toISOString(),
      ...payload,
    };
    await writeBattleEvent(event);
    res.writeHead(204);
    res.end();
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: String(error?.message || error) }));
  }
}

async function handleBattleLogRead(res) {
  try {
    const raw = await fs.readFile(battleLogFile, "utf8");
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(raw);
  } catch {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("");
  }
}

async function serveStatic(req, res) {
  const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let targetPath = sanitizePathname(reqUrl.pathname);

  try {
    const stat = await fs.stat(targetPath).catch(() => null);
    if (stat?.isDirectory()) {
      targetPath = path.join(targetPath, "index.html");
    }

    const fileStat = await fs.stat(targetPath).catch(() => null);
    if (!fileStat || !fileStat.isFile()) {
      targetPath = path.join(rootDir, "index.html");
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = contentTypeByExt[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    createReadStream(targetPath).pipe(res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Server error: ${String(error?.message || error)}`);
  }
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "POST" && reqUrl.pathname === "/__telemetry/battle") {
    await handleBattleTelemetry(req, res);
    return;
  }

  if (req.method === "GET" && reqUrl.pathname === "/__telemetry/battle-log") {
    await handleBattleLogRead(res);
    return;
  }

  await serveStatic(req, res);
});

server.listen(port, host, () => {
  console.log(`[serve-with-logs] http://${host}:${port}`);
  console.log(`[serve-with-logs] battle log file: ${battleLogFile}`);
});
