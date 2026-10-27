import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

import { qsoService } from "../qso/qso-instance.js";
import { contestService } from "../contest/contest.service.js";
import { systemLog } from "../diagnostics/system-log.service.js";
import { qsoToAdif, type UploadQso } from "./adif-export.js";
import type { Uploader, UploadServiceId } from "./uploader.js";
import { qrzUploader } from "./qrz-uploader.js";
import { settingsService } from "../settings/settings.service.js";
import { findAccount, normalizeCallsign } from "../settings/upload-accounts.js";
import type { LogbookAccount } from "../../config/settings.config.js";


/*
 * Upload queue for the online logbooks.
 *
 * One row per QSO and service (table log_uploads in
 * data/shack-server.db). A background worker uploads pending rows
 * and retries failures with increasing delay. Edited QSOs are
 * uploaded again (replace).
 *
 * source "qso"     = normal log (table qso)
 * source "contest" = contest log (table contest_qsos)
 */

export type UploadSource = "qso" | "contest";

export type UploadStatus = "pending" | "done" | "failed";

interface UploadRow {
    id: number;
    source: UploadSource;
    record_id: number;
    service: UploadServiceId;
    status: UploadStatus;
    replace_flag: number;
    attempts: number;
    message: string | null;
    next_try_at: number;
    updated_at: string;
    uploaded_at: string | null;
}


const UPLOADERS: Uploader[] = [
    qrzUploader
];

const WORKER_INTERVAL_MS = 20_000;
const BATCH_SIZE = 10;
const MAX_AUTO_ATTEMPTS = 6;


const dataDirectory = path.resolve(process.cwd(), "data");
fs.mkdirSync(dataDirectory, { recursive: true });


/*
 * Contest name -> ADIF CONTEST_ID (same rule as the Cabrillo export).
 */
