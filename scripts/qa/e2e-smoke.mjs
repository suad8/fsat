#!/usr/bin/env node
/**
 * اختبار دخان E2E — يزور كل المسارات العامة (من sitemap.xml) ويفحص:
 *   ١. حالة 200 (وصفحة غير موجودة تعيد 404 فعلًا لا 200)
 *   ٢. لا أخطاء console ولا pageerror ولا طلبات فاشلة/4xx/5xx من نفس الموقع
 *   ٣. لا تمرير أفقي على 390px (وعلى 320 و768 كفحص إضافي)
 *   ٤. كل h1/h2/h3 يظهر فعلًا في وقت ما أثناء التمرير (opacity/قصّ/إخفاء بحركة عالقة)
 *   ٥. لا نص «[[» ظاهر للعميل
 *   ٦. title و meta description و canonical (يطابق مسار الصفحة) و h1 واحد و lang/dir
 *   ٧. صلاحية الروابط الداخلية (وأهداف #anchor) والصور المكسورة
 *   ٨. نفس فحص العناوين مع prefers-reduced-motion وبدون JavaScript على الصفحات الرئيسية
 *
 * الاستعمال:
 *   npm run test:e2e                 # يشغّل next start بنفسه (يلزم build سابق أو --build)
 *   npm run test:e2e -- --build
 *   QA_BASE_URL=http://localhost:3160 npm run test:e2e   # خادم يعمل مسبقًا
 *   خيارات: --only=/shop,/about  --json=out.json  --quick (يتخطّى الأوضاع الإضافية)
 */
import { writeFileSync } from "node:fs";

import { DESKTOP, ensureServer, launchBrowser, MOBILE, parseArgs, sitemapPaths } from "./lib.mjs";

const args = parseArgs();

// ---------------------------------------------------------------------------
// دوال تُنفَّذ داخل الصفحة
// ---------------------------------------------------------------------------

