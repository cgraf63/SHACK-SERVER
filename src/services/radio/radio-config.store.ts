import fs from "node:fs";
import { DEMO_MODE } from "../demo/demo-mode.js";
import path from "node:path";

import {
    RadioConfig,
    radios as seedRadios
} from "../../config/radios.config.js";

import { isKnownProtocol } from "./radio-drivers.js";

/*
 * Transceiver configuration store: data/radios.json
 *
 * {
 *   "activeRadioId": "ftdx10",
 *   "radios": [ { id, name, protocol, device, baudRate, enabled, ... } ]
 * }
 *
 * The file is created on first start from src/config/radios.config.ts,
 * so an existing installation keeps its transceivers.
 * After that, the web interface is the only place to edit transceivers.
 */

export interface RadioConfigFile {
    activeRadioId: string;
    radios: RadioConfig[];
}

export class RadioConfigError extends Error {}


const DEFAULT_FILE = path.resolve("data", "radios.json");


export class RadioConfigStore {

    private data: RadioConfigFile;

    constructor(private readonly file: string = DEFAULT_FILE) {
        this.data = this.load();
    }


    /* ------------------------------------------------------------------ */

    getAll(): RadioConfig[] {
        return this.data.radios.map(r => ({ ...r }));
    }

    get(id: string): RadioConfig | undefined {
        const radio = this.data.radios.find(r => r.id === id);
        return radio ? { ...radio } : undefined;
    }

    getActiveRadioId(): string {
        return this.data.activeRadioId;
    }

    setActiveRadioId(id: string): boolean {

        if (!this.data.radios.some(r => r.id === id && r.enabled)) {
            return false;
        }

        this.data.activeRadioId = id;
        this.save();
        return true;

    }

    /* Add a transceiver. Returns the stored config (with generated id). */
    add(input: unknown): RadioConfig {

        const radio = validateRadio(input, undefined, this.data.radios);
        this.data.radios.push(radio);
        this.fixActiveRadio();
        this.save();
        return { ...radio };

    }

    update(id: string, input: unknown): RadioConfig {

        const index = this.data.radios.findIndex(r => r.id === id);

        if (index < 0) {
            throw new RadioConfigError(`Transceiver "${id}" not found`);
        }

        const others = this.data.radios.filter(r => r.id !== id);
        const radio = validateRadio(input, id, others);

        this.data.radios[index] = radio;
        this.fixActiveRadio();
        this.save();
        return { ...radio };

    }

    remove(id: string): void {

        const before = this.data.radios.length;
        this.data.radios = this.data.radios.filter(r => r.id !== id);

        if (this.data.radios.length === before) {
            throw new RadioConfigError(`Transceiver "${id}" not found`);
        }

        this.fixActiveRadio();
        this.save();

    }


    /* ------------------------------------------------------------------ */

    /* Active radio must exist and be enabled; otherwise first enabled one. */
    private fixActiveRadio(): void {

        const active = this.data.radios.find(
            r => r.id === this.data.activeRadioId && r.enabled
        );

        if (!active) {
            this.data.activeRadioId =
                this.data.radios.find(r => r.enabled)?.id ?? "";
        }

    }

    private load(): RadioConfigFile {

        if (!fs.existsSync(this.file)) {

            /* Demo version: only the simulated transceiver. */
            const seeded: RadioConfigFile = DEMO_MODE
                ? {
                    activeRadioId: "demo",
                    radios: [{
                        id: "demo",
                        name: "DEMO TRANSCEIVER",
                        protocol: "demo",
                        device: "",
                        baudRate: 38400,
                        enabled: true,
                    }],
                }
                : {
                    activeRadioId: "",
                    radios: seedRadios.map(r => ({ ...r })),
                };

            this.data = seeded;
            this.fixActiveRadio();
            this.save();

            console.log(
                `RADIO CONFIG: created ${this.file} with ${seeded.radios.length} transceiver(s) from radios.config.ts`
            );

            return this.data;

        }

        try {

            const raw = JSON.parse(fs.readFileSync(this.file, "utf8"));

            const radios: RadioConfig[] = [];

            for (const entry of Array.isArray(raw?.radios) ? raw.radios : []) {
                try {
                    radios.push(validateRadio(entry, entry?.id, radios));
                }
                catch (error) {
                    console.error(
                        "RADIO CONFIG: ignoring invalid entry:",
                        JSON.stringify(entry),
                        (error as Error).message
                    );
                }
            }

            this.data = {
                activeRadioId: String(raw?.activeRadioId ?? ""),
                radios,
            };

            this.fixActiveRadio();
            return this.data;

        }
        catch (error) {

            // Do not overwrite a broken file - keep it for manual repair.
            console.error(
                `RADIO CONFIG: cannot read ${this.file}:`,
                (error as Error).message,
                "- starting without transceivers"
            );

            return { activeRadioId: "", radios: [] };

        }

    }

