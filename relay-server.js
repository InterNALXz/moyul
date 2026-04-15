const http = require("http");
const { URL } = require("url");

const PORT = Number.parseInt(process.env.RELAY_PORT || "9000", 10);

const endpointClients = new Map();
const peerIdClients = new Map();
const usernameClients = new Map();
const clientMetaByResponse = new Map();
const usernameOwnerByKey = new Map();

function getDefaultPort(protocol) {
  if (protocol === "https:") {
    return 443;
  }
  if (protocol === "http:") {
    return 80;
  }
  return null;
}

function canonicalizeHost(host) {
  const normalized = String(host || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  if (!normalized) {
    return "";
  }
  if (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "0.0.0.0"
  ) {
    return "127.0.0.1";
  }
  return normalized;
}

function normalizeEndpointKey(endpointLike) {
  const raw = String(endpointLike || "").trim();
  if (!raw) {
    return "";
  }
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return raw;
  }
  const host = canonicalizeHost(parsed.hostname);
  const port = Number.parseInt(parsed.port || String(getDefaultPort(parsed.protocol) || ""), 10);
  if (!host || !port || port < 1 || port > 65535) {
    return raw;
  }
  const hostPart = host.includes(":") ? `[${host}]` : host;
  return `${hostPart}:${port}`;
}

function normalizeUsername(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return "";
  }
  const withoutPrefix = text.startsWith("@") ? text.slice(1) : text;
  const length = Array.from(withoutPrefix).length;
  if (length < 2 || length > 32) {
    return "";
  }
  if (!/^[\p{L}\p{N}._-]+$/u.test(withoutPrefix)) {
    return "";
  }
  return withoutPrefix;
}

function usernameKey(raw) {
  const normalized = normalizeUsername(raw);
  return normalized ? normalized.toLowerCase() : "";
}

function xorBufferWithKey(inputBuffer, keyText) {
  const keyBuffer = Buffer.from(String(keyText || ""), "utf8");
  if (!keyBuffer.length) {
    throw new Error("missing xor key");
  }
  const output = Buffer.allocUnsafe(inputBuffer.length);
  for (let index = 0; index < inputBuffer.length; index += 1) {
    output[index] = inputBuffer[index] ^ keyBuffer[index % keyBuffer.length];
  }
  return output;
}

function xorEncryptToBase64(plainText, keyText) {
  const plainBuffer = Buffer.from(String(plainText ?? ""), "utf8");
  const encrypted = xorBufferWithKey(plainBuffer, keyText);
  return encrypted.toString("base64");
}

function xorDecryptFromBase64(cipherText, keyText) {
  const encryptedBuffer = Buffer.from(String(cipherText || ""), "base64");
  const plainBuffer = xorBufferWithKey(encryptedBuffer, keyText);
  return plainBuffer.toString("utf8");
}

