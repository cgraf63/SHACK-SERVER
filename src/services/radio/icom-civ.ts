/**
 * Icom CI-V protocol engine.
 *
 * This class contains only protocol logic.
 * It does NOT access serial/network hardware.
 */

export class IcomCiv {

    static readonly PREAMBLE = 0xFE;
    static readonly END = 0xFD;

    static readonly CONTROLLER_ADDRESS = 0xE0;

    /**
     * IC-705 CI-V operating modes.
     *
     * Values are defined by the Icom CI-V Reference Guide.
     */
    static readonly MODES: Record<string, number> = {
        LSB:   0x00,
        USB:   0x01,
        AM:    0x02,
        CW:    0x03,
        RTTY:  0x04,
        FM:    0x05,
        WFM:   0x06,
        "CW-R":  0x07,
        "RTTY-R": 0x08,
        DV:    0x17
    };

    /**
     * IC-705 CI-V filter settings.
     */
    static readonly FILTERS: Record<string, number> = {
        FIL1: 0x01,
        FIL2: 0x02,
        FIL3: 0x03
    };

    /**
     * Return the CI-V mode code.
     */
    static modeToCode(mode: string): number {

        const normalized =
            mode
                .trim()
                .toUpperCase();

        const code =
            IcomCiv.MODES[normalized];

        if (code === undefined) {
            throw new Error(
                "Unsupported ICOM mode: " + mode
            );
        }

        return code;
    }

    /**
     * Return the mode name for a CI-V mode code.
     */
    static codeToMode(code: number): string {

        const entry =
            Object.entries(
                IcomCiv.MODES
            ).find(
                ([, value]) =>
                    value === code
            );

        if (!entry) {
            return "UNKNOWN";
        }

        return entry[0];
    }

    /**
     * Build a complete CI-V frame.
     *
     * FE FE
     * destination
     * source
     * command
     * data...
     * FD
     */
    static buildFrame(
        destination: number,
        command: number[],
        data: number[] = [],
        source = IcomCiv.CONTROLLER_ADDRESS
    ): number[] {

        return [
            IcomCiv.PREAMBLE,
            IcomCiv.PREAMBLE,
            destination,
            source,
            ...command,
            ...data,
            IcomCiv.END
        ];
    }


    /**
     * Convert a frequency in Hz to CI-V BCD.
     *
     * CI-V sends the least significant BCD byte first.
     */
    static frequencyToBcd(
        frequency: number
    ): number[] {

        if (
            !Number.isFinite(frequency) ||
            frequency < 0
        ) {
            throw new Error(
                "Invalid frequency: " + frequency
            );
        }

        const digits =
            Math.round(frequency)
                .toString()
                .padStart(10, "0");

        const result: number[] = [];

        for (
            let i = digits.length - 2;
            i >= 0;
            i -= 2
        ) {

            const low =
                Number(digits[i]);

            const high =
                Number(digits[i + 1]);

            result.push(
                (high << 4) | low
            );
        }

        return result;
    }


    /**
     * Convert CI-V BCD frequency back to Hz.
     */
static bcdToFrequency(
    data: number[]
): number {

    let digits = "";

    for (const value of data) {

        const low =
            value & 0x0F;

        const high =
            (value >> 4) & 0x0F;

        if (
            low > 9 ||
            high > 9
        ) {
            throw new Error(
                "Invalid CI-V BCD byte: 0x" +
                value
                    .toString(16)
                    .padStart(2, "0")
                    .toUpperCase()
            );
        }

        digits =
            low.toString() +
            high.toString() +
            digits;
    }

    return Number(digits);
}
    /**
     * Build SET FREQUENCY command.
     *
     * CI-V command 05.
     */
    static setFrequency(
        destination: number,
        frequency: number
    ): number[] {

        return IcomCiv.buildFrame(
            destination,
            [0x05],
            IcomCiv.frequencyToBcd(
                frequency
            )
        );
    }


    /**
     * Build READ FREQUENCY command.
     *
     * CI-V command 03.
     */
    static readFrequency(
        destination: number
    ): number[] {

        return IcomCiv.buildFrame(
            destination,
            [0x03]
        );
    }


    /**
     * Build SET MODE command.
     */
    static setMode(
        destination: number,
        mode: number,
        filter = 1
    ): number[] {

        return IcomCiv.buildFrame(
            destination,
            [0x06],
            [mode, filter]
        );
    }


    /**
     * Build READ MODE command.
     */
    static readMode(
        destination: number
    ): number[] {

        return IcomCiv.buildFrame(
            destination,
            [0x04]
        );
    }


    /**
     * Convert frame to printable hexadecimal.
     */
    static toHex(
        frame: number[]
    ): string {

        return frame
            .map(
                value =>
                    value
                        .toString(16)
                        .padStart(2, "0")
                        .toUpperCase()
            )
            .join(" ");
    }


    /**
     * Parse the basic CI-V frame envelope.
     *
     * Returns null for an invalid frame.
     */
    static parseFrame(
        frame: number[]
    ): {
        destination: number;
        source: number;
        command: number;
        data: number[];
    } | null {

        if (
            frame.length < 6
        ) {
            return null;
        }

        if (
            frame[0] !== IcomCiv.PREAMBLE ||
            frame[1] !== IcomCiv.PREAMBLE
        ) {
            return null;
        }

        if (
            frame[frame.length - 1] !==
            IcomCiv.END
        ) {
            return null;
        }

        return {
            destination: frame[2]!,
            source: frame[3]!,
            command: frame[4]!,
            data: frame.slice(
                5,
                frame.length - 1
            )
        };
    }

}
