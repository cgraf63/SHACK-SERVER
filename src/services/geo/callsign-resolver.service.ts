import fs from "fs";
import path from "path";


export interface CallsignInfo {

    call: string;

    country: string;

    countryCode: string;

    continent: string;

    dxcc?: number;

}



export class CallsignResolverService {


    private database: Record<string, CallsignInfo> = {};



    constructor() {

        this.loadDatabase();

    }



    private loadDatabase(): void {


        const file =
            path.join(
                process.cwd(),
                "src/services/geo/data/callsignprefixes.csv"
            );


        if (!fs.existsSync(file)) {

            console.error(
                "DXCC CSV NOT FOUND:",
                file
            );

            return;

        }



        const data =
            fs.readFileSync(
                file,
                "utf8"
            );



        const lines =
            data.split(/\r?\n/);



        for (
            let i = 1;
            i < lines.length;
            i++
        ) {


           const line =
    lines[i]?.trim();

	            if (!line) {

        	        continue;

            }



            const parts =
    line.split(",");


const prefix =
    parts[0]?.trim().toUpperCase();


const country =
    parts[1]?.trim();


const countryCode =
    parts[3]?.trim().toLowerCase();


const continent =
    parts[4]?.trim();


if (
    !prefix ||
    !country ||
    !countryCode
) {
    continue;
}


         

        





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
		continent: continent ?? ""

            };


        }



        console.log(
            "DXCC DATABASE LOADED:",
            Object.keys(
                this.database
            ).length
        );


    }




    resolve(
        call: string
    ): CallsignInfo | null {



        const normalized =
            call
                .toUpperCase()
                .trim();

console.log(
    "DEBUG RESOLVE INPUT",
    normalized
);

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

                console.log(
    "RESOLVER HIT",
    {
        input: normalized,
        prefix,
        country: info.country,
        countryCode: info.countryCode,
        continent: info.continent
    }
);


              return {

    call: normalized,

    country: info.country,

    countryCode: info.countryCode,

    continent: info.continent

};


            }


        }



        console.log(
            "RESOLVER MISS",
            normalized
        );


        return null;


    }


}
