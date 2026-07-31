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
        ([name,time]) => ({

            name,

            status:
                Date.now() - time < 300000
                ? "Active"
                : "No data"

        })
    );

}
}
