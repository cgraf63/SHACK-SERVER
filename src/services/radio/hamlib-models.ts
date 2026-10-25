import { execFile } from "node:child_process";

/*
 * Hamlib rig model list (rigctl -l)
 *
 * Output looks like (Hamlib 4.x):
 *
 *  Rig #  Mfg                    Model                   Version         Status      Macro
 *      1  Hamlib                 Dummy                   20221128.0      Stable      RIG_MODEL_DUMMY
 *   1049  Yaesu                  FTDX-10                 20221128.10     Stable      RIG_MODEL_FTDX10
 *
 * Column widths differ between Hamlib versions (and the "Macro" column is
 * missing in older ones), so the column positions are taken from the
 * header line. Lines are parsed with a whitespace fallback if needed.
 */

export interface HamlibModel {
    id: number;
    mfg: string;
    model: string;
    status: string;
}

export interface HamlibModelList {
    installed: boolean;
    version: string;
    models: HamlibModel[];
    error: string;
}

export function parseRigList(output: string): HamlibModel[] {

    const lines = output.split(/\r?\n/);
    const header = lines.find(l => /Rig\s*#/.test(l) && /Mfg/.test(l) && /Model/.test(l));

    const models: HamlibModel[] = [];

    let cols: { mfg: number; model: number; version: number; status: number; end: number } | null = null;

    if (header) {
        const at = (name: string) => header.indexOf(name);
        const version = at("Version");
        const status = at("Status");
        const macro = at("Macro");
        cols = {
            mfg: at("Mfg"),
            model: at("Model"),
            version: version > 0 ? version : -1,
            status: status > 0 ? status : -1,
            end: macro > 0 ? macro : -1,
        };
    }

    for (const line of lines) {

        if (line === header || !/^\s*\d+\s/.test(line)) continue;

        const id = Number(/^\s*(\d+)/.exec(line)![1]);
        let mfg = "", model = "", status = "";

        if (cols && cols.mfg > 0 && cols.model > cols.mfg) {

            const cut = (from: number, to: number) =>
                (to > from ? line.slice(from, to) : line.slice(from)).trim();

            mfg = cut(cols.mfg, cols.model);
            model = cut(cols.model, cols.version > 0 ? cols.version : cols.status);
            status = cols.status > 0 ? cut(cols.status, cols.end).split(/\s+/)[0] ?? "" : "";

        }

        // Fallback: columns separated by two or more spaces.
        if (!mfg || !model) {
            const parts = line.trim().split(/\s{2,}/);
            mfg = parts[1] ?? "";
            model = parts[2] ?? "";
            status = parts[4] ?? "";
        }

        if (!mfg || !model) continue;

        models.push({ id, mfg, model, status });

    }

    return models.sort((a, b) =>
        a.mfg.localeCompare(b.mfg) || a.model.localeCompare(b.model, undefined, { numeric: true })
    );

}


function run(command: string, args: string[]): Promise<string> {

    return new Promise((resolve, reject) => {
        execFile(command, args, { timeout: 15000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(Object.assign(error, { output: `${stdout}${stderr}` }));
                return;
            }
            resolve(`${stdout}${stderr}`);
        });
    });

}


let cache: HamlibModelList | null = null;

/* Model list, read once and cached (rigctl -l takes a moment on a Pi). */
export async function getHamlibModels(
    rigctl = "rigctl",
    options: { refresh?: boolean } = {}
): Promise<HamlibModelList> {

    if (cache && !options.refresh) {
        return cache;
    }

    try {

        const list = await run(rigctl, ["-l"]);

        let version = "";
        try {
            version = (await run(rigctl, ["--version"])).trim().split(/\r?\n/)[0] ?? "";
        }
        catch {
            // version is optional
        }

        const models = parseRigList(list);

        cache = {
            installed: true,
            version,
            models,
            error: models.length ? "" : "rigctl -l returned no transceiver models",
        };

    }
    catch (error) {

        const notInstalled = (error as NodeJS.ErrnoException).code === "ENOENT";

        // do not cache "not installed": the user may install Hamlib now
        return {
            installed: false,
            version: "",
            models: [],
            error: notInstalled
                ? "Hamlib is not installed. On the Raspberry run: sudo apt install libhamlib-utils"
                : `rigctl -l failed: ${(error as Error).message}`,
        };

    }

    return cache;

}
