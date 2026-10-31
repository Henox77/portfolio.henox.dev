/**
 * One-time Spotify authorisation.
 *
 *   npm run spotify:auth
 *
 * Spotify has no way to mint a refresh token without a human approving the
 * scopes in a browser, so this spins up a throwaway localhost server, opens the
 * consent page, catches the redirect, and writes the token into `.env.local`.
 * It never touches the network again after that.
 *
 * Before running, create an app at https://developer.spotify.com/dashboard and
 * add exactly this redirect URI:
 *
 *   http://127.0.0.1:8888/callback
 *
 * SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are read from the environment or,
 * failing that, from `.env.local` — so on Windows there's nothing to export.
 */
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PORT = 8888;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const ENV_FILE = path.join(process.cwd(), ".env.local");
/** Long enough to log in and approve, short enough not to leave a port open. */
const TIMEOUT_MS = 5 * 60_000;

const tty = process.stdout.isTTY;
const paint = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = paint("32");
const red = paint("31");
const dim = paint("2");
const bold = paint("1");

const ok = (msg) => console.log(`${green("✔")} ${msg}`);
const info = (msg) => console.log(`${dim("›")} ${msg}`);
function fail(msg, detail) {
  console.error(`\n${red("✖")} ${msg}`);
  if (detail) console.error(dim(typeof detail === "string" ? detail : JSON.stringify(detail, null, 2)));
  process.exitCode = 1;
}

/** Minimal dotenv: KEY=value lines, optional quotes, # comments. */
function readEnvFile() {
  if (!existsSync(ENV_FILE)) return {};
  const out = {};
  for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trimStart().startsWith("#")) {
      out[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  }
  return out;
}

/** Sets or replaces one key, leaving every other line as it was. */
function writeEnvKey(key, value) {
  const lines = existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, "utf8").split(/\r?\n/)
    : [];
  const at = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (at >= 0) lines[at] = `${key}=${value}`;
  else {
    while (lines.length && lines.at(-1) === "") lines.pop();
    lines.push(`${key}=${value}`);
  }
  writeFileSync(ENV_FILE, lines.join("\n") + "\n");
}

/**
 * Stores the value on the linked Netlify site as a secret (write-only in the
 * UI), when this folder has been `netlify link`ed. False if it couldn't.
 */
function pushToNetlify(key, value) {
  if (!existsSync(path.join(process.cwd(), ".netlify", "state.json"))) return false;
  const args = ["env:set", key, value, "--secret", "--context", "production", "deploy-preview", "branch-deploy", "--force"];
  // On Windows the CLI is a .cmd shim, which only runs through cmd. Calling cmd
  // directly rather than `shell: true` avoids Node's unescaped-args warning;
  // the token is URL-safe base64, so there is nothing for cmd to interpret.
  const res =
    process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", "netlify", ...args], { stdio: "ignore" })
      : spawnSync("netlify", args, { stdio: "ignore" });
  return res.status === 0;
}

function openBrowser(url) {
  // Not `start`: it's a cmd built-in rather than a program, so spawning it fails
  // with ENOENT, and going through cmd means escaping every `&` in the URL.
  const cmd =
    process.platform === "win32"
      ? "explorer.exe"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";
  const args = [url];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    // The URL is printed anyway.
  }
}

const page = (title, body, accent = "#1db954") => `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#121212;color:#e6e9ea;font:16px/1.6 system-ui,sans-serif}
  main{max-width:420px;padding:2.5rem;border-radius:16px;background:linear-gradient(#1f1f1f,#161616);box-shadow:0 20px 60px #0008;text-align:center}
  .dot{width:56px;height:56px;margin:0 auto 1rem;border-radius:50%;background:${accent};display:grid;place-items:center;color:#000;font-size:28px;font-weight:700}
  h1{margin:0 0 .5rem;font-size:1.4rem}p{margin:0;color:#a7a7a7}
</style></head><body><main>${body}</main></body></html>`;

const env = { ...readEnvFile(), ...process.env };
const CLIENT_ID = env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = env.SPOTIFY_CLIENT_SECRET;

console.log(`\n${bold("Spotify yetkilendirme")} ${dim("· henoxdev")}\n`);

