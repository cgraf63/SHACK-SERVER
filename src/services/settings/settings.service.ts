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


    private settings: ShackSettings;


    constructor() {

        this.settings =
            this.load();

    }


    get(): ShackSettings {

        return {
            ...this.settings,

            sources: {
                ...this.settings.sources
            }
        };

    }


    update(
        settings: ShackSettings
    ): ShackSettings {

        this.settings = {

            ...settings,

            sources: {
                ...settings.sources
            }

        };


        this.save();


        return this.get();

    }


    private load(): ShackSettings {

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
                    JSON.parse(data);


                return {

                    ...shackSettings,

                    ...parsed,

                    sources: {

                        ...shackSettings.sources,

                        ...(parsed.sources ?? {})

                    }

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
            }
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
