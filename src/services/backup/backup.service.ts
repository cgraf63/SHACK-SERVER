import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

import type { BackupSettings } from "../../config/settings.config.js";
import { settingsService } from "../settings/settings.service.js";


/*
 * Backup of the log and the settings.
 *
 * Archive shack-server-backup-YYYY-MM-DD_HHMM.tar.gz with
 *   shack-server.db   consistent copy (VACUUM INTO, also while running)
 *   settings.json     settings incl. logbook credentials
 *   radios.json       transceivers
 *   .env              if present
 *
 * Targets (both via rclone):
 *   rclone  any rclone remote, e.g. "dropbox:SHACK-SERVER"
 *   smb     NAS share, rclone SMB backend configured by environment
 *           variables (the password never appears on a command line)
 *
 * The last 3 archives also stay in data/backups on the Pi.
 */

const ROOT = process.cwd();
const DATA_DIR = path.resolve(ROOT, "data");
const LOCAL_DIR = path.join(DATA_DIR, "backups");
const STATUS_FILE = path.join(DATA_DIR, "backup-status.json");

const PREFIX = "shack-server-backup-";
const LOCAL_KEEP = 3;
const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;

const RCLONE_FLAGS = ["--contimeout", "20s", "--timeout", "120s", "--retries", "2", "--low-level-retries", "3"];


export interface TargetResult {
    name: string;
    ok: boolean;
    message: string;
}

export interface BackupStatus {
    running: boolean;
    lastRun: null | {
        at: number;
        ok: boolean;
        file: string;
        size: number;
        message: string;
        targets: TargetResult[];
    };
    lastSuccess: number | null;
}


type Target = {
    name: string;
    dest: string;
    env: NodeJS.ProcessEnv;
};


function run(
    command: string,
    args: string[],
    options: { env?: NodeJS.ProcessEnv; input?: string; timeout?: number } = {}
): Promise<{ code: number; stdout: string; stderr: string }> {

    return new Promise((resolve, reject) => {

        const child = spawn(command, args, {
            env: { ...process.env, ...(options.env ?? {}) },
            stdio: ["pipe", "pipe", "pipe"]
        });

        let stdout = "";
        let stderr = "";

        const timer = setTimeout(() => {
            child.kill("SIGKILL");
            stderr += "\ntimeout";
        }, options.timeout ?? COMMAND_TIMEOUT_MS);

        child.stdout.on("data", chunk => { stdout += chunk; });
        child.stderr.on("data", chunk => { stderr += chunk; });

        child.on("error", error => {
            clearTimeout(timer);
            reject(error);
        });

        child.on("close", code => {
            clearTimeout(timer);
            resolve({ code: code ?? -1, stdout, stderr });
        });

        child.stdin.end(options.input ?? "");

    });

}


