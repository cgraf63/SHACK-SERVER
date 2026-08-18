export type SystemLogLevel =
    | "ERROR"
    | "WARN"
    | "INFO";


export interface SystemLogEntry {

    timestamp: number;

    source: string;

    level: SystemLogLevel;

    component: string;

    message: string;

}


class SystemLogService {

    private readonly maxEntries = 100;

    private entries: SystemLogEntry[] = [];


    add(
        source: string,
        level: SystemLogLevel,
        component: string,
        message: string
    ): void {

        this.entries.unshift({

            timestamp:
                Date.now(),

            source,

            level,

            component,

            message

        });


        if (
            this.entries.length >
            this.maxEntries
        ) {

            this.entries =
                this.entries.slice(
                    0,
                    this.maxEntries
                );

        }

    }


    error(
        source: string,
        component: string,
        message: string
    ): void {

        this.add(
            source,
            "ERROR",
            component,
            message
        );

    }


    warn(
        source: string,
        component: string,
        message: string
    ): void {

        this.add(
            source,
            "WARN",
            component,
            message
        );

    }


    info(
        source: string,
        component: string,
        message: string
    ): void {

        this.add(
            source,
            "INFO",
            component,
            message
        );

    }


    getLast(
        count = 20
    ): SystemLogEntry[] {

        return this.entries
            .slice(
                0,
                Math.max(0, count)
            );

    }

}


export const systemLog =
    new SystemLogService();
