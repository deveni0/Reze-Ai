import fs from "node:fs";
import path from "node:path";

const WEB_DIR = path.join(process.cwd(), "system", "web");
const DEFAULT_PORT = 24599;

const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function getServerPort() {
  return Number(
    process.env.SERVER_PORT ||
    process.env.PORT ||
    process.env.APP_PORT ||
    DEFAULT_PORT
  );
}

const clean = (u) => u.replace(/\/+$/, "");
const https = (d) => (/^https?:\/\//.test(d) ? clean(d) : "https://" + clean(d));

async function resolveBaseUrl(port) {
  const e = process.env;

  if (e.PUBLIC_URL) return clean(e.PUBLIC_URL);
  if (e.APP_URL) return clean(e.APP_URL);
  if (e.SITE_URL) return clean(e.SITE_URL);

  if (e.RENDER_EXTERNAL_URL) return clean(e.RENDER_EXTERNAL_URL);
  if (e.RAILWAY_PUBLIC_DOMAIN) return https(e.RAILWAY_PUBLIC_DOMAIN);
  if (e.RAILWAY_STATIC_URL) return https(e.RAILWAY_STATIC_URL);
  if (e.KOYEB_PUBLIC_DOMAIN) return https(e.KOYEB_PUBLIC_DOMAIN);
  if (e.REPLIT_DEV_DOMAIN) return https(e.REPLIT_DEV_DOMAIN);
  if (e.REPL_SLUG && e.REPL_OWNER) return `https://${e.REPL_SLUG}.${e.REPL_OWNER}.repl.co`;
  if (e.PROJECT_DOMAIN) return `https://${e.PROJECT_DOMAIN}.glitch.me`;
  if (e.FLY_APP_NAME) return `https://${e.FLY_APP_NAME}.fly.dev`;
  if (e.VERCEL_URL) return https(e.VERCEL_URL);
  if (e.HEROKU_APP_NAME) return `https://${e.HEROKU_APP_NAME}.herokuapp.com`;
  if (e.CYCLIC_URL) return https(e.CYCLIC_URL);
  if (e.WEBSITE_HOSTNAME) return https(e.WEBSITE_HOSTNAME); // Azure
  if (e.SPACE_HOST) return https(e.SPACE_HOST); // HuggingFace
  if (e.NORTHFLANK_PUBLIC_URL) return https(e.NORTHFLANK_PUBLIC_URL);
  if (e.CODESPACE_NAME && e.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
    return `https://${e.CODESPACE_NAME}-${port}.${e.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
  }
  if (e.GITPOD_WORKSPACE_URL) {
    return clean(e.GITPOD_WORKSPACE_URL).replace("https://", `https://${port}-`);
  }

  if (e.SERVER_IP && e.SERVER_IP !== "0.0.0.0") {
    return `http://${e.SERVER_IP}:${port}`;
  }

  // VPS / استضافة عادية: نجيب الـ IP العام
  for (const url of [
    "https://api.ipify.org?format=json",
    "https://api.my-ip.io/v2/ip.json",
  ]) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      const ip = data.ip;
      if (ip) return `http://${ip}:${port}`;
    } catch {}
  }

  return `http://localhost:${port}`;
}

export async function api(option) {
  const { client, subs } = option;
  const port = getServerPort();
  let baseUrl = await resolveBaseUrl(port);
  const app = await client.server({ port });

  // يحدّث الرابط من أول طلب حقيقي (يشتغل على أي استضافة / بروكسي)
  function syncBaseUrl(c) {
    try {
      const host = c.req.header("x-forwarded-host") || c.req.header("host");
      if (host && !/^(localhost|127\.|0\.0\.0\.0)/.test(host)) {
        const proto =
          (c.req.header("x-forwarded-proto") || "").split(",")[0].trim() ||
          (host.includes(":") && !host.endsWith(":443") ? "http" : "https");
        baseUrl = `${proto}://${host}`;
      }
    } catch {}
  }

  if (typeof app.use === "function") {
    app.use("*", async (c, next) => {
      syncBaseUrl(c);
      await next();
    });
  }

  app.get("/api/info", (c) => {
    c.header("Cache-Control", "no-store");
    return c.json({ port, site: baseUrl, api: `${baseUrl}/api` });
  });

  app.get("/api/sub/add", async (c) => {
    const number = c.req.query("number");
    if (!number)
      return c.json({ success: false, error: "ex: ?number=20123456789" }, 400);

    const code = await subs.addBot(number);
    if (!code)
      return c.json({ success: false, error: "Failed to create pairing code" }, 500);

    return c.json({ success: true, number, code });
  });

  app.get("/api/sub/count", async (c) => {
    return c.json({ count: subs.list().length });
  });

  app.get("/api/sub/status", async (c) => {
    const number = c.req.query("number");
    if (!number)
      return c.json({ success: false, error: "Number is required" }, 400);

    const bot = subs.get(number);
    return c.json({
      success: true,
      number,
      connected: Boolean(bot?.connected),
      status: bot?.connected ? "connected" : "not_connected",
    });
  });

  app.get("/*", (c) => {
    const file = c.req.path === "/" ? "index.html" : c.req.path.slice(1);
    const full = path.join(WEB_DIR, file);

    if (!full.startsWith(WEB_DIR) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
      return c.text("Not found", 404);
    }

    const ext = path.extname(full).toLowerCase();
    return c.body(fs.readFileSync(full), 200, {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
    });
  });

  app.port = port;
  app.getSiteUrl = () => baseUrl;
  app.getApiUrl = () => `${baseUrl}/api`;

  console.log("========================================");
  console.log("Server Running");
  console.log("Port :", port);
  console.log("Site :", baseUrl);
  console.log("API  :", `${baseUrl}/api`);
  console.log("========================================");

  return app;
}