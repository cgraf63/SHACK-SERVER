import { IcomCiv } from "./icom-civ.js";

const RADIO = 0xA4;

console.log("=== IC-705 CI-V SIMULATION ===");

function show(label: string, frame: number[]) {
    console.log(
        label.padEnd(18),
        IcomCiv.toHex(frame)
    );
}

/*
 * Computer asks IC-705 for frequency.
 */
const readFrequency =
    IcomCiv.readFrequency(RADIO);

show("Computer → Radio:", readFrequency);

/*
 * Simulated IC-705 response:
 *
 * 144.088000 MHz
 */
const frequencyResponse =
    IcomCiv.buildFrame(
        IcomCiv.CONTROLLER_ADDRESS,
        [0x03],
        IcomCiv.frequencyToBcd(144088000),
        RADIO
    );

show("Radio → Computer:", frequencyResponse);

const parsedFrequency =
    IcomCiv.parseFrame(
        frequencyResponse
    );

if (!parsedFrequency) {
    throw new Error(
        "Frequency response could not be parsed"
    );
}

const frequency =
    IcomCiv.bcdToFrequency(
        parsedFrequency.data
    );

console.log(
    "Decoded frequency:",
    frequency,
    "Hz"
);

if (frequency !== 144088000) {
    throw new Error(
        "Frequency simulation failed"
    );
}


/*
 * Simulated USB mode response.
 *
 * CI-V mode 01 = USB
 * Filter 01 = FIL1
 */
const modeResponse =
    IcomCiv.buildFrame(
        IcomCiv.CONTROLLER_ADDRESS,
        [0x04],
        [0x01, 0x01],
        RADIO
    );

show("Radio → Computer:", modeResponse);

const parsedMode =
    IcomCiv.parseFrame(
        modeResponse
    );

if (!parsedMode) {
    throw new Error(
        "Mode response could not be parsed"
    );
}

const mode =
    IcomCiv.codeToMode(
        parsedMode.data[0]!
    );

console.log(
    "Decoded mode:",
    mode
);

if (mode !== "USB") {
    throw new Error(
        "Mode simulation failed"
    );
}

console.log("");
console.log("=== IC-705 SIMULATION OK ===");
