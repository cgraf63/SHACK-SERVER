import { Router } from "express";
import os from "os";
import fs from "fs";
import { statfs } from "fs/promises";
import { exec } from "child_process";
import { DatabaseSync } from "node:sqlite";
import { radioManager } from "../services/radio/radio-manager.js";
import { sourceStatus } from "../services/sources/source-manager-instance.js";

const router = Router();



function getCpuTemperature() {

    try {

        const temp =
            fs.readFileSync(
                "/sys/class/thermal/thermal_zone0/temp",
                "utf8"
            );


        return (
            Number(temp) / 1000
        ).toFixed(1);

    }

    catch {

        return null;

    }

}

function getDeviceModel() {

    try {

        return fs.readFileSync(
            "/sys/firmware/devicetree/base/model",
            "utf8"
        ).replace(/\0/g, "").trim();

    }

    catch {

        return null;

    }

}

async function getDiskUsage() {

    try {

        const info =
            await statfs("/");


        const total =
            info.blocks * info.bsize;


        const free =
            info.bfree * info.bsize;


        const used =
            total - free;


        return {

            total:
                Math.round(
                    total / 1024 / 1024 / 1024
                ) + " GB",


            used:
                Math.round(
                    used / 1024 / 1024 / 1024
                ) + " GB",


            percent:
                Math.round(
                    used / total * 100
                ) + "%"

        };

    }

    catch {

        return null;

    }

}

function getDockerStatus() {

    return new Promise((resolve) => {

        exec(
            "docker ps -q | wc -l",
            (error, stdout) => {

                if (error) {

                    resolve("Offline");
                    return;

                }


                resolve(
                    stdout.trim() + " running"
                );

            }
        );

    });

}


function getSQLiteStatus() {

    try {

        const db =
            new DatabaseSync(
                "./data/geo-cache.db"
            );


        db.prepare(
            "SELECT 1"
        ).get();


        db.close();


        return "OK";

    }

    catch {

        return "Offline";

    }

}

router.get("/", async (_req, res) => {


    res.json({

        hostname:
            os.hostname(),


        uptime:
            Math.floor(
                os.uptime()
            ),


        temperature:
            getCpuTemperature(),

	model:
    	    getDeviceModel(),


        ip:
            Object.values(
                os.networkInterfaces()
            )
            .flat()
            .find(
                iface =>
                    iface &&
                    iface.family === "IPv4" &&
                    !iface.internal
            )
            ?.address,


        memory: {

            total:
                os.totalmem(),


            free:
                os.freemem()

        },


       disk:
    await getDiskUsage(),


docker:
    await getDockerStatus(),


sqlite:
    getSQLiteStatus()



    });


});



/* =====================================================================
 * GET /api/system-status/health
 *
 * Station health for the dashboard card: everything that matters for
 * operating, not only the Pi itself.
 * state: "ok" | "warn" | "error" per check and overall.
 * ===================================================================== */

type HealthState = "ok" | "warn" | "error";

interface HealthCheck {
    name: string;
    state: HealthState;
    detail: string;
}

function memoryUsagePercent(): number | null {

    /*
     * MemAvailable counts reclaimable cache as free
     * (os.freemem() does not and looks far too high).
     */
    try {
        const info = fs.readFileSync("/proc/meminfo", "utf8");
        const total = Number(/MemTotal:\s+(\d+)/.exec(info)?.[1]);
        const available = Number(/MemAvailable:\s+(\d+)/.exec(info)?.[1]);
        if (total > 0 && available >= 0) {
            return Math.round((1 - available / total) * 100);
        }
    }
    catch {
        // not Linux
    }

    return null;

}

function getThrottled(): Promise<number | null> {

    /*
     * Raspberry Pi firmware flags (vcgencmd get_throttled):
     * bit 0 under-voltage now, bit 2 throttled now,
     * bit 16 under-voltage since boot, bit 18 throttled since boot.
     */
    return new Promise(resolve => {
        exec(
            "vcgencmd get_throttled",
            { timeout: 3000 },
            (error, stdout) => {
                const match = /throttled=(0x[0-9a-fA-F]+)/.exec(stdout || "");
                resolve(error || !match?.[1] ? null : parseInt(match[1], 16));
            }
        );
    });

}

