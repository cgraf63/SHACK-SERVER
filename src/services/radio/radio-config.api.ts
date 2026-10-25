import fs from "node:fs";
import path from "node:path";

import type { RadioConfig } from "../../config/radios.config.js";
import type { RadioService } from "./radio.interface.js";
import type { RadioManager } from "./radio-manager.js";

import { RadioConfigError, validateRadio } from "./radio-config.store.js";
import { createRadioService, getRadioDrivers } from "./radio-drivers.js";

/*
 * Transceiver configuration API - framework independent.
 * routes/radio-config.ts only maps HTTP requests onto these functions.
 */

export interface ApiResult {
    status: number;
    body: unknown;
}

const ok = (body: unknown): ApiResult => ({ status: 200, body });
const fail = (status: number, error: string): ApiResult => ({ status, body: { error } });


/* ----------------------------------------------------------------------
 * List / drivers
 * ---------------------------------------------------------------------- */

export function listRadios(manager: RadioManager): ApiResult {

    const activeRadioId = manager.store.getActiveRadioId();

    return ok({
        activeRadioId,
        radios: manager.store.getAll().map(config => {

            const service = manager.getRadio(config.id);

            return {
                ...config,
                status: {
                    running: service !== undefined,
                    connected: service?.isConnected?.() ?? false,
                    frequency: service?.getFrequency() ?? 0,
                    mode: service?.getMode() ?? "UNKNOWN",
                    lastError: service?.getLastError?.() ?? "",
                    active: config.id === activeRadioId,
                },
            };

        }),
    });

}

export function listDrivers(): ApiResult {

    return ok(getRadioDrivers());

}


/* ----------------------------------------------------------------------
 * Serial ports
 * ---------------------------------------------------------------------- */

export interface SerialPortInfo {
    path: string;
    label: string;
    target: string;
    hint: string;
    inUseBy: string;
}

/*
 * "usb-Silicon_Labs_CP2105_Dual_USB_to_UART_Bridge_Controller_018B3A87-if00-port0"
 *  -> "Silicon Labs CP2105 Dual USB to UART Bridge Controller · S/N 018B3A87 · Interface 0"
 */
export function describeByIdName(name: string): { label: string; hint: string } {

    const m = /^usb-(.+?)-if(\d+)(?:-port\d+)?$/.exec(name);

    if (!m) {
        return { label: name, hint: "" };
    }

    const parts = m[1]!.split("_");
    const iface = Number(m[2]);

    // last token is usually the serial number (contains digits)
    let serial = "";
    if (parts.length > 1 && /\d/.test(parts[parts.length - 1]!)) {
        serial = parts.pop()!;
    }

    const product = parts.join(" ");
    let label = product;
    if (serial) label += ` · S/N ${serial}`;
    label += ` · Interface ${iface}`;

    let hint = "";
    if (/CP2105/i.test(product)) {
        hint = iface === 0
            ? "Enhanced port - CAT on Yaesu transceivers"
            : "Standard port - not used for CAT on Yaesu transceivers";
    }

    return { label, hint };

}

export function listSerialPorts(
    manager: RadioManager,
    byIdDir = "/dev/serial/by-id",
    devDir = "/dev"
): ApiResult {

    const ports: SerialPortInfo[] = [];
    const usedTargets = new Set<string>();

    const configs = manager.store.getAll();
    const inUseBy = (p: string, target: string) =>
        configs
            .filter(c => c.enabled && c.device && (c.device === p || c.device === target))
            .map(c => c.name)
            .join(", ");

    // 1. Stable names (preferred): survive replugging and reboots.
    let byId: string[] = [];
    try {
        byId = fs.readdirSync(byIdDir).sort();
    }
    catch {
        // no USB serial devices at all
    }

    for (const name of byId) {

        const full = path.join(byIdDir, name);
        let target = "";

        try {
            target = path.resolve(byIdDir, fs.readlinkSync(full));
        }
        catch {
            target = full;
        }

        usedTargets.add(target);

        const { label, hint } = describeByIdName(name);

        ports.push({
            path: full,
            label,
            target,
            hint,
            inUseBy: inUseBy(full, target),
        });

    }

    // 2. Devices without a stable name (fallback).
    let devs: string[] = [];
    try {
        devs = fs.readdirSync(devDir)
            .filter(n => /^tty(USB|ACM)\d+$/.test(n))
            .sort();
    }
    catch {
        // ignore
    }

    for (const name of devs) {

        const full = path.join(devDir, name);
        if (usedTargets.has(full)) continue;

        ports.push({
            path: full,
            label: `${name} (no stable name - may change after replugging)`,
            target: full,
            hint: "",
            inUseBy: inUseBy(full, full),
        });

    }

    return ok(ports);

}


/* ----------------------------------------------------------------------
 * Create / update / delete
 * ---------------------------------------------------------------------- */

export function createRadio(manager: RadioManager, body: unknown): ApiResult {

    try {
        const radio = manager.store.add(body);
        manager.reload();
        return { status: 201, body: radio };
    }
    catch (error) {
        return configError(error);
    }

}

