/*
 * SHACK-SERVER screenshots for the README and the video.
 *
 * Runs against the demo container (GitHub Actions: Screenshots):
 *   node scripts/screenshots/capture.mjs http://localhost:3000 out/
 *
 * The demo hides some areas (settings of the full version) via
 * /api/demo - for the pictures the full UI is shown. Data is real:
 * demo log, live spots from the clusters, NG3K DXpeditions.
 * Needed alerts cannot be switched on in the demo: the card gets
 * example alerts made from real current spots.
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = process.argv[3] || "out";

fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();

page.on("pageerror", error => console.log("page error:", error.message));

/* full UI, no demo bar */
await context.route("**/api/demo", route => route.fulfill({ json: { demo: false } }));

/* example settings for the settings pictures (not saved) */
await context.route("**/api/settings", async route => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    const settings = await response.json();
    settings.callsign = settings.callsign || "HB9ISO";
    settings.notifications = {
        ...(settings.notifications || {}),
        enabled: true,
        cooldownMinutes: 15,
        quietHours: { enabled: true, from: "23:00", to: "06:30" },
        linkUrl: "https://shack.example.org",
        ntfy: { enabled: true, server: "https://ntfy.sh", topic: "hb9iso-shack-g59ktg", token: "", tokenSet: false, priority: "high" },
        nearbyRadiusKm: 1000,
        pskReporter: true,
        needed: {
            enabled: true, newCountry: true, newBandCountry: true, newBand: false, newMode: false,
            bands: ["160m", "80m", "40m", "30m", "20m", "17m", "15m", "12m", "10m"],
            modes: [], minScore: 0, onlyNearby: true, cooldownMinutes: 60
        }
    };
    await route.fulfill({ json: settings });
});

/* needed alerts from real spots that are not in the demo log */
let spots = [];
let worked = { dxcc: [] };

try {
    spots = await (await fetch(`${BASE}/api/spots`)).json();
    worked = await (await fetch(`${BASE}/api/qso/worked`)).json();
}
catch (error) {
    console.log("api:", error.message);
}

const workedDxcc = new Set(worked.dxcc || []);
const seen = new Set();
const alerts = spots
    .filter(s => s.dxccKey && !workedDxcc.has(s.dxccKey) && s.mode && s.mode !== "UNKNOWN" && Number(s.distance) > 2500)
    .filter(s => (seen.has(s.dxccKey) ? false : (seen.add(s.dxccKey), true)))
    .slice(0, 4)
    .map((s, i) => ({
        at: Date.now() - (i * 7 + 2) * 60_000,
        level: i === 2 ? "NEW BAND COUNTRY" : "NEW COUNTRY",
        callsign: s.call, entity: s.dxccName || s.country || "", frequency: s.frequency, mode: s.mode,
        band: s.band, score: 150 - i * 12, heard: "heard in EU (3 spotters)", nearby: i !== 1,
        sources: s.sources || [], result: "sent"
    }));

console.log(`spots: ${spots.length}, example alerts: ${alerts.length}, worked DXCC: ${(worked.dxcc || []).length}`);
console.log("sample spots:", JSON.stringify(spots.slice(0, 3).map(s => ({ call: s.call, dxccKey: s.dxccKey, mode: s.mode, distance: s.distance }))));

await context.route("**/api/needed/recent", route => route.fulfill({ json: alerts }));

async function shot(name, options = {}) {
    const file = path.join(OUT, `${name}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 92, ...options });
    console.log("saved", file);
}

async function scene(name, fn) {
    try {
        await fn();
    }
    catch (error) {
        console.log(`scene ${name} failed:`, error.message);
    }
}

/* 1 dashboard */
await scene("dashboard", async () => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await sleep(9000);
    await shot("01-dashboard");
});

/* 2 spot details (click on a DX callsign) */
await scene("spot-details", async () => {
    const links = await page.$$(".spot-call-link");
    const target = links[Math.min(2, links.length - 1)];
    if (!target) throw new Error("no spots");
    await target.click();
    await sleep(3500);
    await shot("02-spot-details");
    await page.keyboard.press("Escape");
    await sleep(800);
});

/* 3 dashboard spot table close-up (for the video) */
await scene("spots-closeup", async () => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await sleep(8000);
    const table = await page.$(".live-spots-container") ?? await page.$("#spotTableBody");
    if (table) await table.screenshot({ path: path.join(OUT, "03-live-spots.jpg"), type: "jpeg", quality: 92 });
});

/* 4 DXCC */
await scene("dxcc", async () => {
    await page.goto(`${BASE}/dxcc`, { waitUntil: "networkidle" });
    await sleep(2500);
    await page.selectOption("#dxcc-show", "worked").catch(() => undefined);
    await sleep(600);
    await shot("04-dxcc");
});

/* 5 DXpeditions */
await scene("dxpeditions", async () => {
    await page.goto(`${BASE}/dxpeditions`, { waitUntil: "networkidle" });
    await sleep(4000);
    await shot("05-dxpeditions");
});

/* 6 QSO log */
await scene("qso-log", async () => {
    await page.goto(`${BASE}/qso-log.html`, { waitUntil: "networkidle" });
    await sleep(3000);
    await shot("06-qso-log");
});

/* 7 contest console */
await scene("contest", async () => {
    await page.goto(`${BASE}/contest`, { waitUntil: "networkidle" });
    await sleep(3500);
    await shot("07-contest");
});

/* 8 contest manager */
await scene("contest-manager", async () => {
    await page.goto(`${BASE}/contest-manager`, { waitUntil: "networkidle" });
    await sleep(3000);
    await shot("08-contest-manager");
});

/* 9 diagnostics */
await scene("diagnostics", async () => {
    await page.goto(`${BASE}/diagnostics`, { waitUntil: "networkidle" });
    await sleep(4000);
    await shot("09-diagnostics");
});

/* 10 settings: needed alerts + watch list notifications */
await scene("settings", async () => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await sleep(4000);
    await page.evaluate(() => {
        const link = [...document.querySelectorAll("#sidebar a, #sidebar button")]
            .find(e => /^\s*Settings\s*$/.test(e.textContent || ""));
        link?.click();
    });
    await sleep(2000);
    const section = await page.$("#needed-enabled");
    if (!section) throw new Error("settings not open");
    await page.evaluate(() => document.getElementById("needed-enabled")?.closest("section")?.scrollIntoView({ block: "start" }));
    await sleep(800);
    await shot("10-settings-needed");
    await page.evaluate(() => document.getElementById("notify-enabled")?.closest("section")?.scrollIntoView({ block: "start" }));
    await sleep(800);
    await shot("11-settings-notifications");
});

await browser.close();

console.log("done");
