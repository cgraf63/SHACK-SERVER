/*
 * Morse code table and timing (shared by the CW decoder and CW sending).
 *
 * Timing in dot units: dot 1, dash 3, gap inside a character 1,
 * between characters 3, between words 7. 1 unit = 1200 / WPM ms.
 */

export const MORSE: Record<string, string> = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
    I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
    Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
    Y: "-.--", Z: "--..",
    "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
    "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
    ".": ".-.-.-", ",": "--..--", "?": "..--..", "/": "-..-.", "=": "-...-",
    "+": ".-.-.", "-": "-....-", "'": ".----.", "(": "-.--.", ")": "-.--.-",
    ":": "---...", "@": ".--.-.", "\"": ".-..-.", "!": "-.-.--", "&": ".-..."
};

/* prosigns the decoder shows in angle brackets */
const PROSIGNS: Record<string, string> = {
    "...-.-": "<SK>",
    ".-.-": "<AA>",
    "...-.": "<SN>",
    "........": "<HH>",
    "-.-.-": "<KA>",
    "...---...": "<SOS>"
};

export const MORSE_DECODE: Record<string, string> = {
    ...Object.fromEntries(Object.entries(MORSE).map(([char, code]) => [code, char])),
    ...PROSIGNS
};

/* the characters a transceiver can send */
export function cleanCwText(text: string): string {
    return String(text ?? "")
        .toUpperCase()
        .replace(/\s+/g, " ")
        .split("")
        .filter(char => char === " " || MORSE[char] !== undefined)
        .join("")
        .trim();
}

/* length of a text in dot units (incl. the gap after it) */
export function morseUnits(text: string): number {

    let units = 0;

    for (const word of cleanCwText(text).split(" ").filter(Boolean)) {
        for (const char of word) {
            const code = MORSE[char] ?? "";
            for (const element of code) units += (element === "-" ? 3 : 1) + 1;
            units += 2;     // 1 + 2 = 3 between characters
        }
        units += 4;         // 3 + 4 = 7 between words
    }

    return units;

}

/* duration in ms at a speed in WPM */
export function morseDurationMs(text: string, wpm: number): number {
    return Math.round(morseUnits(text) * 1200 / Math.max(5, wpm || 20));
}