/** يثبّت أدوات الفحص على window لتُستدعى عبر evaluate. */
const INJECT = () => {
  const NS = (window.__qa = {});

  NS.headingInfo = (el) => {
    const rect = el.getBoundingClientRect();
    let opacity = 1;
    let skip = false;
    const clips = [];
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === "none" || s.visibility === "hidden" || s.visibility === "collapse") skip = true;
      if (n.hasAttribute("hidden") || n.getAttribute("aria-hidden") === "true" || n.inert) skip = true;
      opacity *= parseFloat(s.opacity);
      if (n !== el && (s.overflowX === "hidden" || s.overflowX === "clip" || s.overflowY === "hidden" || s.overflowY === "clip"))
        clips.push(n.getBoundingClientRect());
    }
    // sr-only: عنصر بحجم بكسل واحد مقصود
    if (rect.width < 2 || rect.height < 2) skip = true;
    return { rect, opacity, skip, clips };
  };

  const inter = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  };

  /** هل العنصر ظاهر الآن للمستخدم فعلًا؟ */
  NS.isShown = (el) => {
    const { rect, opacity, skip, clips } = NS.headingInfo(el);
    if (skip) return null; // مخفي عمدًا
    if (opacity < 0.85) return false;
    const own = rect.width * rect.height;
    const vp = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const visibleArea = inter(rect, vp);
    if (visibleArea < Math.min(own, innerWidth * innerHeight) * 0.3) return false; // خارج الشاشة
    for (const c of clips) {
      if (inter(rect, c) < own * 0.6) return false; // مقصوص بقناع (حالة مخفية للحركة)
    }
    return true;
  };

  NS.headings = () => [...document.querySelectorAll("h1, h2, h3")];

  NS.label = (el) => `${el.tagName.toLowerCase()}: ${(el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60)}`;

  /** يمرّر تدريجيًا ويسجّل كل عنوان شوهد ظاهرًا مرة واحدة على الأقل. */
  NS.scrollAndWatch = async (pause) => {
    const seen = new Set();
    const hs = NS.headings();
    const sample = () => hs.forEach((h, i) => NS.isShown(h) === true && seen.add(i));
    const vh = innerHeight;
    let y = 0;
    await new Promise((r) => setTimeout(r, 500));
    sample();
    while (y < document.documentElement.scrollHeight - vh + 1) {
      y += vh * 0.5;
      scrollTo(0, y);
      for (let t = 0; t < 3; t++) {
        await new Promise((r) => setTimeout(r, pause / 3));
        sample();
      }
    }
    await new Promise((r) => setTimeout(r, 400));
    sample();
    const never = [];
    hs.forEach((h, i) => {
      if (seen.has(i)) return;
      const shown = NS.isShown(h); // null = مخفي عمدًا
      if (NS.headingInfo(h).skip) return;
      if (shown !== true) never.push(NS.label(h));
    });
    scrollTo(0, 0);
    return { total: hs.length, never };
  };

  NS.overflow = (targetWidth) => {
    const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    if (docW <= targetWidth + 1) return { overflow: false, docW };
    const offenders = [];
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || (r.right <= targetWidth + 1 && r.left >= -1)) continue;
      let clipped = false;
      for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) clipped = true;
        if (s.position === "fixed") clipped = true;
      }
      if (getComputedStyle(el).position === "fixed") clipped = true;
      if (clipped) continue;
      offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      if (offenders.length >= 4) break;
    }
    return { overflow: true, docW, offenders };
  };

  NS.meta = () => {
    const q = (s) => document.querySelector(s);
    return {
      title: document.title,
      description: q('meta[name="description"]')?.content ?? "",
      canonical: q('link[rel="canonical"]')?.href ?? "",
      h1: document.querySelectorAll("h1").length,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      doubleBracket: /\[\[|\]\]/.test(document.body.innerText),
      metaBracket: /\[\[/.test(document.title + (q('meta[name="description"]')?.content ?? "")),
    };
  };

  NS.links = () => {
    const out = [];
    const missingAnchors = [];
    for (const a of document.querySelectorAll("a[href]")) {
      const raw = a.getAttribute("href");
      if (!raw || /^(mailto:|tel:|javascript:)/i.test(raw)) continue;
      if (raw.startsWith("#")) {
        if (raw.length > 1) {
          const id = decodeURIComponent(raw.slice(1));
          if (!document.getElementById(id) && !document.getElementsByName(id).length) missingAnchors.push(raw);
        }
        continue;
      }
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin) continue;
      out.push(u.pathname + u.search);
    }
    return { hrefs: [...new Set(out)], missingAnchors };
  };

  NS.brokenImages = () =>
    [...document.images]
      .filter((i) => i.complete && i.naturalWidth === 0 && getComputedStyle(i).display !== "none" && i.currentSrc)
      .map((i) => i.currentSrc.slice(0, 100));
};

// ---------------------------------------------------------------------------

const results = [];
const allLinks = new Map(); // href → أول صفحة وردت فيها

function record(pathname, problems, extra = {}) {
  results.push({ path: pathname, ok: problems.length === 0, problems, ...extra });
}

