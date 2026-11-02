import { execFile } from "node:child_process";

import { parseRigList, type HamlibModel } from "../radio/hamlib-models.js";


/*
 * Hamlib rotator model list (rotctl -l). Same layout as rigctl -l,
 * only the first column is "Rot #" instead of "Rig #".
 */

export interface RotatorModelList {
    installed: boolean;
    models: HamlibModel[];
    error: string;
}

let cache: RotatorModelList | null = null;

export function getRotatorModels(options: { refresh?: boolean } = {}): Promise<RotatorModelList> {

    if (cache && !options.refresh) {
        return Promise.resolve(cache);
    }

    return new Promise(resolve => {

        execFile(
            "rotctl",
            ["-l"],
            { timeout: 15000, maxBuffer: 4 * 1024 * 1024 },
            (error, stdout, stderr) => {

                if (error && !stdout) {

                    const notInstalled = (error as NodeJS.ErrnoException).code === "ENOENT";

                    resolve({
                        installed: false,
                        models: [],
                        error: notInstalled
                            ? "Hamlib is not installed. On the Raspberry run: sudo apt install libhamlib-utils"
                            : `rotctl -l failed: ${error.message}`
                    });

                    return;

                }

                const text = `${stdout}${stderr}`.replace(/Rot(\s*)#/, "Rig$1#");
                const models = parseRigList(text);

                cache = {
                    installed: true,
                    models,
                    error: models.length ? "" : "rotctl -l returned no rotator models"
                };

                resolve(cache);

            }
        );

    });

}
