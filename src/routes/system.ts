import express from "express";
import { execFile } from "node:child_process";

import { updateService } from "../services/system/update.service.js";

const router =
    express.Router();


/*
    System actions (Diagnostics → System actions)
      POST /api/system/restart   restart SHACK-SERVER (pm2 starts it again)
      POST /api/system/reboot    reboot the Raspberry Pi
      POST /api/system/shutdown  switch the Raspberry Pi off
    Reboot / shutdown use "sudo -n systemctl ..." - the default Pi user
    may do this without a password. If not, the error is shown.
*/

function systemctl(action: "reboot" | "poweroff"): Promise<string | null> {

    return new Promise(resolve => {
        execFile("sudo", ["-n", "systemctl", action], { timeout: 15_000 }, (error, _stdout, stderr) => {
            resolve(error ? String(stderr || error.message).trim() || "failed" : null);
        });
    });

}

router.post(
    "/restart",
    (_req, res) => {

        console.log("Restart requested from web interface");

        res.json({ success: true, message: "SHACK-SERVER restarts - page reloads in a few seconds" });

        // pm2 starts the process again
        setTimeout(() => process.exit(0), 500);

    }
);

for (const [route, action, text] of [
    ["/reboot", "reboot", "Raspberry Pi reboots - back in about 1-2 minutes"],
    ["/shutdown", "poweroff", "Raspberry Pi shuts down - wait for the green LED to stop before unplugging"]
] as const) {

    router.post(
        route,
        async (_req, res) => {

            console.log(`System ${action} requested from web interface`);

            // check sudo first (sudo -n -v: no password prompt)
            const allowed = await new Promise<boolean>(resolve =>
                execFile("sudo", ["-n", "true"], { timeout: 5000 }, error => resolve(!error)));

            if (!allowed) {
                return res.status(500).json({
                    error: `No permission for ${action}: the user running SHACK-SERVER needs passwordless sudo (sudo -n)`
                });
            }

            res.json({ success: true, message: text });

            setTimeout(async () => {
                const error = await systemctl(action);
                if (error) console.error(`System ${action} failed:`, error);
            }, 500);

        }
    );

}


/*
    Software update (Settings -> Software update)
      GET  /api/system/update        installed version, new commits, last run
      POST /api/system/update/check  git fetch
      POST /api/system/update/run    scripts/install.sh --update (restarts)
*/
router.get(
    "/update",
    async (_req, res) => {
        res.set("Cache-Control", "no-store");
        res.json(await updateService.getStatus());
    }
);

router.post(
    "/update/check",
    async (_req, res) => {
        await updateService.check();
        res.json(await updateService.getStatus());
    }
);

router.post(
    "/update/run",
    (_req, res) => {
        const result = updateService.run();
        res.status(result.ok ? 202 : 409).json(result);
    }
);


export default router;
