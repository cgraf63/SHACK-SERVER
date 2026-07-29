import { FusionEngine } from "./fusion-engine.js";


export const fusionEngine =
    new FusionEngine();



fusionEngine.addSpot({

    call: "VK9XX",

    frequency: 14025,

    band: "20m",

    mode: "CW",

    sources: [
        "TEST"
    ],

    timestamp: Date.now(),

    confidence: 96,

    snr: 24

});
