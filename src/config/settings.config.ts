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
    /*
     * WSJT-X / JTDX: QSOs logged there are received via UDP
     * (WSJT-X Settings → Reporting → UDP Server = IP of this server).
     */
    wsjtx: {
        enabled: boolean;
        port: number;
        /* empty = unicast; e.g. 224.0.0.1 when JTAlert/GridTracker share the stream */
        multicastGroup: string;
    };
    rotator: RotatorSettings;
    backup: BackupSettings;
}

/*
 * Backup of the log and the settings (daily, at a set time).
 *   rclone: to an rclone remote, e.g. "dropbox:SHACK-SERVER"
 *   smb:    directly to a NAS share (via rclone's SMB backend)
 * The SMB password is never sent to the browser.
 */
export interface BackupSettings {
    enabled: boolean;
    /* local time, "HH:MM" */
    time: string;
    /* number of backups kept per target */
    keep: number;
    rclone: {
        enabled: boolean;
        remote: string;
    };
    smb: {
        enabled: boolean;
        host: string;
        share: string;
        path: string;
        user: string;
        password: string;
        domain: string;
    };
}

/*
 * Antenna rotator via Hamlib (rotctld).
 *   serial:  SHACK-SERVER starts its own rotctld for the controller
 *   network: connect to a rotctld that is already running
 */
export interface RotatorSettings {
    enabled: boolean;
    connection: "serial" | "network";
    /* Hamlib rotator model number (rotctl -l) */
    model: number;
    device: string;
    /* 0 = Hamlib default for this model */
    baudRate: number;
    host: string;
    port: number;
}

export interface UploadSettings {
    /*
     * One account per callsign (QRZ logbook, later Club Log, LoTW).
     * A QSO is uploaded with the account of its station callsign;
     * portable suffixes (/P, /M, /QRP ...) match automatically,
     * other forms (e.g. A61/HB9BC) via aliases.
     */
    accounts: LogbookAccount[];
    /*
     * Club Log application key (per program, not per callsign).
     * Every installation requests its own: clublog.org/requestapikey.php
     * - never commit it to a public repository.
     */
    clublogApiKey: string;
}

export interface LogbookAccount {
    id: string;
    callsign: string;
    aliases: string[];
    qrz: {
        enabled: boolean;
        apiKey: string;
    };
    clublog: {
        enabled: boolean;
        email: string;
        /* Club Log application password (Settings → App Passwords) */
        password: string;
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
        accounts: [],
        clublogApiKey: ""
    },
    wsjtx: {
        enabled: false,
        port: 2237,
        multicastGroup: ""
    },
    rotator: {
        enabled: false,
        connection: "serial",
        model: 0,
        device: "",
        baudRate: 0,
        host: "127.0.0.1",
        port: 4533
    },
    backup: {
        enabled: false,
        time: "03:15",
        keep: 14,
        rclone: { enabled: false, remote: "dropbox:SHACK-SERVER" },
        smb: { enabled: false, host: "", share: "", path: "SHACK-SERVER", user: "", password: "", domain: "" }
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
