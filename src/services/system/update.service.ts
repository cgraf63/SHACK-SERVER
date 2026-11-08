import fs from "node:fs";
import path from "node:path";
import { execFile, spawn } from "node:child_process";


/*
 * Software update from the settings ("Update now").
 *
 *   status:  installed version (git commit), new commits on GitHub
 *   check:   git fetch
 *   run:     scripts/install.sh --update (git pull, npm install, build,
 *            pm2 restart) - detached from SHACK-SERVER, because the
 *            restart ends SHACK-SERVER and pm2 also ends its child
 *            processes. Output: data/update.log
 *
 * Without a git installation (e.g. the Docker demo) the update is not
 * available.
 */

const ROOT = process.cwd();
const LOG_FILE = path.join(ROOT, "data", "update.log");
const STATE_FILE = path.join(ROOT, "data", "update-state.json");
const SCRIPT = path.join(ROOT, "scripts", "install.sh");


export interface CommitInfo {
    hash: string;
    date: string;
    subject: string;
}

export interface UpdateStatus {
    available: boolean;
    reason: string;
    branch: string;
    current: CommitInfo | null;
    behind: number;
    commits: CommitInfo[];
    lastCheck: number | null;
    checkError: string;
    running: boolean;
    startedAt: number | null;
    lastRun: null | { at: number; ok: boolean; message: string };
    log: string;
}


function git(args: string[], timeout = 30_000): Promise<string> {

    return new Promise((resolve, reject) => {

        execFile("git", ["-C", ROOT, ...args], { timeout, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error((stderr || error.message).trim().split("\n").pop() || error.message));
                return;
            }
            resolve(stdout.trim());
        });

    });

}

function parseCommits(text: string): CommitInfo[] {

    return text
        .split("\n")
        .filter(Boolean)
        .map(line => {
            const [hash = "", date = "", ...subject] = line.split("\t");
            return { hash, date, subject: subject.join("\t") };
        });

}

function readState(): { startedAt: number | null; lastRun: UpdateStatus["lastRun"] } {

    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
    catch {
        return { startedAt: null, lastRun: null };
    }

}

function writeState(state: { startedAt: number | null; lastRun: UpdateStatus["lastRun"] }): void {

    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state));
    }
    catch {
        // state only for the display
    }

}

function logTail(lines = 25): string {

    try {
        const text = fs.readFileSync(LOG_FILE, "utf8");
        // without colour codes
        return text.replace(/\x1b\[[0-9;]*m/g, "").split("\n").slice(-lines).join("\n").trim();
    }
    catch {
        return "";
    }

}


class UpdateService {

    private behind = 0;
    private commits: CommitInfo[] = [];
    private lastCheck: number | null = null;
    private checkError = "";
    private checking: Promise<void> | null = null;

    private isGitInstall(): boolean {

        return fs.existsSync(path.join(ROOT, ".git")) && fs.existsSync(SCRIPT);

    }

    /*
     * Evaluate the last run after the restart: the installer ends with
     * "SHACK-SERVER is updated", or with "ERROR: ...".
     */
    private finishRun(): void {

        const state = readState();

        if (!state.startedAt) return;

        const tail = logTail(60);

        if (/SHACK-SERVER is updated/.test(tail)) {
            writeState({ startedAt: null, lastRun: { at: Date.now(), ok: true, message: "Update installed" } });
        }
        else {
            const error = /ERROR: (.+)/.exec(tail)?.[1];
            // still running (log grows) - or ended without the final line
            const age = Date.now() - state.startedAt;
            if (error || age > 30 * 60_000) {
                writeState({ startedAt: null, lastRun: { at: Date.now(), ok: false, message: error ?? "Update did not finish - see data/update.log" } });
            }
        }

    }

    async getStatus(): Promise<UpdateStatus> {

        this.finishRun();

        const state = readState();

        const base: UpdateStatus = {
            available: false,
            reason: "",
            branch: "",
            current: null,
            behind: this.behind,
            commits: this.commits,
            lastCheck: this.lastCheck,
            checkError: this.checkError,
            running: Boolean(state.startedAt),
            startedAt: state.startedAt,
            lastRun: state.lastRun,
            log: state.startedAt || state.lastRun ? logTail() : ""
        };

        if (!this.isGitInstall()) {
            return { ...base, reason: "This installation was not made with git (e.g. Docker) - the update button is not available." };
        }

        try {

            const [branch, head] = await Promise.all([
                git(["rev-parse", "--abbrev-ref", "HEAD"]),
                git(["log", "-1", "--format=%h%x09%cI%x09%s"])
            ]);

            return {
                ...base,
                available: true,
                branch,
                current: parseCommits(head)[0] ?? null
            };

        }
        catch (error) {

            return { ...base, reason: `git: ${error instanceof Error ? error.message : String(error)}` };

        }

    }

    /* git fetch, then: which commits are new on GitHub */
    check(): Promise<void> {

        if (this.checking) return this.checking;

        this.checking = (async () => {

            try {

                const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);

                await git(["fetch", "--quiet", "origin", branch], 60_000);

                const upstream = `origin/${branch}`;

                this.behind = Number(await git(["rev-list", "--count", `HEAD..${upstream}`])) || 0;
                this.commits = parseCommits(await git(["log", "--format=%h%x09%cI%x09%s", "-n", "30", `HEAD..${upstream}`]));
                this.checkError = "";

            }
            catch (error) {

                this.checkError = error instanceof Error ? error.message : String(error);

            }
            finally {

                this.lastCheck = Date.now();
                this.checking = null;

            }

        })();

        return this.checking;

    }

    run(): { ok: boolean; message: string } {

        if (!this.isGitInstall()) {
            return { ok: false, message: "Update not available for this installation." };
        }

        const state = readState();

        if (state.startedAt && Date.now() - state.startedAt < 30 * 60_000) {
            return { ok: false, message: "An update is already running." };
        }

        fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
        fs.writeFileSync(LOG_FILE, `Update started ${new Date().toISOString()}\n`);

        writeState({ startedAt: Date.now(), lastRun: state.lastRun });

        /*
         * Double fork: the outer shell starts the installer in its own
         * session and ends at once - the installer is then no child of
         * SHACK-SERVER, and the pm2 restart does not end it.
         */
        const command =
            `nohup setsid bash ${JSON.stringify(SCRIPT)} --update --dir ${JSON.stringify(ROOT)} ` +
            `>> ${JSON.stringify(LOG_FILE)} 2>&1 < /dev/null &`;

        const child = spawn("bash", ["-c", command], {
            cwd: ROOT,
            detached: true,
            stdio: "ignore",
            env: { ...process.env, TERM: "dumb" }
        });

        child.unref();

        console.log("Software update started (scripts/install.sh --update), log: data/update.log");

        return { ok: true, message: "Update started" };

    }

}


export const updateService = new UpdateService();
