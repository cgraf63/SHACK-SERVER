export interface CallsignInfo {

    call: string;

    country: string;

    countryCode: string;

    continent: string;

}



export class CallsignResolverService {


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
