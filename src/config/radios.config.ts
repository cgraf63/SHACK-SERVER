export interface RadioConfig {

    id: string;

    name: string;

    protocol:
        | "rgo-one"
        | "yaesu"
        | "icom";

    device: string;

    baudRate: number;

    enabled: boolean;

}


export const radios:
    RadioConfig[] = [

    {

        id: "rgo-one",

        name: "RGO ONE",

        protocol: "rgo-one",

        device: "/dev/serial/by-id/usb-STMicroelectronics_STM32_Virtual_ComPort_207335B95832-if00",

        baudRate: 9600,

        enabled: true

    },


    {

        id: "ftdx10",

        name: "YAESU FTDX10",

        protocol: "yaesu",

        device: "",

        baudRate: 38400,

        enabled: true

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
