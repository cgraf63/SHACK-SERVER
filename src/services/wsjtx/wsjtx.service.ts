import dgram from "node:dgram";

import { settingsService } from "../settings/settings.service.js";
import { qsoService } from "../qso/qso-instance.js";
import { uploadQueue } from "../upload/upload-queue.service.js";
import { systemLog } from "../diagnostics/system-log.service.js";
import { CallsignResolverService } from "../geo/callsign-resolver.service.js";
import type { QsoRecord } from "../qso/qso.service.js";


/*
 * WSJT-X / JTDX UDP interface (NetworkMessage.hpp, Qt QDataStream,
 * big endian).
 *
 *   magic 0xADBCCBDA, schema, type, id (utf8), payload
 *
 *   type 0  Heartbeat   max schema, version, revision
 *   type 1  Status      dial frequency, mode, DX call ...
 *   type 6  Close
 *   type 12 LoggedADIF  one ADIF record - used to log the QSO
 *
 * WSJT-X: Settings → Reporting → UDP Server = IP of this server,
 * port 2237 (or a multicast group shared with JTAlert / GridTracker).
 */

const MAGIC = 0xadbccbda;

const TYPE_HEARTBEAT = 0;
const TYPE_STATUS = 1;
const TYPE_CLOSE = 6;
const TYPE_LOGGED_ADIF = 12;

/* Same call, band and mode within this time = duplicate. */
const DUPLICATE_WINDOW_MS = 2 * 60_000;


export interface WsjtxClientState {
    id: string;
    version: string;
    address: string;
    lastSeen: number;
    dialFrequency: number | null;
    mode: string;
    dxCall: string;
}

export interface WsjtxStatus {
    enabled: boolean;
    listening: boolean;
    port: number;
    multicastGroup: string;
    error: string;
    clients: WsjtxClientState[];
    lastQso: { call: string; at: string; result: string } | null;
    loggedCount: number;
}


/* ----------------------------------------------------------------------
 * QDataStream reader
 * ---------------------------------------------------------------------- */

class Reader {

    private offset = 0;

    constructor(private readonly buffer: Buffer) {}

    uint32(): number {
        const value = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return value;
    }

    uint64(): number {
        const value = Number(this.buffer.readBigUInt64BE(this.offset));
        this.offset += 8;
        return value;
    }

    /* QByteArray / utf8 string: quint32 length, 0xffffffff = null */
    utf8(): string {

        const length = this.uint32();

        if (length === 0xffffffff) {
            return "";
        }

        const text = this.buffer.toString("utf8", this.offset, this.offset + length);
        this.offset += length;

        return text;

    }

}


/* ----------------------------------------------------------------------
 * ADIF (one record from WSJT-X)
 * ---------------------------------------------------------------------- */

export function parseAdifRecord(text: string): Record<string, string> {

    const fields: Record<string, string> = {};
    const body = text.replace(/^[\s\S]*?<eoh>/i, "");
    const regex = /<([a-z0-9_]+):(\d+)(?::[a-z])?>/gi;

    let match: RegExpExecArray | null;

    while ((match = regex.exec(body)) !== null) {

        const name = match[1]!.toUpperCase();
        const length = Number(match[2]);
        const start = match.index + match[0].length;

        fields[name] = body.substr(start, length);
        regex.lastIndex = start + length;

    }

    return fields;

}


function isoDate(value: string): string {

    const digits = String(value || "").replace(/\D/g, "");

    return digits.length >= 8
        ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
        : "";

}

function isoTime(value: string): string {

    const digits = String(value || "").replace(/\D/g, "").padEnd(6, "0");

    return digits.length >= 4
        ? `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`
        : "";

}


/* ----------------------------------------------------------------------
 * Service
 * ---------------------------------------------------------------------- */

class WsjtxService {

    private socket: dgram.Socket | null = null;
    private listening = false;
    private error = "";
    private config = { enabled: false, port: 2237, multicastGroup: "" };
    private clients = new Map<string, WsjtxClientState>();
    private lastQso: WsjtxStatus["lastQso"] = null;
    private loggedCount = 0;
    private resolver = new CallsignResolverService();

    start(): void {

        settingsService.onUpdate(() => this.applySettings());
        this.applySettings();

    }

    getStatus(): WsjtxStatus {

        const now = Date.now();

        return {
            enabled: this.config.enabled,
            listening: this.listening,
            port: this.config.port,
            multicastGroup: this.config.multicastGroup,
            error: this.error,
            clients: [...this.clients.values()]
                .filter(client => now - client.lastSeen < 5 * 60_000),
            lastQso: this.lastQso,
            loggedCount: this.loggedCount
        };

    }

    /* (Re)start the UDP listener when the settings changed. */
    private applySettings(): void {

        const wanted = settingsService.get().wsjtx;

        if (
            this.socket &&
            wanted.enabled === this.config.enabled &&
            wanted.port === this.config.port &&
            wanted.multicastGroup === this.config.multicastGroup
        ) {
            return;
        }

        this.config = { ...wanted };
        this.stop();

        if (wanted.enabled) {
            this.listen();
        }

    }

    private stop(): void {

        if (this.socket) {
            try {
                this.socket.close();
            }
            catch {
                // already closed
            }
        }

        this.socket = null;
        this.listening = false;
        this.clients.clear();

    }

