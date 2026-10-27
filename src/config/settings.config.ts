export interface DxSpiderSettings {

    name: string;

    host: string;

    port: number;

    password?: string;

    enabled: boolean;

}


export interface ShackSettings {

    callsign: string;

    operatorName: string;

    locator: string;

    club?: string;

    audio: {

        enabled: boolean;

        device: string;

        sampleRate: number;

        channels: number;

    };

    sources: {

        dxspider: boolean;

        holycluster: boolean;

        dxsummit: boolean;

    };

    dxspiders: DxSpiderSettings[];
    /*
     * Optional pages in the sidebar.
     * rbn: RBN spots (+ memory keys for Yaesu transceivers)
     * sdr: SDRplay RSP1B spectrum (needs the native shack-sdr binary)
     */
    modules: {
        rbn: boolean;
        sdr: boolean;
    };
    /*
     * Online logbooks. Credentials stay in data/settings.json
     * (not in the repository). The API never sends them back
     * to the browser (see routes/settings.ts).
     */
    uploads: UploadSettings;
}

export interface UploadSettings {
    /*
     * One account per callsign (QRZ logbook, later Club Log, LoTW).
     * A QSO is uploaded with the account of its station callsign;
     * portable suffixes (/P, /M, /QRP ...) match automatically,
     * other forms (e.g. A61/HB9BC) via aliases.
     */
    accounts: LogbookAccount[];
}

export interface LogbookAccount {
    id: string;
    callsign: string;
    aliases: string[];
    qrz: {
        enabled: boolean;
        apiKey: string;
    };
}


export const shackSettings: ShackSettings = {

    callsign: "",

    operatorName: "",

    locator: "",

    club: "",

    audio: {

        enabled: true,

        device: "hw:CARD=CODEC,DEV=0",

        sampleRate: 48000,

        channels: 1

    },

    sources: {

        dxspider: true,

        holycluster: true,

        dxsummit: true

    },

    modules: {
        rbn: true,
        sdr: false
    },
    uploads: {
        accounts: []
    },
    dxspiders: [
        {
            name: "HB9ON-8",
            host: "193.108.55.24",
            port: 8000,
            password: "",
            enabled: true
        },

        {
            name: "HB9IAC-8",
            host: "dxc.iapc.ch",
            port: 8000,
            password: "",
            enabled: true
        }

    ]

};
