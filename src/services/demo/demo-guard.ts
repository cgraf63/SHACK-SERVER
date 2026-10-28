import type { Request, Response, NextFunction } from "express";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

import { DEMO_LIMITS, DEMO_MESSAGE } from "./demo-mode.js";


/*
 * Demo version: server-side limits (the UI only shows hints, the
 * server enforces). Mounted before all API routes when SHACK_DEMO=1.
 */


/* Blocked: method + path pattern (path without query). */
const BLOCKED: Array<[string, RegExp]> = [

    /* Restart, reboot, shutdown of the server / Pi */
    ["POST", /^\/api\/system\//],

    /* System check (runs a shell script) */
    ["GET", /^\/api\/diagnostics\/system$/],

    /* Transceiver configuration: the demo transceiver is fixed */
    ["POST", /^\/api\/radios(\/.*)?$/],
    ["PUT", /^\/api\/radios(\/.*)?$/],
    ["DELETE", /^\/api\/radios(\/.*)?$/],

    /* Everything that could key a transmitter or change the radio
       beyond frequency / mode / band */
    ["POST", /^\/api\/radio\/(ptt|cw-memory|tune-start|monitor|power|dsp-control|filter-gain|vfo-control|vfo|split|split-frequency|split-up5)$/],

    /* Online logbooks */
    ["POST", /^\/api\/uploads\//],

    /* ADIF import (log is limited) */
    ["POST", /^\/api\/qso\/import-adif$/]

];


/* Settings: only the station data may be changed in the demo. */
const SETTINGS_FIELDS = ["callsign", "operatorName", "locator", "club"];


let db: DatabaseSync | null = null;

function count(table: string): number {

    try {

        if (!db) {
            const file = path.resolve(process.cwd(), "data", "shack-server.db");
            if (!fs.existsSync(file)) {
                return 0;
            }
            db = new DatabaseSync(file);
        }

        const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number } | undefined;

        return Number(row?.n ?? 0);

    }
    catch {
        return 0;
    }

}


export function demoCounts(): { qsos: number; contestQsos: number } {

    return {
        qsos: count("qso"),
        contestQsos: count("contest_qsos")
    };

}


function refuse(res: Response, message = DEMO_MESSAGE): void {

    res.status(403).json({ error: message, demo: true });

}


export function demoGuard(req: Request, res: Response, next: NextFunction): void {

    const method = req.method.toUpperCase();
    const url = req.path;

    if (!url.startsWith("/api/")) {
        next();
        return;
    }

    if (BLOCKED.some(([m, pattern]) => m === method && pattern.test(url))) {
        refuse(res);
        return;
    }

    if (method === "POST" && url === "/api/qso") {

        if (count("qso") >= DEMO_LIMITS.qsos) {
            refuse(
                res,
                `The demo log is limited to ${DEMO_LIMITS.qsos} QSOs. ` +
                "Delete some QSOs or install the full version."
            );
            return;
        }

    }

    if (method === "POST" && /^\/api\/contests\/session\/\d+\/qso$/.test(url)) {

        if (count("contest_qsos") >= DEMO_LIMITS.contestQsos) {
            refuse(
                res,
                `The demo contest log is limited to ${DEMO_LIMITS.contestQsos} QSOs.`
            );
            return;
        }

    }

    if (method === "PUT" && url === "/api/settings") {

        const body = (req.body ?? {}) as Record<string, unknown>;
        const filtered: Record<string, unknown> = {};

        for (const field of SETTINGS_FIELDS) {
            if (typeof body[field] === "string") {
                filtered[field] = body[field];
            }
        }

        req.body = filtered;

    }

    next();

}
