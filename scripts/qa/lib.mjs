// أدوات مشتركة لسكربتات الجودة: تشغيل الخادم، المتصفّح، وقراءة المسارات من sitemap.
import { spawn } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) args[m[1]] = m[2] ?? true;
  }
  return args;
}

async function waitFor(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      /* لم يبدأ بعد */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`انتهت مهلة انتظار الخادم: ${url}`);
}

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, env, stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} → ${code}`))));
  });
}

/**
 * يعيد { baseUrl, stop }.
 *  - QA_BASE_URL معرَّف: يستعمل خادمًا يعمل (لا يشغّل ولا يوقف شيئًا).
 *  - غير ذلك: يشغّل `next start` على QA_PORT (افتراضي 3160) بنسخة مؤقتة من
 *    dev.db — لا يمسّ القاعدة الأصلية أبدًا — ويقتل عمليته هو فقط عند الانتهاء.
 *    --build يبني أولًا؛ بدونه يجب أن يوجد .next من بناء سابق.
 */
export async function ensureServer({ build = false } = {}) {
  if (process.env.QA_BASE_URL) {
    const baseUrl = process.env.QA_BASE_URL.replace(/\/$/, "");
    await waitFor(baseUrl);
    return { baseUrl, stop: async () => {} };
  }

  const port = process.env.QA_PORT ?? "3160";
  const baseUrl = `http://localhost:${port}`;

  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    const copy = path.join(tmpdir(), "fsat-qa.db");
    copyFileSync(path.join(ROOT, "dev.db"), copy);
    dbUrl = `file:${copy}`;
  }
  const env = {
    ...process.env,
    DATABASE_URL: dbUrl,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? baseUrl,
    NODE_ENV: "production",
  };

  const nextBin = path.join(ROOT, "node_modules/next/dist/bin/next");
  if (build || !existsSync(path.join(ROOT, ".next/BUILD_ID"))) {
    console.log("› بناء المشروع (next build)…");
    await run(process.execPath, [nextBin, "build"], env);
  }

  const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  child.on("exit", (code) => {
    if (code && code !== 0 && code !== null) console.error(`الخادم توقّف برمز ${code}\n${log.slice(-2000)}`);
  });

  try {
    await waitFor(baseUrl);
  } catch (e) {
    child.kill();
    throw new Error(`${e.message}\n${log.slice(-2000)}`);
  }

  return {
    baseUrl,
    serverLog: () => log,
    stop: async () => {
      child.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 300));
    },
  };
}

/** يشغّل Chromium من playwright أو يرجع إلى Chrome المثبّت في النظام. */
export async function launchBrowser() {
  const { chromium } = await import("playwright");
  try {
    return await chromium.launch();
  } catch {
    return await chromium.launch({ channel: "chrome" });
  }
}

/** مسارات الموقع العامة من sitemap.xml (المنشأ يُستبدل بالمنشأ المُختبَر). */
export async function sitemapPaths(baseUrl) {
  const res = await fetch(`${baseUrl}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml → ${res.status}`);
  const xml = await res.text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    const u = new URL(m[1]);
    return decodeURI(u.pathname) + u.search;
  });
  return [...new Set(paths)];
}

export const MOBILE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

export const DESKTOP = { viewport: { width: 1366, height: 800 } };

/** يمرّر الصفحة تدريجيًا ليُفعَّل كل ScrollTrigger/Reveal ثم يعود للأعلى. */
export async function scrollThrough(page, { step = 0.8, pause = 120 } = {}) {
  await page.evaluate(
    async ({ step, pause }) => {
      const vh = window.innerHeight;
      let y = 0;
      // الارتفاع قد يتغيّر أثناء التمرير (pin/صور كسولة) فنعيد قراءته
      while (y < document.documentElement.scrollHeight - vh + 1) {
        y += vh * step;
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, pause));
      }
      await new Promise((r) => setTimeout(r, 400));
    },
    { step, pause },
  );
}