function buildForwardPacket(packet, targetPeerId) {
  if (
    packet.type !== "data-message" ||
    !packet.secure ||
    packet.secure.alg !== "xor-id-v1" ||
    typeof packet.payloadEncrypted !== "string"
  ) {
    return packet;
  }
  if (!packet.fromPeerId || !targetPeerId) {
    return packet;
  }
  try {
    const plainText = xorDecryptFromBase64(packet.payloadEncrypted, packet.fromPeerId);
    const reEncrypted = xorEncryptToBase64(plainText, targetPeerId);
    return {
      ...packet,
      payloadEncrypted: reEncrypted,
      toPeerId: targetPeerId,
      secure: {
        ...packet.secure,
        relayTransformed: true,
      },
    };
  } catch {
    return packet;
  }
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getClients(mapRef, keyLike) {
  const key = String(keyLike || "").trim();
  if (!key) {
    return null;
  }
  if (!mapRef.has(key)) {
    mapRef.set(key, new Set());
  }
  return mapRef.get(key);
}

function removeClient(mapRef, keyLike, client) {
  const key = String(keyLike || "").trim();
  if (!key) {
    return;
  }
  const clients = mapRef.get(key);
  if (!clients) {
    return;
  }
  clients.delete(client);
  if (!clients.size) {
    mapRef.delete(key);
  }
}

function cleanupResponseClient(res) {
  const meta = clientMetaByResponse.get(res);
  if (!meta) {
    return;
  }
  removeClient(endpointClients, meta.endpointKey, res);
  removeClient(peerIdClients, meta.peerId, res);
  removeClient(usernameClients, meta.usernameKey, res);
  if (meta.usernameKey) {
    const usernameSet = usernameClients.get(meta.usernameKey);
    if (!usernameSet || !usernameSet.size) {
      const owner = usernameOwnerByKey.get(meta.usernameKey);
      if (!owner || owner === meta.peerId) {
        usernameOwnerByKey.delete(meta.usernameKey);
      }
    }
  }
  clientMetaByResponse.delete(res);
}

function sendSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function createServer() {
  return http.createServer((req, res) => {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const reqUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && reqUrl.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          ok: true,
          endpointClients: endpointClients.size,
          peerIdClients: peerIdClients.size,
          usernameClients: usernameClients.size,
        })
      );
      return;
    }

    if (req.method === "GET" && reqUrl.pathname === "/resolve-username") {
      const username = normalizeUsername(reqUrl.searchParams.get("username") || "");
      const key = usernameKey(username);
      if (!username || !key) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "missing/invalid username" }));
        return;
      }
      const clients = usernameClients.get(key);
      const peerId = usernameOwnerByKey.get(key) || "";
      if (!clients || !clients.size || !peerId) {
        res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "username offline", username }));
        return;
      }
      let endpoint = "";
      for (const client of clients) {
        const meta = clientMetaByResponse.get(client);
        if (meta && meta.endpointKey) {
          endpoint = meta.endpointKey;
          break;
        }
      }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          ok: true,
          username,
          peerId,
          endpoint,
        })
      );
      return;
    }

    if (req.method === "GET" && reqUrl.pathname === "/register") {
      const endpoint = (reqUrl.searchParams.get("endpoint") || "").trim();
      const endpointKey = normalizeEndpointKey(endpoint);
      const peerId = (reqUrl.searchParams.get("peerId") || "").trim();
      const username = normalizeUsername(reqUrl.searchParams.get("username") || "");
      const userKey = usernameKey(username);
      if (!endpointKey) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "missing endpoint" }));
        return;
      }
      if (!peerId) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "missing peerId" }));
        return;
      }
      if (!username) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "missing/invalid username" }));
        return;
      }
      const ownerPeerId = usernameOwnerByKey.get(userKey);
      if (ownerPeerId && ownerPeerId !== peerId) {
        res.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            ok: false,
            error: "username already in use",
            username,
          })
        );
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      res.write(": connected\n\n");

      const endpointSet = getClients(endpointClients, endpointKey);
      endpointSet.add(res);
      const peerSet = getClients(peerIdClients, peerId);
      peerSet.add(res);
      const usernameSet = getClients(usernameClients, userKey);
      usernameSet.add(res);
      usernameOwnerByKey.set(userKey, peerId);
      clientMetaByResponse.set(res, {
        endpointKey,
        peerId,
        username,
        usernameKey: userKey,
      });

      const heartbeat = setInterval(() => {
        res.write(": ping\n\n");
      }, 15000);

      req.on("close", () => {
        clearInterval(heartbeat);
        cleanupResponseClient(res);
      });
      return;
    }

    if (req.method === "POST" && reqUrl.pathname === "/send") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 2 * 1024 * 1024) {
          req.destroy();
        }
      });

      req.on("end", () => {
        let packet;
        try {
          packet = JSON.parse(body || "{}");
        } catch {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "invalid json" }));
          return;
        }

        const endpoint = (packet.toEndpoint || "").trim();
        const endpointKey = normalizeEndpointKey(endpoint);
        const toPeerId = (packet.toPeerId || "").trim();
        const toUsername = normalizeUsername(packet.toUsername || "");
        const toUsernameKey = usernameKey(toUsername);
        if (!endpointKey && !toPeerId && !toUsernameKey) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "missing toEndpoint/toPeerId/toUsername" }));
          return;
        }

        let route = "endpoint";
        let target = endpointKey;
        let clients = endpointClients.get(endpointKey);
        if (toPeerId) {
          route = "peerId";
          target = toPeerId;
          clients = peerIdClients.get(toPeerId);
        } else if (toUsernameKey) {
          route = "username";
          target = toUsername;
          clients = usernameClients.get(toUsernameKey);
        }
        let delivered = 0;
        if (clients && clients.size) {
          for (const client of clients) {
            if (client.writableEnded) {
              continue;
            }
            const clientMeta = clientMetaByResponse.get(client);
            const targetPeerId = clientMeta && clientMeta.peerId ? clientMeta.peerId : "";
            const forwardPacket = buildForwardPacket(packet, targetPeerId);
            sendSse(client, forwardPacket);
            delivered += 1;
          }
        }

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            ok: true,
            delivered,
            route,
            target,
          })
        );
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "not found" }));
  });
}

const server = createServer();
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Relay server running at http://127.0.0.1:${PORT}`);
});
