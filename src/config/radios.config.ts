export interface RadioConfig {

    id: string;

    name: string;

    protocol:
        | "rgo-one"
        | "ftx-1"
        | "ftdx10"
        | "icom"
        | "qmx"
        | "hamlib"
        | "demo";

    device: string;

    baudRate: number;

    /*
     * Radio transport.
     *
     * Serial is the current/default transport.
     * Network is prepared for Icom IP remote.
     */
    connection?:
        | "serial"
        | "network";

    /*
     * Network parameters.
     *
     * Currently used as configuration only.
     * The Icom IP transport is not implemented yet.
     */
    host?: string;

    port?: number;

    /*
     * Icom CI-V address of the transceiver (e.g. 0xA4 = IC-705).
     * Only used by protocol "icom". Default: 0xA4.
     */
    civAddress?: number;

    /*
     * Hamlib rig model number (rigctl -l), only for protocol "hamlib".
     * connection "serial":  SHACK-SERVER starts its own rigctld on device
     * connection "network": use an existing rigctld at host:port
     */
    hamlibModel?: number;

    enabled: boolean;

}


/*
 * Initial transceiver list.
 *
 * Since the transceiver settings page exists, the configuration lives in
 * data/radios.json and is edited in the web interface.
 * This list is only used ONCE: when data/radios.json does not exist yet,
 * it is created from these entries (so an existing installation keeps
 * its transceivers). Later changes here have no effect.
 */
export const radios:
    RadioConfig[] = [


    {

        id: "ftdx10",

        name: "YAESU FTDX10",

        protocol: "ftdx10",

	device: "/dev/serial/by-id/usb-Silicon_Labs_CP2105_Dual_USB_to_UART_Bridge_Controller_018B3A87-if00-port0",
        baudRate: 38400,

        enabled: true

    },


    {
        id: "rgo-one",
        name: "RGO ONE",
        protocol: "rgo-one",
        device: "/dev/serial/by-id/usb-STMicroelectronics_STM32_Virtual_ComPort_207335B95832-if00",
        baudRate: 9600,
        enabled: true
    },

    {
        id: "ftx-1",

        name: "YAESU FTX-1",

        protocol: "ftx-1",

        device: "/dev/serial/by-id/usb-Silicon_Labs_CP2105_Dual_USB_to_UART_Bridge_Controller_01D1A32D-if00-port0",

        baudRate: 38400,

        enabled: true

    },


    {
        id: "qmx-plus",

        name: "QRP Labs QMX+",

        protocol: "qmx",

        device: "",

        baudRate: 115200,

        enabled: false

    },


    {
        id: "icom-705",

        name: "ICOM IC-705",

        protocol: "icom",

        device: "",

        baudRate: 115200,

        enabled: false

    }

];
