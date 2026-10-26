import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";


/*
 * Location of the native SDR program (shack-sdr).
 *
 * Resolved relative to this module, so it works for any user and
 * installation directory:
 *   dist/services/sdr/ -> <project>/src/services/sdr/native/shack-sdr
 *   src/services/sdr/  -> <project>/src/services/sdr/native/shack-sdr
 *
 * Can be overridden with SHACK_SDR_BINARY in .env.
 */
const projectRoot =
    path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        ".."
    );

export const SDR_BINARY =
    process.env.SHACK_SDR_BINARY ||
    path.join(
        projectRoot,
        "src",
        "services",
        "sdr",
        "native",
        "shack-sdr"
    );


/*
 * The SDRplay API library the native program needs.
 */
const SDRPLAY_LIB_DIRS = [
    "/usr/local/lib",
    "/usr/lib",
    "/usr/lib/aarch64-linux-gnu"
];

function sdrplayApiInstalled(): boolean {

    for (const dir of SDRPLAY_LIB_DIRS) {

        try {

            if (
                fs.readdirSync(dir)
                    .some(file => file.startsWith("libsdrplay_api.so"))
            ) {
                return true;
            }

        }
        catch {
            // directory missing - try the next one
        }

    }

    return false;

}


/*
 * True when SDR can work on this machine: native program present
 * and SDRplay API installed. Used as default for the SDR module.
 */
export function sdrBinaryExists(): boolean {

    try {

        return (
            fs.existsSync(SDR_BINARY) &&
            sdrplayApiInstalled()
        );

    }
    catch {
        return false;
    }

}
