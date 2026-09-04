import fs from "node:fs";
import path from "node:path";
export interface CallsignInfo {

    call: string;

    country: string;

    countryCode: string;

    continent: string;
}
const prefixDatabasePath =
    path.resolve(
        process.cwd(),
        "callsignprefixes_iso_lower_ready.csv"
    );





export class CallsignResolverService {

private loadPrefixDatabase(): void {

    if (!fs.existsSync(prefixDatabasePath)) {

        return;

    }

    const content =
        fs.readFileSync(
            prefixDatabasePath,
            "utf8"
        );

    const lines =
        content
            .split(/\r?\n/)
            .slice(1);

    for (const line of lines) {

        const columns =
            line.split(",");

        if (columns.length < 4) {

            continue;

        }

        const prefix =
            columns[0]?.trim()
                .toUpperCase() || "";

        const country =
            columns[1]?.trim() || "";

        const countryCode =
            columns[3]?.trim()
                .toLowerCase() || "";

        if (
            !prefix ||
            !countryCode
        ) {

            continue;

        }

        this.database[prefix] = {

            call: "",

            country,

            countryCode,

            continent: ""

        };

    }

}

    private database: Record<string, CallsignInfo> = {


        "HB": {
            call: "",
            country: "Switzerland",
            countryCode: "ch",
            continent: "EU"
        },


        "DL": {
            call: "",
            country: "Germany",
            countryCode: "de",
            continent: "EU"
        },


        "F": {
            call: "",
            country: "France",
            countryCode: "fr",
            continent: "EU"
        },


        "G": {
            call: "",
            country: "United Kingdom",
            countryCode: "gb",
            continent: "EU"
        },


        "I": {
            call: "",
            country: "Italy",
            countryCode: "it",
            continent: "EU"
        },


        "K": {
            call: "",
            country: "United States",
            countryCode: "us",
            continent: "NA"
        },


        "N": {
            call: "",
            country: "United States",
            countryCode: "us",
            continent: "NA"
        },


        "W": {
            call: "",
            country: "United States",
            countryCode: "us",
            continent: "NA"
        },


        "VE": {
            call: "",
            country: "Canada",
            countryCode: "ca",
            continent: "NA"
        },


        "JA": {
            call: "",
            country: "Japan",
            countryCode: "jp",
            continent: "AS"
        },


        "VK": {
            call: "",
            country: "Australia",
            countryCode: "au",
            continent: "OC"
        }

    };

    constructor() {

        this.loadPrefixDatabase();

    }

    resolve(
        call: string
    ): CallsignInfo | null {


        const normalized =
            call
                .toUpperCase()
                .trim();



        const prefixes =
            Object.keys(
                this.database
            )
            .sort(
                (a, b) =>
                    b.length - a.length
            );



        for (
            const prefix of prefixes
        ) {


            if (
                normalized.startsWith(
                    prefix
                )
            ) {


                const info =
                    this.database[prefix];


                if (!info) {

                    continue;

                }


                return {

                    call: normalized,

                    country: info.country,

                    countryCode: info.countryCode,

                    continent: info.continent

                };

            }

        }



        return null;

    }

}
