import { shackSettings, type BackupSettings } from "../../config/settings.config.js";


function text(value: unknown, max = 200): string {

    return typeof value === "string" ? value.trim().slice(0, max) : "";

}


/*
 * Settings from the file or from the browser. The SMB password:
 * empty = keep the saved one, clearSmbPassword = true removes it.
 */
export function normalizeBackup(raw: any, previous?: BackupSettings): BackupSettings {

    const base = previous ?? shackSettings.backup;

    const time = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(text(raw?.time));
    const keep = Math.round(Number(raw?.keep));

    const remote = text(raw?.rclone?.remote ?? base.rclone.remote);

    const password =
        raw?.smb?.clearPassword === true
            ? ""
            : text(raw?.smb?.password, 256) || base.smb.password || "";

    return {
        enabled: raw?.enabled === true,
        time: time ? `${(time[1] ?? "").padStart(2, "0")}:${time[2]}` : base.time,
        keep: Number.isFinite(keep) && keep >= 1 && keep <= 365 ? keep : base.keep,
        rclone: {
            enabled: raw?.rclone?.enabled === true,
            // "name:" or "name:folder", no options or flags
            remote: /^[A-Za-z0-9_. -]+:[^\0\n]*$/.test(remote) && !remote.startsWith("-") ? remote : ""
        },
        smb: {
            enabled: raw?.smb?.enabled === true,
            host: /^[A-Za-z0-9.-]+$/.test(text(raw?.smb?.host)) ? text(raw?.smb?.host) : "",
            share: text(raw?.smb?.share).replace(/^[\\/]+|[\\/]+$/g, "").replace(/[\\/:]/g, ""),
            path: text(raw?.smb?.path)
                .replace(/\\/g, "/")
                .split("/")
                .filter(part => part && part !== "." && part !== "..")
                .join("/"),
            user: text(raw?.smb?.user),
            password,
            domain: text(raw?.smb?.domain)
        }
    };

}


/* For the browser: no password, only "is set" */
export function publicBackup(backup: BackupSettings): unknown {

    return {
        ...backup,
        smb: {
            ...backup.smb,
            password: "",
            passwordSet: Boolean(backup.smb.password)
        }
    };

}