async function newPage(browser, baseUrl, opts) {
  const context = await browser.newContext({ baseURL: baseUrl, ...opts });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
  page.on("requestfailed", (r) => {
    const f = r.failure()?.errorText ?? "";
    if (/ERR_ABORTED/.test(f)) return; // إلغاء تنقّل/prefetch طبيعي
    errors.push(`requestfailed: ${r.url().slice(0, 120)} ${f}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().startsWith(baseUrl) && r.request().resourceType() !== "document")
      errors.push(`HTTP ${r.status()}: ${r.url().slice(0, 120)}`);
  });
  await page.addInitScript(INJECT);
  return { context, page, errors };
}

async function checkMobile(browser, baseUrl, pathname) {
  const problems = [];
  const { context, page, errors } = await newPage(browser, baseUrl, MOBILE);
  try {
    const res = await page.goto(pathname, { waitUntil: "load", timeout: 45_000 });
    const status = res?.status() ?? 0;
    if (status !== 200) problems.push(`الحالة ${status} بدل 200`);

    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const meta = await page.evaluate(() => window.__qa.meta());

    if (!meta.title.trim()) problems.push("لا title");
    if (!meta.description.trim()) problems.push("لا meta description");
    if (!meta.canonical) problems.push("لا canonical");
    else {
      const cp = decodeURI(new URL(meta.canonical).pathname).replace(/\/$/, "") || "/";
      const pp = decodeURI(pathname.split("?")[0]).replace(/\/$/, "") || "/";
      if (cp !== pp) problems.push(`canonical يشير إلى ${cp} بدل ${pp}`);
    }
    if (meta.h1 !== 1) problems.push(`عدد h1 = ${meta.h1} (المطلوب 1)`);
    if (meta.lang !== "ar" || meta.dir !== "rtl") problems.push(`lang/dir = ${meta.lang}/${meta.dir}`);
    if (meta.doubleBracket) problems.push("نص «[[» ظاهر في الصفحة");
    if (meta.metaBracket) problems.push("«[[» في title/description");

    const widthCheck = await page.evaluate(() => window.__qa.overflow(390));
    if (widthCheck.overflow) problems.push(`تمرير أفقي على 390px (scrollWidth=${widthCheck.docW}) ${widthCheck.offenders?.join(" | ") ?? ""}`);

    const watch = await page.evaluate((p) => window.__qa.scrollAndWatch(p), 500);
    if (watch.never.length) problems.push(`عناوين لم تظهر أبدًا: ${watch.never.map((s) => `«${s}»`).join("، ")}`);

    // بعد التمرير: الصور الكسولة حُمّلت
    await page.waitForTimeout(500);
    const broken = await page.evaluate(() => window.__qa.brokenImages());
    if (broken.length) problems.push(`صور مكسورة: ${broken.slice(0, 3).join(" | ")}`);

    const { hrefs, missingAnchors } = await page.evaluate(() => window.__qa.links());
    for (const h of hrefs) if (!allLinks.has(h)) allLinks.set(h, pathname);
    if (missingAnchors.length) problems.push(`روابط # بلا هدف: ${missingAnchors.join("، ")}`);

    for (const e of [...new Set(errors)].slice(0, 6)) problems.push(e);

    record(pathname, problems, { headings: watch.total });
  } catch (e) {
    record(pathname, [...problems, `استثناء: ${String(e.message).split("\n")[0]}`]);
  } finally {
    await context.close();
  }
}

async function checkWidths(browser, baseUrl, pathname, widths) {
  const problems = [];
  for (const width of widths) {
    const { context, page } = await newPage(browser, baseUrl, { ...MOBILE, viewport: { width, height: 800 } });
    try {
      await page.goto(pathname, { waitUntil: "load", timeout: 45_000 });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
          scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
      });
      const o = await page.evaluate((w) => window.__qa.overflow(w), width);
      if (o.overflow) problems.push(`تمرير أفقي على ${width}px (scrollWidth=${o.docW}) ${o.offenders?.join(" | ") ?? ""}`);
    } catch (e) {
      problems.push(`${width}px: ${String(e.message).split("\n")[0]}`);
    } finally {
      await context.close();
    }
  }
  record(`${pathname} @عرض`, problems);
}

