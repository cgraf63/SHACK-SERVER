import {
    RadioService
} from "./radio.interface.js";

import {
    createRadioService
} from "./radio-drivers.js";

import {
    RadioConfigStore
} from "./radio-config.store.js";


/*
 * RadioManager
 *
 * Owns one CAT service per enabled transceiver that has a serial device.
 * The configuration comes from data/radios.json (RadioConfigStore) and can
 * be changed at runtime: reload() stops all services and starts them again
 * with the new configuration - no server restart needed.
 *
 * The public methods used by routes/radio.ts are unchanged.
 */
export class RadioManager {


    private services =
        new Map<
            string,
            RadioService
        >();

    private started = false;


    constructor(
        readonly store: RadioConfigStore = new RadioConfigStore()
    ) {

        this.createServices();

    }


    /* ------------------------------------------------------------------
     * Lifecycle
     * ------------------------------------------------------------------ */

    start(): void {

        this.started = true;

        console.log(
            "RADIO MANAGER STARTING SERVICES:",
            [...this.services.keys()]
        );

        for (const [id, service] of this.services.entries()) {

            console.log(
                "STARTING RADIO SERVICE:",
                id
            );

            service.start();

        }

    }

    /*
     * Apply a changed configuration: stop every service, recreate them
     * from the store and start them again (if the manager was started).
     */
    reload(): void {

        this.stopAll();
        this.createServices();

        if (this.started) {
            this.start();
        }

    }

    /* Stop all services (no reconnect). */
    stopAll(): void {

        for (const [id, service] of this.services.entries()) {

            try {
                service.stop?.();
            }
            catch (error) {
                console.error(
                    "RADIO MANAGER: stopping",
                    id,
                    "failed:",
                    (error as Error).message
                );
            }

        }

        this.services.clear();

    }


    /* ------------------------------------------------------------------
     * Access (unchanged API)
     * ------------------------------------------------------------------ */

    getRadio(
        id: string
    ): RadioService | undefined {

        return this.services.get(id);

    }

    getActiveRadio(): RadioService | undefined {

        return this.services.get(
            this.store.getActiveRadioId()
        );

    }

    getActiveRadioId(): string {

        return this.store.getActiveRadioId();

    }

    /*
     * Select the active transceiver. Saved in data/radios.json,
     * so the selection survives a restart.
     *
     * A CAT service is not required, so radios without a configured
     * serial device can still be selected in the UI.
     */
    setActiveRadio(
        id: string
    ): boolean {

        return this.store.setActiveRadioId(id);

    }

    getRadios() {

        const activeRadioId =
            this.store.getActiveRadioId();

        return this.store
            .getAll()
            .filter(config => config.enabled)
            .map(config => {

                const service =
                    this.services.get(config.id);

                return {

                    id:
                        config.id,

                    name:
                        config.name,

                    /* Driver, e.g. "ftdx10" (dashboard: remote button). */
                    protocol:
                        config.protocol,

                    frequency:
                        service?.getFrequency() ?? 0,

                    mode:
                        service?.getMode() ?? "UNKNOWN",

                    power:
                        service?.getPower() ?? 0,

                    /*
                     * Only true when a real CAT service exists
                     * (unchanged meaning, used by the dashboard).
                     */
                    connected:
                        service !== undefined,

                    /* Serial port really open. */
                    catOpen:
                        service?.isConnected?.() ?? false,

                    active:
                        config.id === activeRadioId

                };

            });

    }


    /* ------------------------------------------------------------------
     * Internals
     * ------------------------------------------------------------------ */

    private createServices(): void {

        for (const config of this.store.getAll()) {

            if (!config.enabled) {
                continue;
            }

            /*
             * A radio without a configured serial device is shown
             * in the UI, but no CAT service is started.
             * Exception: network connections (existing rigctld) have
             * no serial device of their own.
             */
            if (!config.device && config.connection !== "network") {
                continue;
            }

            try {

                this.services.set(
                    config.id,
                    createRadioService(config)
                );

            }
            catch (error) {

                // One bad entry must not stop the other transceivers.
                console.error(
                    "RADIO MANAGER: cannot create service for",
                    config.id,
                    (error as Error).message
                );

            }

        }

    }

}


export const radioManager =
    new RadioManager();
