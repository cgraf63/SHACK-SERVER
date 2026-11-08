import { MqttLite } from "./mqtt-lite.js";
import { heardService } from "./heard.service.js";
import { settingsService } from "../settings/settings.service.js";
import { ShackLocationService } from "../geo/shack-location.service.js";
import { DistanceService } from "../geo/distance.service.js";


/*
 * PSK Reporter live feed (MQTT, mqtt.pskreporter.info) as a source for
 * "heard near you" - covers FT8, FT4, JS8, WSPR ... (RBN: CW / RTTY).
 *
 * Only reports of RECEIVERS near the own QTH are subscribed: one topic
 * per 4-character grid square within the radius
 *   pskr/filter/v2/{band}/{mode}/{tx}/{rx}/{tx_grid}/{rx_grid}/{tx_dxcc}/{rx_dxcc}
 *   -> pskr/filter/v2/+/+/+/+/+/JN36/+/+
 * so the Pi does not get the worldwide flood.
 *
 * Reports go to the heard index only (not to the spot list).
 */

const HOST = "mqtt.pskreporter.info";
const PORT = 1883;
const MAX_SQUARES = 400;
const RECONNECT_MS = [10_000, 30_000, 60_000, 120_000];


export interface PskReporterStatus {
    enabled: boolean;
    connected: boolean;
    squares: number;
    reportsPerMinute: number;
    lastReport: number | null;
    error: string;
}


/* 4-character grid squares whose centre is within radiusKm, nearest first */
export function squaresWithin(latitude: number, longitude: number, radiusKm: number, max = MAX_SQUARES): string[] {

    const distance = new DistanceService();
    const result = new Map<string, number>();

    const wrap = (lon: number) => ((lon + 180) % 360 + 360) % 360 - 180;
    const baseLon = Math.floor((longitude + 180) / 2) * 2 - 180;
    const latSteps = Math.ceil(radiusKm / 111) + 1;

    for (let lat = Math.floor(latitude) - latSteps; lat <= Math.floor(latitude) + latSteps; lat++) {

        if (lat < -90 || lat > 89) continue;

        const kmPerDegLon = Math.max(1, 111 * Math.cos(((lat + 0.5) * Math.PI) / 180));
        const lonSteps = Math.min(90, Math.ceil(radiusKm / (2 * kmPerDegLon)) + 1);

        for (let k = -lonSteps; k <= lonSteps; k++) {

            const lon0 = wrap(baseLon + 2 * k);
            const x = lon0 + 180;
            const y = lat + 90;

            const square =
                String.fromCharCode(65 + Math.floor(x / 20)) +
                String.fromCharCode(65 + Math.floor(y / 10)) +
                String(Math.floor((x % 20) / 2)) +
                String(Math.floor(y % 10));

            const km = distance.distanceKm(
                { latitude, longitude },
                { latitude: lat + 0.5, longitude: lon0 + 1 }
            );

            if (km <= radiusKm && !result.has(square)) {
                result.set(square, km);
            }

        }

    }

    return [...result.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, max)
        .map(([square]) => square);

}


class PskReporterService {

    private client: MqttLite | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private failures = 0;
    private squares: string[] = [];
    private key = "";
    private counts: number[] = [];
    private status: PskReporterStatus = {
        enabled: false,
        connected: false,
        squares: 0,
        reportsPerMinute: 0,
        lastReport: null,
        error: ""
    };

    private shack = new ShackLocationService();

    start(): void {

        this.apply();

        settingsService.onUpdate(() => this.apply());

        setInterval(() => {
            // reports per minute (sliding, 1 min)
            const now = Date.now();
            this.counts = this.counts.filter(t => now - t < 60_000);
            this.status.reportsPerMinute = this.counts.length;
        }, 10_000).unref?.();

    }

    getStatus(): PskReporterStatus {

        return { ...this.status, connected: Boolean(this.client?.connected) };

    }

    /* (re)connect when switched on or when QTH / radius changed */
    private apply(): void {

        const settings = settingsService.get().notifications;
        const enabled = settings.pskReporter === true;

        this.status.enabled = enabled;

        if (!enabled) {
            this.stop();
            this.key = "";
            return;
        }

        const position = this.shack.getCoordinates();
        const radius = Math.min(settings.nearbyRadiusKm || 1000, 2500);
        const key = `${position.latitude.toFixed(2)}|${position.longitude.toFixed(2)}|${radius}`;

        if (key === this.key && this.client) return;

        this.key = key;
        this.squares = squaresWithin(position.latitude, position.longitude, radius);
        this.status.squares = this.squares.length;

        this.connect();

    }

    private connect(): void {

        this.stop();

        const client = new MqttLite({
            host: HOST,
            port: PORT,
            clientId: `shack-server-${Math.random().toString(36).slice(2, 10)}`,
            keepaliveSeconds: 60
        });

        this.client = client;

        client.on("connect", () => {

            this.failures = 0;
            this.status.error = "";

            client.subscribe(this.squares.map(square => `pskr/filter/v2/+/+/+/+/+/${square}/+/+`));

            console.log(`PSK Reporter: connected, ${this.squares.length} grid squares around the QTH`);

        });

        client.on("message", (_topic: string, payload: Buffer) => {

            try {

                const report = JSON.parse(payload.toString("utf8"));

                const sender = String(report.sc || "").toUpperCase();
                const receiver = String(report.rc || "").toUpperCase();

                if (!sender || !receiver) return;

                const at = Number(report.t) > 1e9 ? Number(report.t) * 1000 : Date.now();

                heardService.report(sender, {
                    spotter: receiver,
                    source: "PSK Reporter",
                    band: String(report.b || "").toLowerCase(),
                    at: Math.min(at, Date.now()),
                    ...(Number.isFinite(Number(report.rp)) ? { snr: Number(report.rp) } : {}),
                    ...(typeof report.rl === "string" && report.rl.length >= 4 ? { locator: report.rl.slice(0, 6) } : {})
                });

                this.counts.push(Date.now());
                this.status.lastReport = Date.now();

                if (this.counts.length > 20_000) this.counts.splice(0, 10_000);

            }
            catch {
                // not a spot message
            }

        });

        client.on("error", (error: Error) => {
            this.status.error = error.message;
        });

        client.on("close", () => {

            if (this.client !== client) return;

            const delay = RECONNECT_MS[Math.min(this.failures, RECONNECT_MS.length - 1)] ?? 120_000;

            this.failures++;

            console.log(`PSK Reporter: disconnected${this.status.error ? " (" + this.status.error + ")" : ""} - reconnect in ${delay / 1000} s`);

            this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                if (this.status.enabled) this.connect();
            }, delay);

            this.reconnectTimer.unref?.();

        });

        client.connect();

    }

    private stop(): void {

        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        this.reconnectTimer = null;

        const client = this.client;

        this.client = null;
        client?.close();

    }

}


export const pskReporterService = new PskReporterService();
