export class SourceStatusService {

    private lastSeen =
        new Map<string, number>();


    private registeredSources =
        new Set<string>();


    /*
     * Register a source.
     *
     * The source will immediately appear in
     * Diagnostics as "Waiting" until data arrives.
     */
    register(
        source: string
    ) {

        this.registeredSources.add(
            source
        );

    }


    /*
     * Called whenever data is received
     * from a source.
     */
    touch(
        source: string
    ) {

        /*
         * Automatically register the source
         * if it wasn't registered before.
         */
        this.registeredSources.add(
            source
        );


        this.lastSeen.set(
            source,
            Date.now()
        );

    }


    getStatus() {

        const now =
            Date.now();


        return Array.from(
            this.registeredSources
        )
        .map(
            name => {

                const time =
                    this.lastSeen.get(
                        name
                    );


                /*
                 * Source has never delivered
                 * any data since registration.
                 */
                if (
                    time === undefined
                ) {

                    return {

                        name,

                        status:
                            "Waiting",

                        lastSeen:
                            null,

                        ageSeconds:
                            null

                    };

                }


                const age =
                    now - time;


                /*
                 * Data received within
                 * the last five minutes.
                 */
                const status =
                    age < 5 * 60 * 1000
                        ? "Active"
                        : "Silent";


                return {

                    name,

                    status,

                    lastSeen:
                        time,

                    ageSeconds:
                        Math.floor(
                            age / 1000
                        )

                };

            }
        );

    }

}
