import net from "node:net";
import { EventEmitter } from "node:events";


/*
 * Minimal MQTT 3.1.1 client - receive only (QoS 0/1), no dependencies.
 * Enough for public live feeds such as PSK Reporter:
 * CONNECT / CONNACK, SUBSCRIBE / SUBACK, PUBLISH (+ PUBACK for QoS 1),
 * PINGREQ / PINGRESP.
 *
 * Events: "connect", "message" (topic, payload: Buffer), "close", "error"
 */

const TYPE_CONNECT = 1;
const TYPE_CONNACK = 2;
const TYPE_PUBLISH = 3;
const TYPE_PUBACK = 4;
const TYPE_SUBSCRIBE = 8;
const TYPE_SUBACK = 9;
const TYPE_PINGREQ = 12;
const TYPE_PINGRESP = 13;

const CONNACK_ERRORS: Record<number, string> = {
    1: "unacceptable protocol version",
    2: "client identifier rejected",
    3: "server unavailable",
    4: "bad user name or password",
    5: "not authorized"
};


export function encodeLength(length: number): Buffer {

    const bytes: number[] = [];

    do {
        let byte = length % 128;
        length = Math.floor(length / 128);
        if (length > 0) byte |= 0x80;
        bytes.push(byte);
    } while (length > 0);

    return Buffer.from(bytes);

}

function encodeString(value: string): Buffer {

    const data = Buffer.from(value, "utf8");
    const length = Buffer.alloc(2);

    length.writeUInt16BE(data.length);

    return Buffer.concat([length, data]);

}

function packet(type: number, flags: number, body: Buffer): Buffer {

    return Buffer.concat([Buffer.from([(type << 4) | flags]), encodeLength(body.length), body]);

}


export interface MqttLiteOptions {
    host: string;
    port: number;
    clientId: string;
    keepaliveSeconds?: number;
}


export class MqttLite extends EventEmitter {

    private socket: net.Socket | null = null;
    private buffer: Buffer = Buffer.alloc(0);
    private packetId = 1;
    private pingTimer: NodeJS.Timeout | null = null;
    private lastReceived = 0;
    connected = false;

    constructor(private readonly options: MqttLiteOptions) {

        super();

    }

    connect(): void {

        this.close();

        const keepalive = this.options.keepaliveSeconds ?? 60;
        const socket = net.connect({ host: this.options.host, port: this.options.port });

        this.socket = socket;
        this.buffer = Buffer.alloc(0);

        socket.setNoDelay(true);
        socket.setTimeout(30_000);

        socket.on("connect", () => {

            socket.setTimeout(0);

            const variable = Buffer.concat([
                encodeString("MQTT"),
                Buffer.from([0x04, 0x02]),           // level 4 (3.1.1), clean session
                Buffer.from([keepalive >> 8, keepalive & 0xff])
            ]);

            socket.write(packet(TYPE_CONNECT, 0, Buffer.concat([variable, encodeString(this.options.clientId)])));

        });

        socket.on("timeout", () => {
            socket.destroy(new Error("connection timeout"));
        });

        socket.on("data", chunk => {

            this.lastReceived = Date.now();
            this.buffer = Buffer.concat([this.buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);

            try {
                this.parse();
            }
            catch (error) {
                socket.destroy(error instanceof Error ? error : new Error(String(error)));
            }

        });

        socket.on("error", error => {
            this.emit("error", error);
        });

        socket.on("close", () => {

            if (this.socket !== socket) return;

            this.stopPing();
            this.connected = false;
            this.socket = null;
            this.emit("close");

        });

    }

    private parse(): void {

        while (this.buffer.length >= 2) {

            // remaining length: 1-4 bytes
            let multiplier = 1;
            let length = 0;
            let offset = 1;
            let complete = false;

            while (offset < this.buffer.length && offset <= 4) {

                const byte = this.buffer[offset] ?? 0;

                length += (byte & 0x7f) * multiplier;
                multiplier *= 128;
                offset++;

                if ((byte & 0x80) === 0) {
                    complete = true;
                    break;
                }

            }

            if (!complete) {
                if (offset > 4) throw new Error("malformed remaining length");
                return; // wait for more data
            }

            if (this.buffer.length < offset + length) return;

            const header = this.buffer[0] ?? 0;
            const body = this.buffer.subarray(offset, offset + length);

            this.buffer = this.buffer.subarray(offset + length);

            this.handle(header >> 4, header & 0x0f, Buffer.from(body));

        }

    }

    private handle(type: number, flags: number, body: Buffer): void {

        if (type === TYPE_CONNACK) {

            const code = body[1] ?? 255;

            if (code !== 0) {
                this.socket?.destroy(new Error(`MQTT connection refused: ${CONNACK_ERRORS[code] ?? code}`));
                return;
            }

            this.connected = true;
            this.startPing();
            this.emit("connect");
            return;

        }

        if (type === TYPE_PUBLISH) {

            const qos = (flags >> 1) & 0x03;
            const topicLength = body.readUInt16BE(0);
            const topic = body.subarray(2, 2 + topicLength).toString("utf8");

            let offset = 2 + topicLength;

            if (qos > 0) {
                const id = body.readUInt16BE(offset);
                offset += 2;
                if (qos === 1) this.socket?.write(packet(TYPE_PUBACK, 0, Buffer.from([id >> 8, id & 0xff])));
            }

            this.emit("message", topic, body.subarray(offset));
            return;

        }

        if (type === TYPE_SUBACK) {

            // return codes: 0x80 = failure
            const codes = [...body.subarray(2)];

            if (codes.some(code => code === 0x80)) {
                this.emit("error", new Error(`MQTT subscribe rejected for ${codes.filter(c => c === 0x80).length} topic(s)`));
            }

            return;

        }

        // PINGRESP, PUBACK etc.: nothing to do
        void TYPE_PINGRESP;

    }

    subscribe(topics: string[]): void {

        if (!this.socket || !topics.length) return;

        // several SUBSCRIBE packets, at most 50 topics each
        for (let i = 0; i < topics.length; i += 50) {

            const id = this.packetId;

            this.packetId = this.packetId >= 65535 ? 1 : this.packetId + 1;

            const parts: Buffer[] = [Buffer.from([id >> 8, id & 0xff])];

            for (const topic of topics.slice(i, i + 50)) {
                parts.push(encodeString(topic), Buffer.from([0x00])); // QoS 0
            }

            // SUBSCRIBE has the fixed flags 0010
            this.socket.write(packet(TYPE_SUBSCRIBE, 0x02, Buffer.concat(parts)));

        }

    }

    private startPing(): void {

        this.stopPing();

        const keepalive = (this.options.keepaliveSeconds ?? 60) * 1000;

        this.pingTimer = setInterval(() => {

            if (Date.now() - this.lastReceived > keepalive * 1.5) {
                this.socket?.destroy(new Error("no data from the MQTT server"));
                return;
            }

            this.socket?.write(packet(TYPE_PINGREQ, 0, Buffer.alloc(0)));

        }, keepalive / 2);

        this.pingTimer.unref?.();

    }

    private stopPing(): void {

        if (this.pingTimer) clearInterval(this.pingTimer);

        this.pingTimer = null;

    }

    close(): void {

        this.stopPing();

        const socket = this.socket;

        this.socket = null;
        this.connected = false;

        if (socket) {
            socket.removeAllListeners();
            socket.on("error", () => undefined);
            socket.destroy();
        }

    }

}
