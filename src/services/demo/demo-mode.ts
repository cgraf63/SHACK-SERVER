/*
 * Demo version (Docker image "shack-server:demo")
 *
 * SHACK_DEMO=1 in the environment switches SHACK-SERVER into a
 * try-out mode: no real CAT (simulated transceiver), no remote
 * audio / PTT, no online uploads, no system actions, a limited log.
 * Live DX spots stay on - they are the point of the demo.
 */

export const DEMO_MODE = process.env.SHACK_DEMO === "1";

export const DEMO_LIMITS = {

    /* QSOs in the normal log (sample QSOs included) */
    qsos: 100,

    /* QSOs in all contest sessions together */
    contestQsos: 200

};

export const DEMO_MESSAGE =
    "Not available in the demo version. Install SHACK-SERVER on a " +
    "Raspberry Pi for the full version: https://github.com/cgraf63/SHACK-SERVER";
