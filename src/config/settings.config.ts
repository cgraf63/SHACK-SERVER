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
    notifications: NotificationSettings;
    /* tuning a spot with "UP 2" / "QSX ..." sets split (default on) */
    autoSplit?: boolean;
    /* "CW" from spots / mode buttons: upper or lower sideband CW
       (Yaesu CW-U / CW-L, Icom CW / CW-R) - the operator's habit */
    cwSideband?: "CW-U" | "CW-L";
    /*
     * QRZ.com XML lookup (names, grids of the stations worked) - before
     * only QRZ_USER / QRZ_PASSWORD in .env (still used when this is empty).
     */
    qrzLookup?: {
        username: string;
        password: string;
    } | undefined;
    /* the browser setup assistant (/setup) was finished or skipped */
    setupCompleted?: boolean;
}

/*
 * Push notifications when a callsign of the watch list is spotted
 * (checked on the server, also without an open browser).
 * The ntfy token is never sent to the browser.
 */
export interface NotificationSettings {
    enabled: boolean;
    /* minutes until the same callsign alerts again */
    cooldownMinutes: number;
    quietHours: {
        enabled: boolean;
        /* local time "HH:MM", may cross midnight */
        from: string;
        to: string;
    };
    /* link in the notification, e.g. https://shack.example.ch (empty = none) */
    linkUrl: string;
    ntfy: {
        enabled: boolean;
        server: string;
        topic: string;
        /* access token for protected topics / own server (optional) */
        token: string;
        priority: "default" | "high" | "max";
    };
    /* "heard near you": spotter within this distance of the own QTH */
    nearbyRadiusKm: number;
    /* PSK Reporter live feed (MQTT) for "heard near you" - FT8/FT4 etc. */
    pskReporter: boolean;
    needed: NeededAlertSettings;
}

/*
 * Needed alerts: push when a station is spotted that is still needed
 * (by DXCC entity from cty.dat) - without entering callsigns.
 * Uses the ntfy channel, quiet hours and link of the notifications.
 */
export interface NeededAlertSettings {
    enabled: boolean;
    newCountry: boolean;
    newBandCountry: boolean;
    /* station already worked, but not on this band / in this mode */
    newBand: boolean;
    newMode: boolean;
    /* e.g. ["160m", "80m", ...]; empty = all */
    bands: string[];
    /* CW, PHONE, FT8, FT4, DIGI; empty = all */
    modes: string[];
    /* 0 = off */
    minScore: number;
    /* only alert when a spotter near the own QTH hears the station */
    onlyNearby: boolean;
    /* lockout per entity + band (station alerts: per call + band) */
    cooldownMinutes: number;
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
    /*
     * ARRL Logbook of the World.
     * Upload: QSOs are signed with the callsign certificate (.p12,
     * stored in data/lotw/, not in the settings).
     * Confirmations: LoTW website login.
     */
    lotw: {
        enabled: boolean;
        username: string;
        password: string;
        /* station location zones, empty = from cty.dat */
        cqZone: number | null;
        ituZone: number | null;
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
    notifications: {
        enabled: false,
        cooldownMinutes: 15,
        quietHours: { enabled: false, from: "22:00", to: "07:00" },
        linkUrl: "",
        ntfy: { enabled: true, server: "https://ntfy.sh", topic: "", token: "", priority: "high" },
        nearbyRadiusKm: 1000,
        pskReporter: false,
        needed: {
            enabled: false,
            newCountry: true,
            newBandCountry: true,
            newBand: false,
            newMode: false,
            bands: ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m"],
            modes: [],
            minScore: 0,
            onlyNearby: false,
            cooldownMinutes: 60
        }
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