    /* Atomic write: temp file + rename, so a crash never leaves half a file. */
    private save(): void {

        fs.mkdirSync(path.dirname(this.file), { recursive: true });

        const tmp = `${this.file}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2) + "\n");
        fs.renameSync(tmp, this.file);

    }

}


/* ---------------------------------------------------------------------- */

function slugify(name: string): string {

    return name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "radio";

}

/*
 * Validate and normalize user input.
 * keepId: the id of an existing entry (update) - ids never change.
 */
export function validateRadio(
    input: unknown,
    keepId: string | undefined,
    others: RadioConfig[]
): RadioConfig {

    if (!input || typeof input !== "object") {
        throw new RadioConfigError("Invalid transceiver data");
    }

    const r = input as Record<string, unknown>;

    const name = String(r.name ?? "").trim();
    if (!name) {
        throw new RadioConfigError("Name is required");
    }
    if (name.length > 60) {
        throw new RadioConfigError("Name is too long (max. 60 characters)");
    }
    if (others.some(o => o.name.toLowerCase() === name.toLowerCase())) {
        throw new RadioConfigError(`A transceiver named "${name}" already exists`);
    }

    const protocol = String(r.protocol ?? "");
    if (!isKnownProtocol(protocol)) {
        throw new RadioConfigError(`Unknown driver "${protocol}"`);
    }

    const isHamlib = protocol === "hamlib";
    const network = isHamlib && r.connection === "network";

    // network (existing rigctld): no serial port of our own
    const device = network ? "" : String(r.device ?? "").trim();
    if (device && !device.startsWith("/dev/")) {
        throw new RadioConfigError("The serial port must start with /dev/");
    }
    if (device && others.some(o => o.enabled && o.device === device) && r.enabled !== false) {
        const other = others.find(o => o.enabled && o.device === device)!;
        throw new RadioConfigError(
            `This port is already used by "${other.name}". ` +
            "Disable that transceiver first."
        );
    }

    const baudRate = Number(r.baudRate);
    const modelDefaultBaud = isHamlib && baudRate === 0;   // Hamlib picks it
    if (!modelDefaultBaud && (!Number.isInteger(baudRate) || baudRate < 1200 || baudRate > 1000000)) {
        throw new RadioConfigError("Invalid baud rate");
    }

    // The model is needed to start rigctld ourselves. An existing rigctld
    // already knows its model, so it is optional there.
    let hamlibModel: number | undefined;
    if (isHamlib && (!network || (r.hamlibModel !== undefined && r.hamlibModel !== "" && r.hamlibModel !== null))) {
        hamlibModel = Number(r.hamlibModel);
        if (!Number.isInteger(hamlibModel) || hamlibModel <= 0) {
            throw new RadioConfigError("Please choose the transceiver model from the Hamlib list");
        }
    }

    let host = "";
    let tcpPort = 0;
    if (network) {
        host = String(r.host ?? "").trim() || "127.0.0.1";
        if (!/^[A-Za-z0-9.\-:]+$/.test(host)) {
            throw new RadioConfigError("Invalid rigctld host");
        }
        tcpPort = Number(r.port ?? 4532);
        if (!Number.isInteger(tcpPort) || tcpPort < 1 || tcpPort > 65535) {
            throw new RadioConfigError("Invalid rigctld port (1 … 65535)");
        }
    }

    let id = keepId ?? String(r.id ?? "").trim();
    if (!keepId) {
        const base = slugify(id || name);
        id = base;
        let n = 2;
        while (others.some(o => o.id === id)) {
            id = `${base}-${n++}`;
        }
    }

    const radio: RadioConfig = {
        id,
        name,
        protocol: protocol as RadioConfig["protocol"],
        device,
        baudRate,
        enabled: r.enabled !== false,
    };

    if (r.civAddress !== undefined && r.civAddress !== null && r.civAddress !== "") {
        const civ = typeof r.civAddress === "string"
            ? parseInt(r.civAddress.replace(/^0x/i, ""), 16)
            : Number(r.civAddress);
        if (!Number.isInteger(civ) || civ < 0 || civ > 0xff) {
            throw new RadioConfigError("Invalid CI-V address (00 … FF)");
        }
        radio.civAddress = civ;
    }

    if (isHamlib) {
        if (hamlibModel !== undefined) {
            radio.hamlibModel = hamlibModel;
        }
        radio.connection = network ? "network" : "serial";
        if (network) {
            radio.host = host;
            radio.port = tcpPort;
        }
    }
    else {
        // other drivers: keep optional fields as before
        if (r.connection === "serial" || r.connection === "network") {
            radio.connection = r.connection;
        }
        if (typeof r.host === "string" && r.host) {
            radio.host = r.host;
        }
        if (r.port !== undefined && r.port !== "" && Number.isInteger(Number(r.port))) {
            radio.port = Number(r.port);
        }
    }

    return radio;

}