    private listen(): void {

        const { port, multicastGroup } = this.config;

        const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

        this.socket = socket;
        this.error = "";

        socket.on("error", error => {

            this.error = error.message;
            this.listening = false;

            systemLog.error("WSJTX", "WSJTX", `UDP ${port}: ${error.message}`);

            try {
                socket.close();
            }
            catch {
                // ignore
            }

            if (this.socket === socket) {
                this.socket = null;
            }

        });

        socket.on("message", (message, remote) => {

            try {
                this.handleMessage(message, remote.address);
            }
            catch (error) {
                console.error("WSJT-X message:", error);
            }

        });

        socket.bind(port, () => {

            this.listening = true;

            if (multicastGroup) {
                try {
                    socket.addMembership(multicastGroup);
                }
                catch (error) {
                    this.error =
                        `Multicast ${multicastGroup}: ` +
                        (error instanceof Error ? error.message : String(error));
                }
            }

            systemLog.info(
                "WSJTX", "WSJTX",
                `Listening on UDP ${port}` + (multicastGroup ? ` (multicast ${multicastGroup})` : "")
            );

        });

    }

    handleMessage(message: Buffer, address: string): void {

        if (message.length < 16) {
            return;
        }

        const reader = new Reader(message);

        if (reader.uint32() !== MAGIC) {
            return;
        }

        reader.uint32();                       // schema
        const type = reader.uint32();
        const id = reader.utf8() || "WSJT-X";

        const client =
            this.clients.get(id) ??
            {
                id,
                version: "",
                address,
                lastSeen: 0,
                dialFrequency: null,
                mode: "",
                dxCall: ""
            };

        client.lastSeen = Date.now();
        client.address = address;
        this.clients.set(id, client);

        switch (type) {

            case TYPE_HEARTBEAT: {
                reader.uint32();               // max schema
                client.version = reader.utf8();
                break;
            }

            case TYPE_STATUS: {
                client.dialFrequency = reader.uint64();
                client.mode = reader.utf8();
                client.dxCall = reader.utf8();
                break;
            }

            case TYPE_CLOSE: {
                this.clients.delete(id);
                break;
            }

            case TYPE_LOGGED_ADIF: {
                this.logAdif(reader.utf8(), id);
                break;
            }

            default:
                break;

        }

    }

    /* A QSO logged in WSJT-X -> SHACK-SERVER log (+ online logbooks). */
    logAdif(adif: string, source = "WSJT-X"): QsoRecord | null {

        const f = parseAdifRecord(adif);
        const settings = settingsService.get();

        const call = String(f.CALL || "").trim().toUpperCase();
        const qsoDate = isoDate(f.QSO_DATE || "");
        const timeOn = isoTime(f.TIME_ON || "");

        if (!call || !qsoDate || !timeOn) {
            systemLog.warn("WSJTX", "WSJTX", `${source}: incomplete QSO ignored`);
            return null;
        }

        const frequency = Number(f.FREQ);                       // MHz
        const mode = String(f.SUBMODE || f.MODE || "").trim().toUpperCase();
        const band = String(f.BAND || "").trim().toLowerCase();

        if (this.isDuplicate(call, band, mode, qsoDate, timeOn)) {

            this.lastQso = { call, at: new Date().toISOString(), result: "duplicate, not logged" };
            systemLog.info("WSJTX", "WSJTX", `${source}: ${call} already in log`);
            return null;

        }

        const info = this.resolver.resolve(call);

        const qso = qsoService.createQso({
            qso_date: qsoDate,
            time_on_utc: timeOn,
            time_off_utc: f.TIME_OFF ? isoTime(f.TIME_OFF) : null,
            call,
            frequency: Number.isFinite(frequency) ? frequency : 0,
            band,
            mode,
            rst_sent: String(f.RST_SENT || "").trim(),
            rst_rcvd: String(f.RST_RCVD || "").trim(),
            my_callsign:
                String(f.STATION_CALLSIGN || f.MY_CALL || settings.callsign || "")
                    .trim().toUpperCase(),
            my_grid: String(f.MY_GRIDSQUARE || settings.locator || "").trim(),
            operator_name: String(f.OPERATOR || settings.operatorName || "").trim(),
            name: f.NAME?.trim() || null,
            country: info?.country || f.COUNTRY?.trim() || null,
            country_code: info?.countryCode || null,
            dx_grid: f.GRIDSQUARE?.trim() || null,
            itu_zone: f.ITUZ ? Number(f.ITUZ) : null,
            cq_zone: f.CQZ ? Number(f.CQZ) : null,
            notes: f.COMMENT?.trim() || null,
            spot_source: "WSJT-X",
            spot_id: null
        });

        if (qso.id) {
            uploadQueue.enqueue("qso", Number(qso.id));
        }

        this.loggedCount++;
        this.lastQso = { call, at: new Date().toISOString(), result: "logged" };

        systemLog.info(
            "WSJTX", "WSJTX",
            `${source}: logged ${call} ${band} ${mode}`
        );

        return qso;

    }

    private isDuplicate(
        call: string,
        band: string,
        mode: string,
        qsoDate: string,
        timeOn: string
    ): boolean {

        const time = Date.parse(`${qsoDate}T${timeOn}Z`);

        return qsoService.getAllQso().some(qso => {

            if (
                String(qso.call).toUpperCase() !== call ||
                String(qso.band).toLowerCase().replace(/m$/, "") !== band.replace(/m$/, "") ||
                String(qso.mode).toUpperCase() !== mode
            ) {
                return false;
            }

            const other = Date.parse(
                `${qso.qso_date}T${String(qso.time_on_utc).padEnd(8, ":00").slice(0, 8)}Z`
            );

            return Math.abs(other - time) <= DUPLICATE_WINDOW_MS;

        });

    }

}


export const wsjtxService = new WsjtxService();