export function updateRadio(manager: RadioManager, id: string, body: unknown): ApiResult {

    try {
        const radio = manager.store.update(id, body);
        manager.reload();
        return ok(radio);
    }
    catch (error) {
        return configError(error);
    }

}

export function deleteRadio(manager: RadioManager, id: string): ApiResult {

    try {
        manager.store.remove(id);
        manager.reload();
        return ok({ deleted: id });
    }
    catch (error) {
        return configError(error);
    }

}

function configError(error: unknown): ApiResult {

    if (error instanceof RadioConfigError) {
        return fail(400, error.message);
    }

    console.error("RADIO CONFIG:", error);
    return fail(500, (error as Error).message || "Internal error");

}


/* ----------------------------------------------------------------------
 * Connection test
 * ---------------------------------------------------------------------- */

export interface RadioTestResult {
    ok: boolean;
    frequency: number;
    mode: string;
    message: string;
    hint: string;
    detail: string;
}

/* Translate technical errors into something a beginner can act on. */
export function explainOpenError(error: string): string {

    if (/no such file|ENOENT/i.test(error)) {
        return "The port does not exist. Is the USB cable plugged in? " +
            "Click \"Refresh\" next to the port list after plugging in.";
    }

    if (/permission denied|EACCES/i.test(error)) {
        return "No permission for the serial port. On the Raspberry run: " +
            "sudo usermod -aG dialout $USER - then reboot.";
    }

    if (/input\/output error|EIO|enable UART/i.test(error)) {
        return "The port exists but cannot be opened. Usually the transceiver " +
            "is switched off (the USB chip is powered by USB, the radio is not). " +
            "Switch the transceiver on and test again.";
    }

    if (/busy|EBUSY|lock/i.test(error)) {
        return "The port is used by another program (e.g. WSJT-X, flrig, rigctld). " +
            "Close that program and test again.";
    }

    return "The port could not be opened.";

}

const NO_ANSWER_HINT =
    "The port is open, but the transceiver does not answer. Check: " +
    "1) transceiver switched on, " +
    "2) baud rate matches the CAT setting in the transceiver menu, " +
    "3) the right port is selected (Yaesu CP2105: Interface 0), " +
    "4) Icom: CI-V address matches.";

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

let testRunning = false;

export async function testRadio(
    manager: RadioManager,
    body: unknown,
    options: {
        timeoutMs?: number;
        create?: (config: RadioConfig) => RadioService;
    } = {}
): Promise<ApiResult> {

    const timeoutMs = options.timeoutMs ?? 6000;
    const create = options.create ?? createRadioService;

    let config: RadioConfig;

    try {
        // Uniqueness is irrelevant for a test: validate against nothing.
        const input = { name: "Test", ...(body as object) };
        config = validateRadio(input, "test", []);
    }
    catch (error) {
        return configError(error);
    }

    if (!config.device) {
        return fail(400, "Please choose a serial port");
    }

    // Only one test at a time (both would fight for the same port).
    if (testRunning) {
        return fail(409, "A connection test is already running");
    }

    testRunning = true;

    // The port may currently be held by the running service of a configured
    // transceiver: release all services, test, then restart them.
    manager.stopAll();
    await wait(300);

    let service: RadioService | undefined;

    const result: RadioTestResult = {
        ok: false, frequency: 0, mode: "", message: "", hint: "", detail: "",
    };

    try {

        service = create(config);
        service.start();

        const started = Date.now();
        let lastRequest = 0;

        while (Date.now() - started < timeoutMs) {

            await wait(200);

            const frequency = service.getFrequency();

            if (frequency > 0) {
                result.ok = true;
                result.frequency = frequency;
                result.mode = service.getMode();
                result.message =
                    `Connected - ${(frequency / 1e6).toFixed(3)} MHz` +
                    (result.mode && result.mode !== "UNKNOWN" ? ` ${result.mode}` : "");
                break;
            }

            const lastError = service.getLastError?.() ?? "";
            const connected = service.isConnected?.() ?? false;

            if (!connected && lastError) {
                result.message = "Cannot open the serial port";
                result.hint = explainOpenError(lastError);
                result.detail = lastError;
                break;
            }

            // Drivers without polling (Icom) need an explicit question.
            if (connected && service.requestStatus && Date.now() - lastRequest > 1000) {
                lastRequest = Date.now();
                service.requestStatus();
            }

        }

        if (!result.ok && !result.message) {
            const connected = service.isConnected?.() ?? false;
            result.message = connected
                ? "No answer from the transceiver"
                : "Cannot open the serial port";
            result.hint = connected ? NO_ANSWER_HINT : explainOpenError("");
        }

    }
    catch (error) {

        result.message = "Test failed";
        result.detail = (error as Error).message;

    }
    finally {

        try {
            service?.stop?.();
        }
        catch {
            // ignore
        }

        // give the OS a moment to release the port, then restart all services
        await wait(300);
        manager.reload();

        testRunning = false;

    }

    return ok(result);

}