router.get("/health", async (_req, res) => {

    const checks: HealthCheck[] = [];

    /* ---------- Transceiver (active, CAT) ---------- */
    try {
        const activeId = radioManager.getActiveRadioId();
        const config = radioManager.store.get(activeId);
        const service = radioManager.getActiveRadio();

        if (!config) {
            checks.push({ name: "Transceiver", state: "ok", detail: "No transceiver configured" });
        }
        else if (!service || !(service.isConnected?.() ?? true)) {
            checks.push({
                name: "Transceiver",
                state: "warn",
                detail: `${config.name} not connected (CAT)`
            });
        }
        else {
            checks.push({ name: "Transceiver", state: "ok", detail: `${config.name} connected` });
        }
    }
    catch {
        checks.push({ name: "Transceiver", state: "warn", detail: "Status unknown" });
    }

    /* ---------- DX sources ---------- */
    try {
        const sources = sourceStatus.getStatus();
        const active = sources.filter(s => s.status === "Active");
        const notActive = sources.filter(s => s.status !== "Active");
        const starting = process.uptime() < 180;

        if (!sources.length) {
            checks.push({
                name: "DX sources",
                state: starting ? "ok" : "warn",
                detail: starting ? "Starting" : "No DX source enabled"
            });
        }
        else if (!active.length) {
            checks.push({
                name: "DX sources",
                state: starting ? "ok" : "error",
                detail: starting ? "Starting, waiting for spots" : "No DX source delivers spots"
            });
        }
        else if (notActive.length && !starting) {
            checks.push({
                name: "DX sources",
                state: "warn",
                detail:
                    `${notActive.length} of ${sources.length} silent: ` +
                    notActive.map(s => s.name).join(", ")
            });
        }
        else {
            checks.push({
                name: "DX sources",
                state: "ok",
                detail: `${active.length} of ${sources.length} active`
            });
        }
    }
    catch {
        checks.push({ name: "DX sources", state: "warn", detail: "Status unknown" });
    }

    /* ---------- Database ---------- */
    const sqlite = getSQLiteStatus();
    checks.push({
        name: "Database",
        state: sqlite === "OK" ? "ok" : "error",
        detail: sqlite === "OK" ? "SQLite OK" : "SQLite offline"
    });

    /* ---------- Temperature ---------- */
    const temperature = Number(getCpuTemperature());
    if (Number.isFinite(temperature) && temperature > 0) {
        checks.push({
            name: "Temperature",
            state: temperature > 80 ? "error" : temperature > 70 ? "warn" : "ok",
            detail: `CPU ${temperature.toFixed(1)} °C`
        });
    }

    /* ---------- Power (Raspberry Pi) ---------- */
    const throttled = await getThrottled();
    if (throttled !== null) {
        if (throttled & 0x1) {
            checks.push({ name: "Power", state: "warn", detail: "Under-voltage now - check power supply" });
        }
        else if (throttled & 0x4) {
            checks.push({ name: "Power", state: "warn", detail: "CPU throttled now" });
        }
        else if (throttled & 0x10000) {
            checks.push({ name: "Power", state: "ok", detail: "OK (under-voltage occurred since boot)" });
        }
        else {
            checks.push({ name: "Power", state: "ok", detail: "Power supply OK" });
        }
    }

    /* ---------- Disk ---------- */
    const disk = await getDiskUsage();
    const diskPercent = Number(String((disk as any)?.percent ?? "").replace("%", ""));
    if (Number.isFinite(diskPercent) && diskPercent > 0) {
        checks.push({
            name: "Disk",
            state: diskPercent > 95 ? "error" : diskPercent > 85 ? "warn" : "ok",
            detail: `${diskPercent}% used`
        });
    }

    /* ---------- Memory ---------- */
    const memory = memoryUsagePercent();
    if (memory !== null) {
        checks.push({
            name: "Memory",
            state: memory > 95 ? "error" : memory > 90 ? "warn" : "ok",
            detail: `${memory}% used`
        });
    }

    /* ---------- Overall ---------- */
    const rank: Record<HealthState, number> = { ok: 0, warn: 1, error: 2 };
    const problems = checks
        .filter(c => c.state !== "ok")
        .sort((a, b) => rank[b.state] - rank[a.state]);

    const state: HealthState = problems[0]?.state ?? "ok";

    res.set("Cache-Control", "no-store");
    res.json({
        state,
        title:
            state === "error" ? "STATION ERROR"
                : state === "warn" ? "STATION WARNING"
                    : "STATION READY",
        summary:
            problems.length
                ? problems[0]!.detail +
                  (problems.length > 1 ? ` (+${problems.length - 1} more)` : "")
                : "All systems operational",
        checks
    });

});


export default router;