async function checkMotionVariants(browser, baseUrl, pathname) {
  // ١) تقليل الحركة  ٢) بدون JavaScript — المحتوى لا يجوز أن يبقى مخفيًا
  const problems = [];

  {
    const { context, page } = await newPage(browser, baseUrl, { ...DESKTOP, reducedMotion: "reduce" });
    try {
      await page.goto(pathname, { waitUntil: "load", timeout: 45_000 });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      const watch = await page.evaluate((p) => window.__qa.scrollAndWatch(p), 300);
      if (watch.never.length) problems.push(`[تقليل الحركة] عناوين مخفية: ${watch.never.map((s) => `«${s}»`).join("، ")}`);
    } catch (e) {
      problems.push(`[تقليل الحركة] ${String(e.message).split("\n")[0]}`);
    } finally {
      await context.close();
    }
  }

  {
    const context = await browser.newContext({ baseURL: baseUrl, ...DESKTOP, javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      await page.goto(pathname, { waitUntil: "load", timeout: 45_000 });
      const hidden = await page.evaluate(() => {
        const out = [];
        for (const h of document.querySelectorAll("h1, h2, h3")) {
          let op = 1;
          let skip = false;
          for (let n = h; n && n !== document.documentElement; n = n.parentElement) {
            const s = getComputedStyle(n);
            if (s.display === "none" || n.getAttribute("aria-hidden") === "true") skip = true;
            op *= parseFloat(s.opacity);
          }
          if (!skip && op < 0.5) out.push((h.textContent || "").trim().slice(0, 50));
        }
        return { out, h1: document.querySelectorAll("h1").length };
      });
      if (hidden.out.length) problems.push(`[بدون JS] عناوين شفافة: ${hidden.out.map((s) => `«${s}»`).join("، ")}`);
      if (hidden.h1 < 1) problems.push("[بدون JS] لا h1 في HTML الأولي (محركات البحث)");
    } catch (e) {
      problems.push(`[بدون JS] ${String(e.message).split("\n")[0]}`);
    } finally {
      await context.close();
    }
  }

  record(`${pathname} @حركة`, problems);
}

async function checkLinks(baseUrl) {
  const problems = [];
  const entries = [...allLinks.entries()];
  const queue = entries.slice();
  const bad = [];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (queue.length) {
        const [href, from] = queue.pop();
        try {
          const res = await fetch(new URL(href, baseUrl), { redirect: "follow" });
          // الروابط إلى /admin تنتهي بصفحة الدخول 200 — مقبول
          if (res.status >= 400) bad.push(`${href} → ${res.status} (من ${from})`);
          await res.arrayBuffer();
        } catch (e) {
          bad.push(`${href} → خطأ شبكة ${e.message} (من ${from})`);
        }
      }
    }),
  );
  problems.push(...bad.sort());
  record(`الروابط الداخلية (${entries.length} رابطًا فريدًا)`, problems);
}

async function checkNotFound(baseUrl) {
  const res = await fetch(`${baseUrl}/this-page-does-not-exist-qa`);
  const html = await res.text();
  const problems = [];
  if (res.status !== 404) problems.push(`صفحة غير موجودة أعادت ${res.status} بدل 404`);
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push("صفحة 404 بلا title");
  for (const bad of ["/shop/no-such-category", "/shop/no-such/no-such-product", "/services/no-such", "/portfolio/no-such"]) {
    const r = await fetch(`${baseUrl}${bad}`);
    if (r.status !== 404) problems.push(`${bad} أعاد ${r.status} بدل 404`);
  }
  record("حالات 404", problems);
}

// ---------------------------------------------------------------------------

const server = await ensureServer({ build: Boolean(args.build) });
const browser = await launchBrowser();
const started = Date.now();

try {
  let paths = await sitemapPaths(server.baseUrl);
  // صفحات عامة غير مدرجة في sitemap عمدًا لكنها جزء من رحلة العميل
  for (const extra of ["/cart", "/checkout"]) if (!paths.includes(extra)) paths.push(extra);
  if (args.only) paths = String(args.only).split(",");

  console.log(`› ${paths.length} مسارًا من ${server.baseUrl}`);

  for (const p of paths) {
    await checkMobile(browser, server.baseUrl, p);
    const last = results[results.length - 1];
    console.log(`${last.ok ? "✓" : "✗"} ${p}${last.ok ? "" : `\n    ${last.problems.join("\n    ")}`}`);
  }

  if (!args.quick) {
    const sample = paths.filter((p) => !p.startsWith("/policies/"));
    // عرضا 320 و768 على كل صفحة رئيسية
    for (const p of sample.slice(0, 18)) await checkWidths(browser, server.baseUrl, p, [320, 768]);
    // تقليل الحركة وبدون JS على كل المسارات (أرخص من الفحص الأول لأنها سطح مكتب)
    for (const p of paths) await checkMotionVariants(browser, server.baseUrl, p);
  }

  await checkLinks(server.baseUrl);
  await checkNotFound(server.baseUrl);
} finally {
  await browser.close();
  await server.stop();
}

const failed = results.filter((r) => !r.ok);
console.log("\n────────────────────────────────────────");
for (const r of failed) console.log(`✗ ${r.path}\n    ${r.problems.join("\n    ")}`);
console.log(
  `\nالنتيجة: ${results.length - failed.length}/${results.length} فحصًا نجح — ${((Date.now() - started) / 1000).toFixed(0)}ث`,
);
if (args.json) writeFileSync(String(args.json), JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
