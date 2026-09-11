export const FTDX10_CAT = {

    // ============================================================
    // VFO A / B
    // ============================================================

    vfoA: {
        get: "FA;",
        set: (hz: number) =>
            `FA${Math.round(hz).toString().padStart(9, "0")};`,
    },

    vfoB: {
        get: "FB;",
        set: (hz: number) =>
            `FB${Math.round(hz).toString().padStart(9, "0")};`,
    },

    vfo: {
        aToB: "AB;",
        bToA: "BA;",
        swap: "SV;",
        selectA: "VS0;",
        selectB: "VS1;",
    },


    // ============================================================
    // MODE
    // ============================================================

    mode: {
        get: "MD0;",
        set: (code: string) =>
            `MD0${code};`,
    },


    // ============================================================
    // POWER
    // ============================================================

    power: {
        get: "PC;",
        set: (watts: number) =>
            `PC${Math.max(5, Math.min(100, Math.round(watts)))
                .toString()
                .padStart(3, "0")};`,
    },


    // ============================================================
    // S-METER
    // ============================================================

    smeter: {
        get: "SM0;",
    },


    // ============================================================
    // SPLIT
    // ============================================================

    split: {
        get: "ST;",
        off: "ST0;",
        on: "ST1;",
        quickSplit: "ST2;",
    },


    // ============================================================
    // FILTER WIDTH
    // ============================================================

    filter: {

        width: {
            get: "SH0;",
            set: (code: number) =>
                `SH00${Math.max(0, Math.min(23, Math.round(code)))
                    .toString()
                    .padStart(2, "0")};`,
        },

        // IF SHIFT
        ifShift: {
            get: "IS0;",

            set: (hz: number) => {
                const value = Math.max(
                    0,
                    Math.min(1200, Math.round(Math.abs(hz) / 20) * 20)
                );

                const sign = hz >= 0 ? "+" : "-";

                return `IS00${sign}${value
                    .toString()
                    .padStart(4, "0")};`;
            },
        },

        // ROOFING FILTER
        roofing: {
            get: "RF0;",
            set: (value: string) =>
                `RF0${value};`,
        },
    },


    // ============================================================
    // NOISE BLANKER
    // ============================================================

    noiseBlanker: {

        get: "NB0;",
        on: "NB01;",
        off: "NB00;",

        levelGet: "NL0;",

        levelSet: (level: number) =>
            `NL0${Math.max(0, Math.min(10, Math.round(level)))
                .toString()
                .padStart(3, "0")};`,
    },


    // ============================================================
    // NOISE REDUCTION / DNR
    // ============================================================

    noiseReduction: {

        get: "NR0;",
        on: "NR01;",
        off: "NR00;",

        levelGet: "RL0;",

        levelSet: (level: number) =>
            `RL0${Math.max(1, Math.min(15, Math.round(level)))
                .toString()
                .padStart(2, "0")};`,
    },


    // ============================================================
    // AUTO NOTCH
    // ============================================================

    notch: {

        auto: {
            get: "BC0;",
            on: "BC01;",
            off: "BC00;",
        },


        // MANUAL NOTCH
        //
        // Frequency:
        // 001 ... 320 = 10 ... 3200 Hz
        //
        manual: {

            get: "BP00;",

            off: "BP00000;",

            on: (frequencyHz: number) => {

                const value = Math.max(
                    1,
                    Math.min(
                        320,
                        Math.round(frequencyHz / 10)
                    )
                );

                return `BP001${value
                    .toString()
                    .padStart(3, "0")};`;
            },
        },
    },


    // ============================================================
    // CONTOUR / APF
    // ============================================================

    contour: {

        get: "CO00;",

        off: "CO000000;",

        on: (frequencyHz: number) => {

            const value = Math.max(
                10,
                Math.min(3200, Math.round(frequencyHz))
            );

            return `CO01${value
                .toString()
                .padStart(4, "0")};`;
        },

        apfOff: "CO020000;",
        apfOn: "CO020001;",

        apfFrequency: (value: number) => {

            const v = Math.max(
                0,
                Math.min(50, Math.round(value))
            );

            return `CO03${v
                .toString()
                .padStart(4, "0")};`;
        },
    },


    // ============================================================
    // AGC
    // ============================================================

    agc: {

        get: "GT0;",

        set: (mode: number) =>
            `GT0${Math.max(0, Math.min(6, Math.round(mode)))};`,
    },


    // ============================================================
    // RF GAIN
    // ============================================================

    rfGain: {

        get: "RG0;",

        set: (value: number) =>
            `RG0${Math.max(0, Math.min(255, Math.round(value)))
                .toString()
                .padStart(3, "0")};`,
    },


    // ============================================================
    // ATTENUATOR
    // ============================================================

    attenuator: {

        get: "RA0;",

        off: "RA00;",
        db6: "RA01;",
        db12: "RA02;",
        db18: "RA03;",

        set: (value: 0 | 1 | 2 | 3) =>
            `RA0${value};`,
    },


    // ============================================================
    // IPO / PREAMP
    // ============================================================

    ipo: {

        get: "PA0;",

        ipo: "PA00;",
        amp1: "PA01;",
        amp2: "PA02;",

        set: (value: 0 | 1 | 2) =>
            `PA0${value};`,
    },


    // ============================================================
    // METERS
    // ============================================================

    meters: {

        s: "RM1;",
        comp: "RM3;",
        alc: "RM4;",
        power: "RM5;",
        swr: "RM6;",
        idd: "RM7;",
        vdd: "RM8;",
    },


    // ============================================================
    // PTT
    // ============================================================

    ptt: {

        get: "TX;",
        on: "TX1;",
        off: "TX0;",
    },


    // ============================================================
    // CLARIFIER
    // ============================================================

    clarifier: {

        // Read RX/TX clarifier state
        get: "CF000;",

        // Read clarifier frequency
        frequencyGet: "CF001;",

        // RX/TX clarifier ON/OFF
        set: (
            rxOn: boolean,
            txOn: boolean
        ) =>
            `CF000${rxOn ? "1" : "0"}${txOn ? "1" : "0"}000;`,

        rxGet: "RT;",
        rxOn: "RT1;",
        rxOff: "RT0;",

        txGet: "XT;",
        txOn: "XT1;",
        txOff: "XT0;",

        clear: "RC;",

        down: (hz: number) =>
            `RD${Math.max(0, Math.min(9990, Math.round(hz)))
                .toString()
                .padStart(4, "0")};`,

        up: (hz: number) =>
            `RU${Math.max(0, Math.min(9990, Math.round(hz)))
                .toString()
                .padStart(4, "0")};`,
    },


    // ============================================================
    // CW MEMORY
    // ============================================================

    cwMemory: {

        get: (memory: number) =>
            `KM${Math.max(1, Math.min(5, Math.round(memory)))};`,
    },


    // ============================================================
    // TUNER
    // ============================================================

    tuner: {

        start: "AC002;",
    },

};

