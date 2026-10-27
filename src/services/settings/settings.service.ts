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
            uploads:
                mergeUploadSettings(
                    this.settings.uploads,
                    undefined
                ),

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
                        loadUploadSettings(
                            parsed,
                            parsed.callsign ?? ""
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
            uploads: {
                accounts: [],
                clublogApiKey: ""
            },
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
