import {
    RadioService
} from "./radio.interface.js";

import {
    RgoOneService
} from "./rgo-one.service.js";

import {
    YaesuService
} from "./yaesu.service.js";

import {
    IcomService
} from "./icom.service.js";

import {
    QmxService
} from "./qmx.service.js";

import {
    radios
} from "../../config/radios.config.js";


export class RadioManager {


    private services =
        new Map<
            string,
            RadioService
        >();


    private activeRadioId: string;


    constructor() {


        const firstEnabledRadio =
            radios.find(
                radio =>
                    radio.enabled
            );


        if (
            !firstEnabledRadio
        ) {

            throw new Error(
                "No enabled radio configured"
            );

        }


        this.activeRadioId =
            firstEnabledRadio.id;


        for (
            const config of radios
        ) {


            if (
                !config.enabled
            ) {

                continue;

            }


            /*
             * A radio without a configured
             * serial device is shown in the UI,
             * but no CAT service is started.
             */

            if (
                !config.device
            ) {

                continue;

            }


            let service:
                RadioService;


            switch (
                config.protocol
            ) {


                case "rgo-one":

                    service =
                        new RgoOneService(
                            config.device,
                            config.baudRate
                        );

                    break;


                case "yaesu":

                    service =
                        new YaesuService(
                            config.device,
                            config.baudRate
                        );

                    break;


                case "icom":

                    service =
                        new IcomService(
                            config.device,
                            config.baudRate
                        );

                    break;


                case "qmx":

                    service =
                        new QmxService(
                            config.device,
                            config.baudRate
                        );

                    break;


                default:

                    throw new Error(
                        `Unknown radio protocol: ${config.protocol}`
                    );

            }


            this.services.set(
                config.id,
                service
            );

        }

    }



  start() {

    console.log(
        "RADIO MANAGER STARTING SERVICES:",
        [...this.services.keys()]
    );

    for (
        const [id, service] of
        this.services.entries()
    ) {

        console.log(
            "STARTING RADIO SERVICE:",
            id
        );

        service.start();

    }

}


    getRadio(
        id: string
    ):
        RadioService
        | undefined {

        return this.services.get(
            id
        );

    }



    getActiveRadio():
        RadioService
        | undefined {

        return this.services.get(
            this.activeRadioId
        );

    }



    getActiveRadioId():
        string {

        return this.activeRadioId;

    }



    setActiveRadio(
        id: string
    ):
        boolean {


        /*
         * The radio must exist in the
         * configuration.
         *
         * A CAT service is not required
         * yet, so radios without a configured
         * serial device can still be selected
         * in the UI.
         */

        const exists =
            radios.some(
                radio =>
                    radio.id === id &&
                    radio.enabled
            );


        if (
            !exists
        ) {

            return false;

        }


        this.activeRadioId =
            id;

        return true;

    }



    getRadios() {


        return radios
            .filter(
                config =>
                    config.enabled
            )
            .map(
                config => {


                    const service =
                        this.services.get(
                            config.id
                        );


                    return {

                        id:
                            config.id,

                        name:
                            config.name,


                        frequency:
                            service
                                ?.getFrequency()
                            ?? 0,


                        mode:
                            service
                                ?.getMode()
                            ?? "UNKNOWN",


                        power:
                            service
                                ?.getPower()
                            ?? 0,


                        /*
                         * Only true when a
                         * real CAT service exists.
                         */

                        connected:
                            service !== undefined,


                        active:
                            config.id ===
                            this.activeRadioId

                    };

                }
            );

    }

}


export const radioManager =
    new RadioManager();
