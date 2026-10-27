import fs from "node:fs";
import path from "node:path";

import {
    ShackSettings,
    shackSettings
} from "../../config/settings.config.js";
import { sdrBinaryExists } from "../sdr/sdr-binary.js";


/*
 * Module defaults for settings files without "modules":
 * RBN on, SDR on only if the native SDR program is installed
 * (keeps existing installations with an RSP1B unchanged).
 */
/*
 * Upload defaults. QRZ was always uploaded when QRZ_API_KEY was set
 * in .env - keep that behaviour for existing installations.
 */
function defaultUploads(): ShackSettings["uploads"] {

    return {
        qrz: {
            enabled: Boolean(process.env.QRZ_API_KEY),
            apiKey: ""
        }
    };

}

function mergeUploads(
    base: ShackSettings["uploads"],
    patch: any
): ShackSettings["uploads"] {

    const qrzPatch = patch?.qrz ?? {};

    return {
        qrz: {
            enabled:
                typeof qrzPatch.enabled === "boolean"
                    ? qrzPatch.enabled
                    : base.qrz.enabled,
            /*
             * The browser never receives the key; an empty
             * field means "unchanged". clearApiKey removes it.
             */
            apiKey:
                qrzPatch.clearApiKey === true
                    ? ""
                    : typeof qrzPatch.apiKey === "string" && qrzPatch.apiKey.trim()
                        ? qrzPatch.apiKey.trim()
                        : base.qrz.apiKey
        }
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


export class SettingsService {


    private settings:
        ShackSettings;


    private onUpdateCallback:
        (() => void) | undefined;


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
            uploads: {
                qrz: {
                    ...this.settings.uploads.qrz
                }
            },

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
                mergeUploads(
                    this.settings.uploads,
                    (settings as any).uploads
                ),

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


        if (
            this.onUpdateCallback
        ) {

            this.onUpdateCallback();

        }


        return this.get();

    }


    onUpdate(
        callback: () => void
    ): void {

        this.onUpdateCallback =
            callback;

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
                        mergeUploads(
                            defaultUploads(),
                            parsed.uploads
                        ),


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
            uploads:
                defaultUploads(),
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
