import fs from "node:fs";
import path from "node:path";

import {
    ShackSettings,
    shackSettings
} from "../../config/settings.config.js";


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


        this.settings = {

            ...settings,

            sources: {
                ...settings.sources
            },

            dxspiders:
                settings.dxspiders.map(
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
