export class SourceStatusService {

    private lastSeen =
        new Map<string, number>();


    touch(
        source: string
    ) {

        this.lastSeen.set(
            source,
            Date.now()
        );

    }


    getStatus() {

        return Array.from(
            this.lastSeen.entries()
        )
        .map(
            ([name, time]) => {

                const age =
                    Date.now() - time;


                return {

                    name,

                    status:
                        age < 300000
                        ? "Active"
                        : "No data",

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