/* Short, readable rclone error */
function rcloneError(stderr: string): string {

    const lines = stderr
        .split("\n")
        .map(line => line.replace(/^\d{4}\/\d\d\/\d\d \d\d:\d\d:\d\d\s+/, "").trim())
        .filter(line => line && !/^NOTICE|^INFO|^Transferred|^Elapsed|^Checks|^Errors:/.test(line));

    const error = lines.reverse().find(line => /ERROR|Failed|error|didn't find section|not found|denied|refused|timeout/i.test(line)) ?? lines[0] ?? "unknown error";

    return error.replace(/^(ERROR|CRITICAL)\s*:\s*/, "").slice(0, 300);

}


async function rclone(args: string[], env: NodeJS.ProcessEnv = {}, input?: string, timeout?: number) {

    try {
        return await run("rclone", [...args, ...RCLONE_FLAGS], { env, ...(input !== undefined ? { input } : {}), ...(timeout ? { timeout } : {}) });
    }
    catch (error: any) {
        if (error?.code === "ENOENT") {
            throw new Error("rclone is not installed (sudo apt install rclone)");
        }
        throw error;
    }

}


function joinRemote(base: string, name: string): string {

    return base.endsWith(":") || base.endsWith("/") ? base + name : `${base}/${name}`;

}


async function obscure(password: string): Promise<string> {

    const result = await run("rclone", ["obscure", "-"], { input: password, timeout: 15_000 })
        .catch((error: any) => {
            if (error?.code === "ENOENT") {
                throw new Error("rclone is not installed (sudo apt install rclone)");
            }
            throw error;
        });

    if (result.code !== 0 || !result.stdout.trim()) {
        throw new Error(`rclone obscure failed: ${rcloneError(result.stderr)}`);
    }

    return result.stdout.trim();

}


async function targetsFor(settings: BackupSettings, only?: "rclone" | "smb"): Promise<Target[]> {

    const targets: Target[] = [];

    if ((only ? only === "rclone" : settings.rclone.enabled)) {

        if (!settings.rclone.remote) {
            throw new Error("Dropbox / rclone: no rclone remote set (e.g. dropbox:SHACK-SERVER)");
        }

        targets.push({ name: "Dropbox / rclone", dest: settings.rclone.remote, env: {} });

    }

    if ((only ? only === "smb" : settings.smb.enabled)) {

        const smb = settings.smb;

        if (!smb.host || !smb.share) {
            throw new Error("NAS: host and share are required");
        }

        const env: NodeJS.ProcessEnv = {
            RCLONE_SMB_HOST: smb.host,
            RCLONE_SMB_USER: smb.user || "guest",
            RCLONE_SMB_DOMAIN: smb.domain || "WORKGROUP"
        };

        if (smb.password) {
            env.RCLONE_SMB_PASS = await obscure(smb.password);
        }

        targets.push({
            name: "NAS (SMB)",
            dest: `:smb:${smb.share}${smb.path ? "/" + smb.path : ""}`,
            env
        });

    }

    return targets;

}


function timestamp(date = new Date()): string {

    const p = (n: number) => String(n).padStart(2, "0");

    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}`;

}


class BackupService {

    private status: BackupStatus = { running: false, lastRun: null, lastSuccess: null };
    private timer: NodeJS.Timeout | null = null;
    private running: Promise<BackupStatus> | null = null;

    start(): void {

        try {
            const saved = JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
            this.status = { ...this.status, ...saved, running: false };
        }
        catch {
            // first start
        }

        if (this.timer) clearInterval(this.timer);

        this.timer = setInterval(() => this.checkSchedule(), 60_000);
        this.timer.unref?.();

    }

    getStatus(): BackupStatus {

        return { ...this.status, running: Boolean(this.running) };

    }

    /* Due: enabled, time of day reached and no backup started yet today */
    private checkSchedule(): void {

        const settings = settingsService.get().backup;

        if (!settings.enabled || this.running) return;

        const now = new Date();
        const [hh, mm] = settings.time.split(":").map(Number);
        const due = new Date(now);

        due.setHours(hh ?? 3, mm ?? 15, 0, 0);

        if (now < due) return;

        const last = this.status.lastRun?.at ?? 0;

        if (last >= due.getTime()) return;

        // more than 6 hours late (Pi was off): wait for tomorrow - unless it never ran
        if (now.getTime() - due.getTime() > 6 * 3600_000 && last > now.getTime() - 36 * 3600_000) return;

        void this.runBackup();

    }

    runBackup(): Promise<BackupStatus> {

        if (this.running) return this.running;

        this.running = this.doBackup().finally(() => {
            this.running = null;
        });

        return this.running;

    }

    private async createArchive(): Promise<{ file: string; name: string; size: number }> {

        fs.mkdirSync(LOCAL_DIR, { recursive: true });

        const name = `${PREFIX}${timestamp()}.tar.gz`;
        const work = fs.mkdtempSync(path.join(DATA_DIR, ".backup-work-"));

        try {

            const dbFile = path.join(DATA_DIR, "shack-server.db");
            const files: string[] = [];

            if (fs.existsSync(dbFile)) {
                const db = new DatabaseSync(dbFile);
                try {
                    const target = path.join(work, "shack-server.db").replace(/'/g, "''");
                    db.exec(`VACUUM INTO '${target}'`);
                }
                finally {
                    db.close();
                }
                files.push("shack-server.db");
            }

            for (const [source, target] of [
                [path.join(DATA_DIR, "settings.json"), "settings.json"],
                [path.join(DATA_DIR, "radios.json"), "radios.json"],
                [path.join(ROOT, ".env"), "env"]
            ] as const) {
                if (fs.existsSync(source)) {
                    fs.copyFileSync(source, path.join(work, target));
                    files.push(target);
                }
            }

            fs.writeFileSync(path.join(work, "RESTORE.txt"), [
                "SHACK-SERVER backup " + new Date().toISOString(),
                "",
                "Restore:",
                "  pm2 stop shack-server",
                "  cp shack-server.db settings.json radios.json ~/SHACK-SERVER/data/",
                "  rm -f ~/SHACK-SERVER/data/shack-server.db-wal ~/SHACK-SERVER/data/shack-server.db-shm",
                "  cp env ~/SHACK-SERVER/.env      (if contained)",
                "  pm2 start shack-server",
                ""
            ].join("\n"));
            files.push("RESTORE.txt");

            const file = path.join(LOCAL_DIR, name);
            const result = await run("tar", ["-czf", file, "-C", work, ...files], { timeout: 5 * 60_000 });

            if (result.code !== 0) {
                throw new Error(`tar failed: ${result.stderr.trim().slice(0, 200)}`);
            }

            fs.chmodSync(file, 0o600);

            return { file, name, size: fs.statSync(file).size };

        }
        finally {
            fs.rmSync(work, { recursive: true, force: true });
        }

    }

    /* Keep the newest `keep` archives (names sort by date) */
    private async prune(target: Target, keep: number): Promise<void> {

        const list = await rclone(["lsf", "--files-only", "--include", `${PREFIX}*.tar.gz`, target.dest], target.env, undefined, 120_000);

        if (list.code !== 0) return;

        const names = list.stdout.split("\n").map(n => n.trim()).filter(n => n.startsWith(PREFIX)).sort();

        for (const old of names.slice(0, Math.max(0, names.length - keep))) {
            await rclone(["deletefile", joinRemote(target.dest, old)], target.env, undefined, 120_000);
        }

    }

    private pruneLocal(): void {

        const names = fs.readdirSync(LOCAL_DIR).filter(n => n.startsWith(PREFIX) && n.endsWith(".tar.gz")).sort();

        for (const old of names.slice(0, Math.max(0, names.length - LOCAL_KEEP))) {
            fs.rmSync(path.join(LOCAL_DIR, old), { force: true });
        }

    }

    private async doBackup(): Promise<BackupStatus> {

        const settings = settingsService.get().backup;
        const at = Date.now();
        const results: TargetResult[] = [];

        let file = "";
        let size = 0;
        let message = "";

        try {

            const archive = await this.createArchive();

            file = archive.name;
            size = archive.size;

            this.pruneLocal();

            let targets: Target[] = [];

            try {
                targets = await targetsFor(settings);
            }
            catch (error) {
                results.push({ name: "Targets", ok: false, message: error instanceof Error ? error.message : String(error) });
            }

            for (const target of targets) {

                try {

                    const copy = await rclone(["copyto", archive.file, joinRemote(target.dest, archive.name)], target.env);

                    if (copy.code !== 0) {
                        throw new Error(rcloneError(copy.stderr));
                    }

                    await this.prune(target, settings.keep);

                    results.push({ name: target.name, ok: true, message: "saved" });

                }
                catch (error) {

                    results.push({ name: target.name, ok: false, message: error instanceof Error ? error.message : String(error) });

                }

            }

            if (!targets.length && !results.length) {
                message = "Saved on the Pi only (no target switched on)";
            }

        }
        catch (error) {

            message = error instanceof Error ? error.message : String(error);
            results.push({ name: "Archive", ok: false, message });

        }

        const ok = results.every(result => result.ok) && Boolean(file);

        this.status = {
            running: false,
            lastRun: {
                at,
                ok,
                file,
                size,
                message: message || (ok ? "Backup saved" : "Backup failed"),
                targets: results
            },
            lastSuccess: ok ? at : this.status.lastSuccess
        };

        try {
            fs.writeFileSync(STATUS_FILE, JSON.stringify(this.status, null, 1));
        }
        catch {
            // status is shown from memory anyway
        }

        const summary = results.map(r => `${r.name}: ${r.ok ? "ok" : r.message}`).join(", ");
        console.log(`Backup ${ok ? "ok" : "FAILED"}: ${file || "-"}${summary ? " - " + summary : ""}`);

        return this.getStatus();

    }

    /* Test a target with the values from the form (not saved yet) */
    async test(raw: BackupSettings, which: "rclone" | "smb"): Promise<{ ok: boolean; message: string }> {

        try {

            const [target] = await targetsFor(raw, which);

            if (!target) {
                return { ok: false, message: "No target" };
            }

            const mkdir = await rclone(["mkdir", target.dest], target.env, undefined, 90_000);

            if (mkdir.code !== 0) {
                return { ok: false, message: rcloneError(mkdir.stderr) };
            }

            const list = await rclone(["lsf", "--files-only", "--include", `${PREFIX}*.tar.gz`, target.dest], target.env, undefined, 90_000);

            if (list.code !== 0) {
                return { ok: false, message: rcloneError(list.stderr) };
            }

            const count = list.stdout.split("\n").filter(n => n.trim().startsWith(PREFIX)).length;

            return { ok: true, message: `Connected - ${count} backup${count === 1 ? "" : "s"} in the folder` };

        }
        catch (error) {

            return { ok: false, message: error instanceof Error ? error.message : String(error) };

        }

    }

}


export const backupService = new BackupService();
