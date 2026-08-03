"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = 47831;
const TOKEN_FILE = path.join(__dirname, ".bridge-token");
const ASSET_DIR = path.join(__dirname, "assets");
const MAX_BODY_BYTES = 32 * 1024 * 1024;

function getToken() {
  if (fs.existsSync(TOKEN_FILE)) return fs.readFileSync(TOKEN_FILE, "utf8").trim();
  const token = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
  return token;
}

const token = getToken();
let latestScene = null;

function cors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Token");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function send(response, status, body) {
  cors(response);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function authorized(request) {
  const supplied = request.headers["x-bridge-token"];
  return typeof supplied === "string" && supplied.length === token.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
}

function validScene(scene) {
  return scene && scene.version === 1 && scene.frame && typeof scene.frame.name === "string" &&
    Number.isFinite(scene.frame.width) && scene.frame.width > 0 && Number.isFinite(scene.frame.height) && scene.frame.height > 0 &&
    Array.isArray(scene.layers) && scene.layers.length <= 1000;
}

function safeFileName(value) {
  return String(value || "image").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

function materializeImages(scene) {
  const imageLayers = scene.layers.filter((layer) => layer && layer.kind === "image" && layer.imageData);
  if (!imageLayers.length) return scene;
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  for (const layer of imageLayers) {
    const allowedExtensions = { png: true, jpg: true, jpeg: true, gif: true, webp: true };
    const extension = allowedExtensions[String(layer.imageExtension || "").toLowerCase()] ? String(layer.imageExtension).toLowerCase() : "png";
    const fileName = `${safeFileName(scene.exportId)}_${safeFileName(layer.id)}.${extension}`;
    const imagePath = path.resolve(ASSET_DIR, fileName);
    fs.writeFileSync(imagePath, Buffer.from(layer.imageData, "base64"));
    layer.imagePath = imagePath;
    delete layer.imageData;
  }
  return scene;
}

const server = http.createServer((request, response) => {
  if (request.method === "OPTIONS") return send(response, 204, {});
  // Local pairing endpoint for the development MVP. The production companion
  // will replace this with an installer-managed, per-user session handshake.
  if (request.method === "GET" && request.url === "/v1/session") return send(response, 200, { token });
  if (!authorized(request)) return send(response, 401, { error: "Token inválido." });

  if (request.method === "GET" && request.url === "/v1/scene/latest") {
    return latestScene ? send(response, 200, latestScene) : send(response, 404, { error: "Nenhum frame recebido ainda." });
  }

  if (request.method === "POST" && request.url === "/v1/scene") {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) request.destroy(); else chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        const scene = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!validScene(scene)) return send(response, 422, { error: "Payload de cena inválido." });
        latestScene = materializeImages(scene);
        send(response, 201, { ok: true, layerCount: scene.layers.length });
      } catch (_) { send(response, 400, { error: "JSON inválido." }); }
    });
    return;
  }
  send(response, 404, { error: "Rota não encontrada." });
});

server.listen(PORT, HOST, () => {
  console.log(`Bridge pronta em http://localhost:${PORT}`);
  console.log("Figma e After Effects serão conectados automaticamente.");
  console.log("Mantenha esta janela aberta durante o desenvolvimento.");
});
