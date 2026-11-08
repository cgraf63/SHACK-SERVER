import fs from "node:fs";
import path from "node:path";

import {
    ShackSettings,
    shackSettings
} from "../../config/settings.config.js";
import { sdrBinaryExists } from "../sdr/sdr-binary.js";
import {
    loadUploadSettings,
    mergeUploadSettings
} from "./upload-accounts.js";


/*
 * Module defaults for settings files without "modules":
 * RBN on, SDR on only if the native SDR program is installed
 * (keeps existing installations with an RSP1B unchanged).
 */
function normalizeWsjtx(raw: any): ShackSettings["wsjtx"] {

    const port = Number(raw?.port);
    const group = String(raw?.multicastGroup ?? "").trim();

    return {
        enabled: raw?.enabled === true,
        port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 2237,
        /* only real multicast addresses (224.0.0.0 - 239.255.255.255) */
        multicastGroup:
            /^(22[4-9]|23\d)\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(group) ? group : ""
    };

}

export function normalizeRotator(raw: any): ShackSettings["rotator"] {

    const model = Number(raw?.model);
    const baud = Number(raw?.baudRate);
    const port = Number(raw?.port);
    const device = String(raw?.device ?? "").trim();
    const host = String(raw?.host ?? "").trim();

    return {
        enabled: raw?.enabled === true,
        connection: raw?.connection === "network" ? "network" : "serial",
        model: Number.isInteger(model) && model > 0 ? model : 0,
        device: device.startsWith("/dev/") ? device : "",
        baudRate: Number.isInteger(baud) && baud >= 0 && baud <= 1_000_000 ? baud : 0,
        host: /^[A-Za-z0-9.\-:]+$/.test(host) ? host : "127.0.0.1",
        port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 4533
    };

}

function defaultModules(): ShackSettings["modules"] {

    return {
        rbn: shackSettings.modules.rbn,
        sdr: sdrBinaryExists()
    };

}


const DATA_DIR =
    path.resolve("data");


const SETTINGS_FILE =
    path.join(
        DATA_DIR,
        "settings.json"
    );

import { normalizeBackup } from "../backup/backup-settings.js";
import { normalizeNotifications } from "../notifications/notification-settings.js";


export class SettingsService {


    private settings:
        ShackSettings;


    /* Several services listen (DX sources, WSJT-X, ...). */
    private onUpdateCallbacks:
        Array<() => void> = [];


    constructor() {

        this.settings =
            this.load();

    }


    get(): ShackSettings {

        return {
            ...this.settings,
            sources: {
                ...this.settings.sources
            },
            modules: {
                ...this.settings.modules
            },
            uploads:
                mergeUploadSettings(
                    this.settings.uploads,
                    undefined
                ),
            wsjtx: {
                ...this.settings.wsjtx
            },
            rotator: {
                ...this.settings.rotator
            },
            backup:
                normalizeBackup(this.settings.backup, this.settings.backup),
            notifications:
                normalizeNotifications(this.settings.notifications, this.settings.notifications),

            dxspiders:
                this.settings.dxspiders.map(
                    spider => ({
                        ...spider
                    })
                )

        };

    }


    update(
        settings: ShackSettings
    ): ShackSettings {


        /*
         * Merge with the current settings: fields the client
         * does not send (e.g. audio, modules) are kept.
         */
        this.settings = {
            ...this.settings,
            ...settings,
            sources: {
                ...this.settings.sources,
                ...(settings.sources ?? {})
            },
            modules: {
                ...this.settings.modules,
                ...(settings.modules ?? {})
            },
            uploads:
                mergeUploadSettings(
                    this.settings.uploads,
                    (settings as any).uploads
                ),
            wsjtx:
                normalizeWsjtx({
                    ...this.settings.wsjtx,
                    ...((settings as any).wsjtx ?? {})
                }),
            rotator:
                normalizeRotator({
                    ...this.settings.rotator,
                    ...((settings as any).rotator ?? {})
                }),
            backup:
                (settings as any).backup
                    ? normalizeBackup((settings as any).backup, this.settings.backup)
                    : this.settings.backup,
            notifications:
                (settings as any).notifications
                    ? normalizeNotifications((settings as any).notifications, this.settings.notifications)
                    : this.settings.notifications,

            dxspiders:
                (Array.isArray(settings.dxspiders)
                    ? settings.dxspiders
                    : this.settings.dxspiders
                ).map(
                    spider => ({
                        ...spider
                    })
            )

        };


        this.save();


        for (const callback of this.onUpdateCallbacks) {

            try {
                callback();
            }
            catch (error) {
                console.error("Settings listener failed:", error);
            }

        }


        return this.get();

    }


    onUpdate(
        callback: () => void
    ): void {

        this.onUpdateCallbacks.push(
            callback
        );

    }


    private load():
        ShackSettings {


        try {

            if (
                fs.existsSync(
                    SETTINGS_FILE
                )
            ) {


                const data =
                    fs.readFileSync(
                        SETTINGS_FILE,
                        "utf-8"
                    );


                const parsed =
                    JSON.parse(
                        data
                    );


                return {

                    ...shackSettings,

                    ...parsed,


                    sources: {
                        ...shackSettings.sources,
                        ...(parsed.sources ?? {})
                    },
                    modules: {
                        ...defaultModules(),
                        ...(parsed.modules ?? {})
                    },
                    uploads:
                        loadUploadSettings(
                            parsed,
                            parsed.callsign ?? ""
                        ),
                    wsjtx:
                        normalizeWsjtx({
                            ...shackSettings.wsjtx,
                            ...(parsed.wsjtx ?? {})
                        }),
                    rotator:
                        normalizeRotator({
                            ...shackSettings.rotator,
                            ...(parsed.rotator ?? {})
                        }),
                    backup:
                        normalizeBackup(parsed.backup ?? shackSettings.backup),
                    notifications:
                        normalizeNotifications(parsed.notifications ?? shackSettings.notifications),


                    dxspiders:

                        Array.isArray(
                            parsed.dxspiders
                        )

                            ? parsed.dxspiders

                            : shackSettings.dxspiders

                };

            }

        }
        catch (error) {


            console.error(
                "Failed to load settings:",
                error
            );

        }


        return {
            ...shackSettings,
            sources: {
                ...shackSettings.sources
            },
            modules:
                defaultModules(),
            uploads: {
                accounts: [],
                clublogApiKey: ""
            },
            wsjtx: {
                ...shackSettings.wsjtx
            },
            rotator: {
                ...shackSettings.rotator
            },
            backup:
                normalizeBackup(shackSettings.backup),
            notifications:
                normalizeNotifications(shackSettings.notifications),
            dxspiders:
                shackSettings.dxspiders.map(
                    spider => ({
                        ...spider
                    })
                )

        };

    }


    private save(): void {


        try {


            fs.mkdirSync(
                DATA_DIR,
                {
                    recursive: true
                }
            );


            fs.writeFileSync(

                SETTINGS_FILE,

                JSON.stringify(
                    this.settings,
                    null,
                    4
                ),

                "utf-8"

            );

        }
        catch (error) {


            console.error(
                "Failed to save settings:",
                error
            );

        }

    }

}


export const settingsService =
    new SettingsService();
