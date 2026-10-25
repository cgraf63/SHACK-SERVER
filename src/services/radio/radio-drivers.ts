import type { RadioConfig } from "../../config/radios.config.js";
import type { RadioService } from "./radio.interface.js";

import { Ftdx10Service } from "./ftdx10.service.js";
import { Ftx1Service } from "./ftx-1.service.js";
import { RgoOneService } from "./rgo-one.service.js";
import { IcomService } from "./icom.service.js";
import { QmxService } from "./qmx.service.js";

/*
 * Driver registry
 *
 * One entry per CAT protocol. Used by
 *   - the RadioManager to create the service for a configured transceiver
 *   - the transceiver settings page (driver list, default baud rate,
 *     hints which menu setting on the transceiver must match)
 *
 * Adding a driver = add one entry here. No switch statement elsewhere.
 */

export interface RadioDriverInfo {

    /* Value stored in RadioConfig.protocol */
    protocol: RadioConfig["protocol"];

    /* Shown in the driver dropdown */
    label: string;

    /* Transceivers this driver is meant for */
    models: string;

    defaultBaudRate: number;

    baudRates: number[];

    /* Short hint for the user: what must be set on the transceiver */
    hint: string;

    /* Driver needs a CI-V address (Icom) */
    needsCivAddress?: boolean;

    defaultCivAddress?: number;

}

interface RadioDriver extends RadioDriverInfo {
    create(config: RadioConfig): RadioService;
}


const YAESU_BAUD = [4800, 9600, 19200, 38400, 115200];

const DRIVERS: RadioDriver[] = [

    {
        protocol: "ftdx10",
        label: "Yaesu FTDX10",
        models: "FTDX10",
        defaultBaudRate: 38400,
        baudRates: YAESU_BAUD,
        hint:
            "The CAT RATE setting in the FTDX10 menu must match the baud rate " +
            "(default 38400). Use the CP2105 port ending in \"if00\" (Enhanced COM port).",
        create: c => new Ftdx10Service(c.device, c.baudRate),
    },

    {
        protocol: "ftx-1",
        label: "Yaesu FTX-1",
        models: "FTX-1 Field / Optima",
        defaultBaudRate: 38400,
        baudRates: YAESU_BAUD,
        hint:
            "FTX-1 menu CAT RATE must match the baud rate (default 38400). " +
            "Use the CP2105 port ending in \"if00\".",
        create: c => new Ftx1Service(c.device, c.baudRate),
    },

    {
        protocol: "rgo-one",
        label: "RGO-One",
        models: "RGO-One",
        defaultBaudRate: 9600,
        baudRates: [9600, 19200, 38400, 57600, 115200],
        hint: "USB connection to the RGO-One (STM32 Virtual ComPort).",
        create: c => new RgoOneService(c.device, c.baudRate),
    },

    {
        protocol: "icom",
        label: "Icom CI-V",
        models: "IC-705, IC-7300, IC-7610, IC-9700, …",
        defaultBaudRate: 115200,
        baudRates: [4800, 9600, 19200, 38400, 57600, 115200],
        hint:
            "Transceiver menu: CI-V USB baud rate and CI-V address must match " +
            "(IC-705 default A4, IC-7300 94, IC-7610 98, IC-9700 A2).",
        needsCivAddress: true,
        defaultCivAddress: 0xA4,
        create: c => new IcomService(
            c.device,
            c.baudRate,
            c.civAddress ?? 0xA4,
            c.connection ?? "serial",
            c.host ?? "",
            c.port ?? 50002
        ),
    },

    {
        protocol: "qmx",
        label: "QRP Labs QMX / QMX+",
        models: "QMX, QMX+",
        defaultBaudRate: 115200,
        baudRates: [9600, 19200, 38400, 57600, 115200],
        hint: "USB connection to the QMX (virtual COM port).",
        create: c => new QmxService(c.device, c.baudRate),
    },

];


export function getRadioDrivers(): RadioDriverInfo[] {

    return DRIVERS.map(driver => {
        const { create: _create, ...info } = driver;
        return info;
    });

}

export function isKnownProtocol(protocol: string): boolean {

    return DRIVERS.some(d => d.protocol === protocol);

}

export function getRadioDriver(protocol: string): RadioDriverInfo | undefined {

    return getRadioDrivers().find(d => d.protocol === protocol);

}

/* Create the CAT service for a configuration. Throws for unknown protocols. */
export function createRadioService(config: RadioConfig): RadioService {

    const driver = DRIVERS.find(d => d.protocol === config.protocol);

    if (!driver) {
        throw new Error(`Unknown radio protocol: ${config.protocol}`);
    }

    return driver.create(config);

}
