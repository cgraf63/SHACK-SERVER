import os from "node:os";


/*
 * What this Raspberry Pi can do.
 *
 * Pis with little RAM (Pi Zero 2 W: 512 MB) run SHACK-SERVER fine, but
 * not the SDR (RSP1B spectrum / waterfall): too little CPU and USB
 * bandwidth - it is hidden there and not started.
 * SHACK_SDR=1 in .env switches it on anyway.
 */

/* below 768 MB: Pi Zero 2 W (512 MB, ~415 MB visible). A Pi 4 with 1 GB
   (~900 MB visible) keeps the SDR - the prototype runs the RSP1B on one. */
const LOW_MEMORY_BYTES = 768 * 1024 * 1024;

export function lowMemory(): boolean {
    return os.totalmem() < LOW_MEMORY_BYTES;
}

export function sdrAvailable(): boolean {
    if (process.env.SHACK_SDR === "1") return true;
    if (process.env.SHACK_SDR === "0") return false;
    return !lowMemory();
}

export function capabilities() {
    return {
        lowMemory: lowMemory(),
        sdr: sdrAvailable()
    };
}