function contestIdFor(name: string, shortName: string): string {

    const text = `${name} ${shortName}`.toUpperCase();

    if (text.includes("CQ WW") && text.includes("SSB")) return "CQ-WW-SSB";
    if (text.includes("CQ WW") && text.includes("CW")) return "CQ-WW-CW";
    if (text.includes("CQ WW") && text.includes("RTTY")) return "CQ-WW-RTTY";

    return String(shortName || name || "")
        .toUpperCase()
        .replace(/[^A-Z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "");

}


class UploadQueueService {

    private db: DatabaseSync;
    private timer: NodeJS.Timeout | null = null;
    private running = false;

    constructor() {

        this.db = new DatabaseSync(path.join(dataDirectory, "shack-server.db"));

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS log_uploads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                record_id INTEGER NOT NULL,
                service TEXT NOT NULL,
                status TEXT NOT NULL,
                replace_flag INTEGER NOT NULL DEFAULT 0,
                attempts INTEGER NOT NULL DEFAULT 0,
                message TEXT,
                next_try_at INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                uploaded_at TEXT,
                UNIQUE (source, record_id, service)
            );
            CREATE INDEX IF NOT EXISTS log_uploads_status
                ON log_uploads (status, next_try_at);
        `);

    }


    /* ------------------------------------------------------------------
     * Uploaders
     * ------------------------------------------------------------------ */

    getUploaders(): Uploader[] {
        return UPLOADERS;
    }

    getUploader(id: string): Uploader | undefined {
        return UPLOADERS.find(uploader => uploader.id === id);
    }

    /* Services enabled for at least one account. */
    enabledServices(): UploadServiceId[] {

        const accounts = settingsService.get().uploads.accounts;

        return UPLOADERS
            .filter(uploader => accounts.some(account => uploader.isEnabledFor(account)))
            .map(uploader => uploader.id);

    }

    /*
     * Account for a QSO: station callsign of the QSO, or the own
     * callsign (Settings → Station) when the QSO has none.
     */
    accountFor(qso: UploadQso | null): LogbookAccount | null {

        const settings = settingsService.get();
        const callsign =
            normalizeCallsign(qso?.my_callsign) ||
            normalizeCallsign(settings.callsign);

        return findAccount(settings.uploads.accounts, callsign);

    }

    /* Services to use for a QSO (account found and service enabled there). */
    servicesFor(qso: UploadQso | null): UploadServiceId[] {

        const account = this.accountFor(qso);

        if (!account) {
            return [];
        }

        return UPLOADERS
            .filter(uploader => uploader.isEnabledFor(account))
            .map(uploader => uploader.id);

    }


    /* ------------------------------------------------------------------
     * Queue
     * ------------------------------------------------------------------ */

    /*
     * Queue a QSO for all enabled services (new QSO).
     * Returns the number of rows queued.
     */
    enqueue(
        source: UploadSource,
        recordId: number,
        services?: UploadServiceId[]
    ): number {

        services ??= this.servicesFor(this.loadQso(source, recordId));

        const now = new Date().toISOString();
        let count = 0;

        const insert = this.db.prepare(`
            INSERT INTO log_uploads
                (source, record_id, service, status, replace_flag,
                 attempts, message, next_try_at, updated_at)
            VALUES (?, ?, ?, 'pending', 0, 0, NULL, 0, ?)
            ON CONFLICT (source, record_id, service) DO NOTHING
        `);

        for (const service of services) {
            const result = insert.run(source, recordId, service, now);
            count += Number(result.changes);
        }

        if (count) {
            this.kick();
        }

        return count;

    }


    /*
     * QSO was edited: upload again where it was uploaded already
     * (replace) or reset a failure.
     */
    requeueAfterEdit(source: UploadSource, recordId: number): void {

        const now = new Date().toISOString();

        this.db.prepare(`
            UPDATE log_uploads
            SET status = 'pending',
                replace_flag = CASE WHEN status = 'done' THEN 1 ELSE replace_flag END,
                attempts = 0,
                next_try_at = 0,
                updated_at = ?
            WHERE source = ? AND record_id = ?
        `).run(now, source, recordId);

        this.kick();

    }


    /* QSO deleted locally (the online logbooks are not changed). */
    remove(source: UploadSource, recordId: number): void {

        this.db.prepare(`
            DELETE FROM log_uploads WHERE source = ? AND record_id = ?
        `).run(source, recordId);

    }


    /* "Retry failed" in Settings / QSO log. */
    retryFailed(service?: UploadServiceId): number {

        const now = new Date().toISOString();

        const result = service
            ? this.db.prepare(`
                UPDATE log_uploads
                SET status = 'pending', attempts = 0, next_try_at = 0, updated_at = ?
                WHERE status = 'failed' AND service = ?
            `).run(now, service)
            : this.db.prepare(`
                UPDATE log_uploads
                SET status = 'pending', attempts = 0, next_try_at = 0, updated_at = ?
                WHERE status = 'failed'
            `).run(now);

        this.kick();

        return Number(result.changes);

    }


    /* ------------------------------------------------------------------
     * Status for the UI
     * ------------------------------------------------------------------ */

    getStatusMap(source: UploadSource): Record<number, Record<string, {
        status: UploadStatus;
        message: string | null;
        uploaded_at: string | null;
    }>> {

        const rows = this.db.prepare(`
            SELECT record_id, service, status, message, uploaded_at
            FROM log_uploads
            WHERE source = ?
        `).all(source) as unknown as UploadRow[];

        const map: Record<number, Record<string, any>> = {};

        for (const row of rows) {
            (map[row.record_id] ??= {})[row.service] = {
                status: row.status,
                message: row.message,
                uploaded_at: row.uploaded_at
            };
        }

        return map;

    }

    getSummary(): Record<string, { label: string; enabled: boolean; pending: number; done: number; failed: number }> {

        const counts = this.db.prepare(`
            SELECT service, status, COUNT(*) AS n
            FROM log_uploads
            GROUP BY service, status
        `).all() as unknown as Array<{ service: string; status: UploadStatus; n: number }>;

        const summary: Record<string, any> = {};

        const enabled = this.enabledServices();

        for (const uploader of UPLOADERS) {
            summary[uploader.id] = {
                label: uploader.label,
                enabled: enabled.includes(uploader.id),
                pending: 0,
                done: 0,
                failed: 0
            };
        }

        for (const row of counts) {
            if (summary[row.service]) {
                summary[row.service][row.status] = Number(row.n);
            }
        }

        return summary;

    }


    /* ------------------------------------------------------------------
     * Worker
     * ------------------------------------------------------------------ */

    start(): void {

        if (this.timer) {
            return;
        }

        this.timer = setInterval(() => void this.processBatch(), WORKER_INTERVAL_MS);
        this.kick();

    }

    stop(): void {

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

    }

    /* Process soon (after a new QSO), without waiting for the interval. */
    private kick(): void {

        if (this.timer) {
            setTimeout(() => void this.processBatch(), 1500);
        }

    }

    private async processBatch(): Promise<void> {

        if (this.running) {
            return;
        }

        this.running = true;

        try {

            const enabled = this.enabledServices();

            if (!enabled.length) {
                return;
            }

            const placeholders = enabled.map(() => "?").join(",");

            const rows = this.db.prepare(`
                SELECT *
                FROM log_uploads
                WHERE status = 'pending'
                  AND next_try_at <= ?
                  AND service IN (${placeholders})
                ORDER BY id ASC
                LIMIT ${BATCH_SIZE}
            `).all(Date.now(), ...enabled) as unknown as UploadRow[];

            for (const row of rows) {
                await this.processRow(row);
            }

        }
        catch (error) {

            console.error("Upload queue:", error);

        }
        finally {

            this.running = false;

        }

    }

    private async processRow(row: UploadRow): Promise<void> {

        const uploader = this.getUploader(row.service);
        const now = new Date().toISOString();

        if (!uploader) {
            return;
        }

        const qso = this.loadQso(row.source, row.record_id);

        if (!qso) {
            this.remove(row.source, row.record_id);
            return;
        }

        const account = this.accountFor(qso);

        if (!account) {

            this.db.prepare(`
                UPDATE log_uploads
                SET status = 'failed', message = ?, updated_at = ?
                WHERE id = ?
            `).run(
                `No logbook account for ${qso.my_callsign || "this callsign"} (Settings → Log Uploads)`,
                now,
                row.id
            );

            return;

        }

        if (!uploader.isEnabledFor(account)) {

            /* Disabled for this account: keep waiting, look again later. */
            this.db.prepare(`
                UPDATE log_uploads
                SET next_try_at = ?, message = ?, updated_at = ?
                WHERE id = ?
            `).run(
                Date.now() + 10 * 60_000,
                `${uploader.label} not enabled for ${account.callsign}`,
                now,
                row.id
            );

            return;

        }

        const result = await uploader.upload(
            qso,
            qsoToAdif(qso),
            { replace: row.replace_flag === 1, account }
        );

        if (result.ok) {

            this.db.prepare(`
                UPDATE log_uploads
                SET status = 'done', replace_flag = 0, message = ?,
                    updated_at = ?, uploaded_at = ?
                WHERE id = ?
            `).run(result.message, now, now, row.id);

            systemLog.info(
                "UPLOAD", "UPLOAD",
                `${uploader.label}: ${qso.call} ${result.message}`
            );

            return;

        }

        const attempts = row.attempts + 1;
        const giveUp = result.permanent || attempts >= MAX_AUTO_ATTEMPTS;

        /* 1, 2, 4, 8, 16 ... minutes, max. 1 hour */
        const delay = Math.min(60, 2 ** (attempts - 1)) * 60_000;

        this.db.prepare(`
            UPDATE log_uploads
            SET status = ?, attempts = ?, message = ?,
                next_try_at = ?, updated_at = ?
            WHERE id = ?
        `).run(
            giveUp ? "failed" : "pending",
            attempts,
            result.message,
            Date.now() + delay,
            now,
            row.id
        );

        systemLog.warn(
            "UPLOAD", "UPLOAD",
            `${uploader.label}: ${qso.call} ${result.message}` +
            (giveUp ? " (failed)" : ` (retry ${attempts}/${MAX_AUTO_ATTEMPTS})`)
        );

    }


    /* ------------------------------------------------------------------
     * QSO loading
     * ------------------------------------------------------------------ */

    loadQso(source: UploadSource, recordId: number): UploadQso | null {

        if (source === "qso") {

            const qso = qsoService.getQso(recordId);

            if (!qso) {
                return null;
            }

            return {
                ...qso,
                contest_id: null
            };

        }

        const qso = contestService.getContestQsoById(recordId);

        if (!qso) {
            return null;
        }

        const session = contestService.getSessionById(qso.session_id);
        const definition = session
            ? contestService.getById(session.contest_definition_id)
            : null;

        return {
            call: qso.call,
            qso_date: qso.qso_date,
            time_on_utc: qso.time_on_utc,
            frequency: qso.frequency,
            band: qso.band,
            mode: qso.mode,
            rst_sent: qso.rst_sent,
            rst_rcvd: qso.rst_rcvd,
            my_callsign: qso.station_callsign || session?.station_callsign || null,
            operator_name: qso.operator,
            my_grid: session?.station_grid ?? null,
            contest_id: definition
                ? contestIdFor(definition.name, definition.short_name)
                : null,
            stx_string: qso.exchange_sent,
            srx_string: qso.exchange_received
        };

    }

    /* All QSOs of a contest session -> queue (button in QSO History). */
    enqueueContestSession(sessionId: number): {
        qsos: number;
        queued: number;
        services: UploadServiceId[];
        callsign: string;
        account: string | null;
    } {

        const session = contestService.getSessionById(sessionId);
        const qsos = contestService.getContestQsos(sessionId);
        let queued = 0;
        const used = new Set<UploadServiceId>();
        let account: string | null = null;

        for (const qso of qsos) {

            if (!qso.id) {
                continue;
            }

            const uploadQso = this.loadQso("contest", Number(qso.id));
            const services = this.servicesFor(uploadQso);

            account ??= this.accountFor(uploadQso)?.callsign ?? null;
            services.forEach(service => used.add(service));

            queued += this.enqueue("contest", Number(qso.id), services);

        }

        return {
            qsos: qsos.length,
            queued,
            services: [...used],
            callsign: normalizeCallsign(session?.station_callsign),
            account
        };

    }

}


export const uploadQueue = new UploadQueueService();