if (!CLIENT_ID || !CLIENT_SECRET) {
  fail(
    "SPOTIFY_CLIENT_ID ve SPOTIFY_CLIENT_SECRET bulunamadı.",
    "\n  .env.local dosyasına ekle:\n\n" +
      "    SPOTIFY_CLIENT_ID=...\n" +
      "    SPOTIFY_CLIENT_SECRET=...\n\n" +
      "  İkisi de https://developer.spotify.com/dashboard adresindeki uygulamanda.\n" +
      `  Redirect URI olarak tam olarak şunu ekle: ${REDIRECT}\n`,
  );
  process.exit();
}

ok(`Client ID bulundu ${dim(`(${CLIENT_ID.slice(0, 6)}…)`)}`);

// Only what the site actually reads. Anything more would be over-asking for a
// token that lives in a deployment env var indefinitely.
const SCOPES = ["user-read-currently-playing", "user-read-recently-played"];
const state = randomBytes(16).toString("hex");

const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES.join(" "),
    redirect_uri: REDIRECT,
    state,
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const finish = (status, title, body, accent) => {
    res
      .writeHead(status, { "content-type": "text/html; charset=utf-8" })
      .end(page(title, body, accent));
    server.close();
    clearTimeout(timer);
  };

  if (url.searchParams.get("state") !== state) {
    fail("State eşleşmedi — baştan başla.");
    finish(400, "Hata", `<div class="dot">!</div><h1>State eşleşmedi</h1><p>Scripti yeniden çalıştır.</p>`, "#e05c62");
    return;
  }

  const error = url.searchParams.get("error");
  if (error) {
    fail(`Spotify reddetti: ${error}`);
    finish(400, "Hata", `<div class="dot">!</div><h1>İzin verilmedi</h1><p>Spotify: ${error}</p>`, "#e05c62");
    return;
  }

  info("Kod alındı, token ile değiştiriliyor…");

  let json;
  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: url.searchParams.get("code") ?? "",
        redirect_uri: REDIRECT,
      }),
    });
    json = await tokenRes.json();
    if (!tokenRes.ok || !json.refresh_token) throw json;
  } catch (err) {
    fail("Token değişimi başarısız.", err);
    finish(500, "Hata", `<div class="dot">!</div><h1>Token alınamadı</h1><p>Ayrıntılar terminalde.</p>`, "#e05c62");
    return;
  }

  writeEnvKey("SPOTIFY_CLIENT_ID", CLIENT_ID);
  writeEnvKey("SPOTIFY_CLIENT_SECRET", CLIENT_SECRET);
  writeEnvKey("SPOTIFY_REFRESH_TOKEN", json.refresh_token);

  // Never printed: terminal scrollback and screen shares are how tokens leak.
  ok(`Refresh token alındı ve ${bold(".env.local")} dosyasına yazıldı.`);

  if (pushToNetlify("SPOTIFY_REFRESH_TOKEN", json.refresh_token)) {
    ok("Netlify'a gizli değişken olarak kaydedildi. Bir sonraki deploy'da canlıda.");
  } else {
    info(
      "Netlify CLI bağlı değil. SPOTIFY_REFRESH_TOKEN'ı .env.local'dan alıp Netlify'da\n" +
        "  Site configuration → Environment variables kısmına ekle.",
    );
  }
  info(`Yerelde denemek için ${bold("npm run dev")}.\n`);

  finish(
    200,
    "Tamam",
    `<div class="dot">✓</div><h1>Bağlandı</h1><p>Refresh token .env.local dosyasına kaydedildi. Bu sekmeyi kapatabilirsin.</p>`,
  );
});

server.on("error", (err) => {
  fail(
    err.code === "EADDRINUSE"
      ? `${PORT} portu kullanımda. Onu kullanan programı kapatıp tekrar dene.`
      : `Sunucu başlatılamadı: ${err.message}`,
  );
  process.exit();
});

const timer = setTimeout(() => {
  fail("5 dakika içinde onay gelmedi, kapatılıyor.");
  server.close();
}, TIMEOUT_MS);

server.listen(PORT, "127.0.0.1", () => {
  info("Tarayıcıda Spotify onay sayfası açılıyor…");
  console.log(`  ${dim("Açılmazsa bu adrese git:")}\n\n  ${authUrl}\n`);
  openBrowser(authUrl);
});
