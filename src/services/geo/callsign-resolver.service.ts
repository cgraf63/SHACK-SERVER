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


        "LU": {
            call: "",
            country: "Argentina",
            countryCode: "ar",
            continent: "SA"
        },


        "LW": {
            call: "",
            country: "Argentina",
            countryCode: "ar",
            continent: "SA"
        },


        "TI": {
            call: "",
            country: "Costa Rica",
            countryCode: "cr",
            continent: "NA"
        },


        "J6": {
            call: "",
            country: "St Lucia",
            countryCode: "lc",
            continent: "NA"
        },


        "TN": {
            call: "",
            country: "Congo",
            countryCode: "cg",
            continent: "AF"
        },


        "TL": {
            call: "",
            country: "Central African Republic",
            countryCode: "cf",
            continent: "AF"
        },


        "V4": {
            call: "",
            country: "St Kitts and Nevis",
            countryCode: "kn",
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
,

    
        "2E": {
            call: "",
            country: "England",
            countryCode: "gb",
            continent: "EU"
        },
        "3A": {
            call: "",
            country: "Monaco",
            countryCode: "mc",
            continent: "EU"
        },
        "3B": {
            call: "",
            country: "Mauritius",
            countryCode: "mu",
            continent: "AF"
        },
        "3D": {
            call: "",
            country: "Fiji",
            countryCode: "fj",
            continent: "OC"
        },
        "3G": {
            call: "",
            country: "Chile",
            countryCode: "cl",
            continent: "SA"
        },
        "3H": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "3I": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "3J": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "3K": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "3L": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "3M": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "3V": {
            call: "",
            country: "Tunisia",
            countryCode: "tn",
            continent: "AF"
        },
        "3W": {
            call: "",
            country: "Vietnam",
            countryCode: "vn",
            continent: "AS"
        },
        "3Z": {
            call: "",
            country: "Poland",
            countryCode: "pl",
            continent: "EU"
        },
        "4A": {
            call: "",
            country: "Mexico",
            countryCode: "mx",
            continent: "NA"
        },
        "4B": {
            call: "",
            country: "Mexico",
            countryCode: "mx",
            continent: "NA"
        },
        "4C": {
            call: "",
            country: "Mexico",
            countryCode: "mx",
            continent: "NA"
        },
        "4D": {
            call: "",
            country: "Philippines",
            countryCode: "ph",
            continent: "AS"
        },
        "4E": {
            call: "",
            country: "Philippines",
            countryCode: "ph",
            continent: "AS"
        },
        "4F": {
            call: "",
            country: "Philippines",
            countryCode: "ph",
            continent: "AS"
        },
        "4G": {
            call: "",
            country: "Philippines",
            countryCode: "ph",
            continent: "AS"
        },
        "4H": {
            call: "",
            country: "Philippines",
            countryCode: "ph",
            continent: "AS"
        },
        "4I": {
            call: "",
            country: "Philippines",
            countryCode: "ph",
            continent: "AS"
        },
        "4J": {
            call: "",
            country: "Azerbaijan",
            countryCode: "az",
            continent: "AS"
        },
        "4K": {
            call: "",
            country: "Azerbaijan",
            countryCode: "az",
            continent: "AS"
        },
        "4L": {
            call: "",
            country: "Georgia",
            countryCode: "ge",
            continent: "AS"
        },
        "4M": {
            call: "",
            country: "Venezuela",
            countryCode: "ve",
            continent: "SA"
        },
        "4O": {
            call: "",
            country: "Montenegro",
            countryCode: "me",
            continent: "EU"
        },
        "4S": {
            call: "",
            country: "Sri Lanka",
            countryCode: "lk",
            continent: "AS"
        },
        "4T": {
            call: "",
            country: "Peru",
            countryCode: "pe",
            continent: "SA"
        },
        "4X": {
            call: "",
            country: "Israel",
            countryCode: "il",
            continent: "AS"
        },
        "4Z": {
            call: "",
            country: "Israel",
            countryCode: "il",
            continent: "AS"
        },
        "5B": {
            call: "",
            country: "Cyprus",
            countryCode: "cy",
            continent: "EU"
        },
        "5C": {
            call: "",
            country: "Morocco",
            countryCode: "ma",
            continent: "AF"
        },
        "5D": {
            call: "",
            country: "Morocco",
            countryCode: "ma",
            continent: "AF"
        },
        "5E": {
            call: "",
            country: "Morocco",
            countryCode: "ma",
            continent: "AF"
        },
        "5F": {
            call: "",
            country: "Morocco",
            countryCode: "ma",
            continent: "AF"
        },
        "5G": {
            call: "",
            country: "Morocco",
            countryCode: "ma",
            continent: "AF"
        },
        "5H": {
            call: "",
            country: "Tanzania",
            countryCode: "tz",
            continent: "AF"
        },
        "5I": {
            call: "",
            country: "Tanzania",
            countryCode: "tz",
            continent: "AF"
        },
        "5J": {
            call: "",
            country: "Colombia",
            countryCode: "co",
            continent: "SA"
        },
        "5K": {
            call: "",
            country: "Colombia",
            countryCode: "co",
            continent: "SA"
        },
        "5N": {
            call: "",
            country: "Nigeria",
            countryCode: "ng",
            continent: "AF"
        },
        "5P": {
            call: "",
            country: "Denmark",
            countryCode: "dk",
            continent: "EU"
        },
        "5Q": {
            call: "",
            country: "Denmark",
            countryCode: "dk",
            continent: "EU"
        },
        "5R": {
            call: "",
            country: "Madagascar",
            countryCode: "mg",
            continent: "AF"
        },
        "5W": {
            call: "",
            country: "Samoa",
            countryCode: "ws",
            continent: "OC"
        },
        "5X": {
            call: "",
            country: "Uganda",
            countryCode: "ug",
            continent: "AF"
        },
        "5Z": {
            call: "",
            country: "Kenya",
            countryCode: "ke",
            continent: "AF"
        },
        "6D": {
            call: "",
            country: "Mexico",
            countryCode: "mx",
            continent: "NA"
        },
        "6E": {
            call: "",
            country: "Mexico",
            countryCode: "mx",
            continent: "NA"
        },
        "6F": {
            call: "",
            country: "Mexico",
            countryCode: "mx",
            continent: "NA"
        },
        "6G": {
            call: "",
            country: "Mexico",
            countryCode: "mx",
            continent: "NA"
        },
        "6H": {
            call: "",
            country: "Mexico",
            countryCode: "mx",
            continent: "NA"
        },
        "6I": {
            call: "",
            country: "Mexico",
            countryCode: "mx",
            continent: "NA"
        },
        "6J": {
            call: "",
            country: "Mexico",
            countryCode: "mx",
            continent: "NA"
        },
        "6K": {
            call: "",
            country: "South Korea",
            countryCode: "kr",
            continent: "AS"
        },
        "6L": {
            call: "",
            country: "South Korea",
            countryCode: "kr",
            continent: "AS"
        },
        "6M": {
            call: "",
            country: "South Korea",
            countryCode: "kr",
            continent: "AS"
        },
        "6N": {
            call: "",
            country: "South Korea",
            countryCode: "kr",
            continent: "AS"
        },
        "6P": {
            call: "",
            country: "Pakistan",
            countryCode: "pk",
            continent: "AS"
        },
        "6Q": {
            call: "",
            country: "Pakistan",
            countryCode: "pk",
            continent: "AS"
        },
        "6R": {
            call: "",
            country: "Pakistan",
            countryCode: "pk",
            continent: "AS"
        },
        "6S": {
            call: "",
            country: "Pakistan",
            countryCode: "pk",
            continent: "AS"
        },
        "6X": {
            call: "",
            country: "Madagascar",
            countryCode: "mg",
            continent: "AF"
        },
        "7A": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "7B": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "7C": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "7D": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "7E": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "7F": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "7G": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "7H": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "7I": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "7J": {
            call: "",
            country: "Japan",
            countryCode: "ja",
            continent: "AS"
        },
        "7K": {
            call: "",
            country: "Japan",
            countryCode: "ja",
            continent: "AS"
        },
        "7L": {
            call: "",
            country: "Japan",
            countryCode: "ja",
            continent: "AS"
        },
        "7M": {
            call: "",
            country: "Japan",
            countryCode: "ja",
            continent: "AS"
        },
        "7N": {
            call: "",
            country: "Japan",
            countryCode: "ja",
            continent: "AS"
        },
        "7S": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "7X": {
            call: "",
            country: "Algeria",
            countryCode: "dz",
            continent: "AF"
        },
        "7Z": {
            call: "",
            country: "Saudi Arabia",
            countryCode: "sa",
            continent: "AS"
        },
        "8J": {
            call: "",
            country: "Japan",
            countryCode: "ja",
            continent: "AS"
        },
        "8N": {
            call: "",
            country: "Japan",
            countryCode: "ja",
            continent: "AS"
        },
        "8P": {
            call: "",
            country: "Barbados",
            countryCode: "bb",
            continent: "NA"
        },
        "8S": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "8T": {
            call: "",
            country: "India",
            countryCode: "in",
            continent: "AS"
        },
        "8U": {
            call: "",
            country: "India",
            countryCode: "in",
            continent: "AS"
        },
        "8V": {
            call: "",
            country: "India",
            countryCode: "in",
            continent: "AS"
        },
        "8W": {
            call: "",
            country: "India",
            countryCode: "in",
            continent: "AS"
        },
        "8X": {
            call: "",
            country: "India",
            countryCode: "in",
            continent: "AS"
        },
        "8Z": {
            call: "",
            country: "Saudi Arabia",
            countryCode: "sa",
            continent: "AS"
        },
        "9A": {
            call: "",
            country: "Croatia",
            countryCode: "hr",
            continent: "EU"
        },
        "9E": {
            call: "",
            country: "Ethiopia",
            countryCode: "et",
            continent: "AF"
        },
        "9F": {
            call: "",
            country: "Ethiopia",
            countryCode: "et",
            continent: "AF"
        },
        "9G": {
            call: "",
            country: "Ghana",
            countryCode: "gh",
            continent: "AF"
        },
        "9H": {
            call: "",
            country: "Malta",
            countryCode: "mt",
            continent: "EU"
        },
        "9J": {
            call: "",
            country: "Zambia",
            countryCode: "zm",
            continent: "AF"
        },
        "9K": {
            call: "",
            country: "Kuwait",
            countryCode: "kw",
            continent: "AS"
        },
        "9M": {
            call: "",
            country: "Malaysia",
            countryCode: "my",
            continent: "AS"
        },
        "9V": {
            call: "",
            country: "Singapore",
            countryCode: "sg",
            continent: "AS"
        },
        "9W": {
            call: "",
            country: "Malaysia",
            countryCode: "my",
            continent: "AS"
        },
        "9X": {
            call: "",
            country: "Rwanda",
            countryCode: "rw",
            continent: "AF"
        },
        "9Y": {
            call: "",
            country: "Trinidad and Tobago",
            countryCode: "tt",
            continent: "NA"
        },
        "9Z": {
            call: "",
            country: "Trinidad and Tobago",
            countryCode: "tt",
            continent: "NA"
        },
        "A2": {
            call: "",
            country: "Botswana",
            countryCode: "bw",
            continent: "AF"
        },
        "A3": {
            call: "",
            country: "Tonga",
            countryCode: "to",
            continent: "OC"
        },
        "A4": {
            call: "",
            country: "Oman",
            countryCode: "om",
            continent: "AS"
        },
        "A5": {
            call: "",
            country: "Bhutan",
            countryCode: "bt",
            continent: "AS"
        },
        "A6": {
            call: "",
            country: "United Arab Emirates",
            countryCode: "ae",
            continent: "AS"
        },
        "A7": {
            call: "",
            country: "Qatar",
            countryCode: "qa",
            continent: "AS"
        },
        "A9": {
            call: "",
            country: "Bahrain",
            countryCode: "bh",
            continent: "AS"
        },
        "AL": {
            call: "",
            country: "Alaska",
            countryCode: "us",
            continent: "NA"
        },
        "AP": {
            call: "",
            country: "Pakistan",
            countryCode: "pk",
            continent: "AS"
        },
        "AS": {
            call: "",
            country: "Pakistan",
            countryCode: "pk",
            continent: "AS"
        },
        "AT": {
            call: "",
            country: "India",
            countryCode: "in",
            continent: "AS"
        },
        "AX": {
            call: "",
            country: "Australia",
            countryCode: "au",
            continent: "OC"
        },
        "AY": {
            call: "",
            country: "Australia",
            countryCode: "au",
            continent: "OC"
        },
        "AZ": {
            call: "",
            country: "Argentina",
            countryCode: "ar",
            continent: "SA"
        },
        "BA": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "BD": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "BG": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "BH": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "BI": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "BJ": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "BL": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "BM": {
            call: "",
            country: "Taiwan",
            countryCode: "tw",
            continent: "AS"
        },
        "BN": {
            call: "",
            country: "Taiwan",
            countryCode: "tw",
            continent: "AS"
        },
        "BO": {
            call: "",
            country: "Taiwan",
            countryCode: "tw",
            continent: "AS"
        },
        "BP": {
            call: "",
            country: "Taiwan",
            countryCode: "tw",
            continent: "AS"
        },
        "BQ": {
            call: "",
            country: "Taiwan",
            countryCode: "tw",
            continent: "AS"
        },
        "BR": {
            call: "",
            country: "Taiwan",
            countryCode: "tw",
            continent: "AS"
        },
        "BS": {
            call: "",
            country: "Taiwan",
            countryCode: "tw",
            continent: "AS"
        },
        "BT": {
            call: "",
            country: "Taiwan",
            countryCode: "tw",
            continent: "AS"
        },
        "BU": {
            call: "",
            country: "Taiwan",
            countryCode: "tw",
            continent: "AS"
        },
        "BV": {
            call: "",
            country: "Taiwan",
            countryCode: "tw",
            continent: "AS"
        },
        "BW": {
            call: "",
            country: "Taiwan",
            countryCode: "tw",
            continent: "AS"
        },
        "BX": {
            call: "",
            country: "Taiwan",
            countryCode: "tw",
            continent: "AS"
        },
        "BY": {
            call: "",
            country: "China",
            countryCode: "cn",
            continent: "AS"
        },
        "C3": {
            call: "",
            country: "Andorra",
            countryCode: "ad",
            continent: "EU"
        },
        "C4": {
            call: "",
            country: "Cyprus",
            countryCode: "cy",
            continent: "EU"
        },
        "CA": {
            call: "",
            country: "Chile",
            countryCode: "cl",
            continent: "SA"
        },
        "CB": {
            call: "",
            country: "Chile",
            countryCode: "cl",
            continent: "SA"
        },
        "CC": {
            call: "",
            country: "Chile",
            countryCode: "cl",
            continent: "SA"
        },
        "CD": {
            call: "",
            country: "Chile",
            countryCode: "cl",
            continent: "SA"
        },
        "CE": {
            call: "",
            country: "Chile",
            countryCode: "cl",
            continent: "SA"
        },
        "CN": {
            call: "",
            country: "Morocco",
            countryCode: "ma",
            continent: "AF"
        },
        "CP": {
            call: "",
            country: "Bolivia",
            countryCode: "bo",
            continent: "SA"
        },
        "CQ": {
            call: "",
            country: "Portugal",
            countryCode: "pt",
            continent: "EU"
        },
        "CR": {
            call: "",
            country: "Portugal",
            countryCode: "pt",
            continent: "EU"
        },
        "CS": {
            call: "",
            country: "Portugal",
            countryCode: "pt",
            continent: "EU"
        },
        "CT": {
            call: "",
            country: "Portugal",
            countryCode: "pt",
            continent: "EU"
        },
        "CX": {
            call: "",
            country: "Uruguay",
            countryCode: "uy",
            continent: "SA"
        },
        "DS": {
            call: "",
            country: "South Korea",
            countryCode: "kr",
            continent: "AS"
        },
        "DT": {
            call: "",
            country: "South Korea",
            countryCode: "kr",
            continent: "AS"
        },
        "DU": {
            call: "",
            country: "Philippines",
            countryCode: "ph",
            continent: "AS"
        },
        "DV": {
            call: "",
            country: "Philippines",
            countryCode: "ph",
            continent: "AS"
        },
        "DW": {
            call: "",
            country: "Philippines",
            countryCode: "ph",
            continent: "AS"
        },
        "DX": {
            call: "",
            country: "Philippines",
            countryCode: "ph",
            continent: "AS"
        },
        "DY": {
            call: "",
            country: "Philippines",
            countryCode: "ph",
            continent: "AS"
        },
        "DZ": {
            call: "",
            country: "Philippines",
            countryCode: "ph",
            continent: "AS"
        },
        "E2": {
            call: "",
            country: "Thailand",
            countryCode: "th",
            continent: "AS"
        },
        "E5": {
            call: "",
            country: "South Cook Islands",
            countryCode: "ck",
            continent: "OC"
        },
        "E7": {
            call: "",
            country: "Bosnia-Herzegovina",
            countryCode: "ba",
            continent: "EU"
        },
        "EA": {
            call: "",
            country: "Spain",
            countryCode: "es",
            continent: "EU"
        },
        "EB": {
            call: "",
            country: "Spain",
            countryCode: "es",
            continent: "EU"
        },
        "EC": {
            call: "",
            country: "Spain",
            countryCode: "es",
            continent: "EU"
        },
        "ED": {
            call: "",
            country: "Spain",
            countryCode: "es",
            continent: "EU"
        },
        "EE": {
            call: "",
            country: "Spain",
            countryCode: "es",
            continent: "EU"
        },
        "EF": {
            call: "",
            country: "Spain",
            countryCode: "es",
            continent: "EU"
        },
        "EG": {
            call: "",
            country: "Spain",
            countryCode: "es",
            continent: "EU"
        },
        "EH": {
            call: "",
            country: "Spain",
            countryCode: "es",
            continent: "EU"
        },
        "EI": {
            call: "",
            country: "Ireland",
            countryCode: "ie",
            continent: "EU"
        },
        "EJ": {
            call: "",
            country: "Ireland",
            countryCode: "ie",
            continent: "EU"
        },
        "EK": {
            call: "",
            country: "Armenia",
            countryCode: "am",
            continent: "AS"
        },
        "EL": {
            call: "",
            country: "Liberia",
            countryCode: "lr",
            continent: "AF"
        },
        "EM": {
            call: "",
            country: "Ukraine",
            countryCode: "ua",
            continent: "EU"
        },
        "EN": {
            call: "",
            country: "Ukraine",
            countryCode: "ua",
            continent: "EU"
        },
        "EO": {
            call: "",
            country: "Ukraine",
            countryCode: "ua",
            continent: "EU"
        },
        "EP": {
            call: "",
            country: "Iran",
            countryCode: "ir",
            continent: "AS"
        },
        "EQ": {
            call: "",
            country: "Iran",
            countryCode: "ir",
            continent: "AS"
        },
        "ES": {
            call: "",
            country: "Estonia",
            countryCode: "ee",
            continent: "EU"
        },
        "ET": {
            call: "",
            country: "Ethiopia",
            countryCode: "et",
            continent: "AF"
        },
        "EU": {
            call: "",
            country: "Belarus",
            countryCode: "by",
            continent: "EU"
        },
        "EV": {
            call: "",
            country: "Belarus",
            countryCode: "by",
            continent: "EU"
        },
        "EW": {
            call: "",
            country: "Belarus",
            countryCode: "by",
            continent: "EU"
        },
        "EX": {
            call: "",
            country: "Kyrgyzstan",
            countryCode: "kg",
            continent: "AS"
        },
        "FK": {
            call: "",
            country: "New Caledonia",
            countryCode: "nc",
            continent: "OC"
        },
        "FO": {
            call: "",
            country: "French Polynesia",
            countryCode: "pf",
            continent: "OC"
        },
        "GD": {
            call: "",
            country: "Isle of Man",
            countryCode: "im",
            continent: "EU"
        },
        "GI": {
            call: "",
            country: "Northern Ireland",
            countryCode: "gb",
            continent: "EU"
        },
        "GJ": {
            call: "",
            country: "Jersey",
            countryCode: "je",
            continent: "EU"
        },
        "GM": {
            call: "",
            country: "Scotland",
            countryCode: "gb",
            continent: "EU"
        },
        "GU": {
            call: "",
            country: "Guernsey",
            countryCode: "gg",
            continent: "EU"
        },
        "GW": {
            call: "",
            country: "Wales",
            countryCode: "gb",
            continent: "EU"
        },
        "HA": {
            call: "",
            country: "Hungary",
            countryCode: "hu",
            continent: "EU"
        },
        "HC": {
            call: "",
            country: "Ecuador",
            countryCode: "ec",
            continent: "SA"
        },
        "HD": {
            call: "",
            country: "Ecuador",
            countryCode: "ec",
            continent: "SA"
        },
        "HF": {
            call: "",
            country: "Poland",
            countryCode: "pl",
            continent: "EU"
        },
        "HG": {
            call: "",
            country: "Hungary",
            countryCode: "hu",
            continent: "EU"
        },
        "HJ": {
            call: "",
            country: "Colombia",
            countryCode: "co",
            continent: "SA"
        },
        "HK": {
            call: "",
            country: "Colombia",
            countryCode: "co",
            continent: "SA"
        },
        "HL": {
            call: "",
            country: "South Korea",
            countryCode: "kr",
            continent: "AS"
        },
        "HS": {
            call: "",
            country: "Thailand",
            countryCode: "th",
            continent: "AS"
        },
        "HZ": {
            call: "",
            country: "Saudi Arabia",
            countryCode: "sa",
            continent: "AS"
        },
        "IM": {
            call: "",
            country: "Sardinia",
            countryCode: "it",
            continent: "EU"
        },
        "IS": {
            call: "",
            country: "Sardinia",
            countryCode: "it",
            continent: "EU"
        },
        "J4": {
            call: "",
            country: "Greece",
            countryCode: "gr",
            continent: "EU"
        },
        "JE": {
            call: "",
            country: "Japan",
            countryCode: "ja",
            continent: "AS"
        },
        "JR": {
            call: "",
            country: "Japan",
            countryCode: "ja",
            continent: "AS"
        },
        "JS": {
            call: "",
            country: "Japan",
            countryCode: "ja",
            continent: "AS"
        },
        "JW": {
            call: "",
            country: "Svalbard",
            countryCode: "no",
            continent: "EU"
        },
        "JY": {
            call: "",
            country: "Jordan",
            countryCode: "jo",
            continent: "AS"
        },
        "KH": {
            call: "",
            country: "United States (Pacific)",
            countryCode: "us",
            continent: "OC"
        },
        "KL": {
            call: "",
            country: "Alaska",
            countryCode: "us",
            continent: "NA"
        },
        "LA": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LB": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LC": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LD": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LE": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LF": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LG": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LH": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LI": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LJ": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LK": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LL": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LM": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LN": {
            call: "",
            country: "Norway",
            countryCode: "no",
            continent: "EU"
        },
        "LO": {
            call: "",
            country: "Argentina",
            countryCode: "ar",
            continent: "SA"
        },
        "LP": {
            call: "",
            country: "Argentina",
            countryCode: "ar",
            continent: "SA"
        },
        "LQ": {
            call: "",
            country: "Argentina",
            countryCode: "ar",
            continent: "SA"
        },
        "LT": {
            call: "",
            country: "Argentina",
            countryCode: "ar",
            continent: "SA"
        },
        "LV": {
            call: "",
            country: "Argentina",
            countryCode: "ar",
            continent: "SA"
        },
        "LY": {
            call: "",
            country: "Lithuania",
            countryCode: "lt",
            continent: "EU"
        },
        "LZ": {
            call: "",
            country: "Bulgaria",
            countryCode: "bg",
            continent: "EU"
        },
        "M": {
            call: "",
            country: "England",
            countryCode: "gb",
            continent: "EU"
        },
        "NH": {
            call: "",
            country: "United States (Pacific)",
            countryCode: "us",
            continent: "OC"
        },
        "NL": {
            call: "",
            country: "Alaska",
            countryCode: "us",
            continent: "NA"
        },
        "OA": {
            call: "",
            country: "Peru",
            countryCode: "pe",
            continent: "SA"
        },
        "OB": {
            call: "",
            country: "Peru",
            countryCode: "pe",
            continent: "SA"
        },
        "OC": {
            call: "",
            country: "Peru",
            countryCode: "pe",
            continent: "SA"
        },
        "OD": {
            call: "",
            country: "Lebanon",
            countryCode: "lb",
            continent: "AS"
        },
        "OF": {
            call: "",
            country: "Finland",
            countryCode: "fi",
            continent: "EU"
        },
        "OG": {
            call: "",
            country: "Finland",
            countryCode: "fi",
            continent: "EU"
        },
        "OH": {
            call: "",
            country: "Finland",
            countryCode: "fi",
            continent: "EU"
        },
        "OI": {
            call: "",
            country: "Finland",
            countryCode: "fi",
            continent: "EU"
        },
        "OK": {
            call: "",
            country: "Czech Republic",
            countryCode: "cz",
            continent: "EU"
        },
        "OL": {
            call: "",
            country: "Czech Republic",
            countryCode: "cz",
            continent: "EU"
        },
        "OM": {
            call: "",
            country: "Slovakia",
            countryCode: "sk",
            continent: "EU"
        },
        "ON": {
            call: "",
            country: "Belgium",
            countryCode: "be",
            continent: "EU"
        },
        "OO": {
            call: "",
            country: "Belgium",
            countryCode: "be",
            continent: "EU"
        },
        "OP": {
            call: "",
            country: "Belgium",
            countryCode: "be",
            continent: "EU"
        },
        "OQ": {
            call: "",
            country: "Belgium",
            countryCode: "be",
            continent: "EU"
        },
        "OR": {
            call: "",
            country: "Belgium",
            countryCode: "be",
            continent: "EU"
        },
        "OS": {
            call: "",
            country: "Belgium",
            countryCode: "be",
            continent: "EU"
        },
        "OT": {
            call: "",
            country: "Belgium",
            countryCode: "be",
            continent: "EU"
        },
        "OU": {
            call: "",
            country: "Denmark",
            countryCode: "dk",
            continent: "EU"
        },
        "OZ": {
            call: "",
            country: "Denmark",
            countryCode: "dk",
            continent: "EU"
        },
        "P2": {
            call: "",
            country: "Papua New Guinea",
            countryCode: "pg",
            continent: "OC"
        },
        "P3": {
            call: "",
            country: "Cyprus",
            countryCode: "cy",
            continent: "EU"
        },
        "PA": {
            call: "",
            country: "Netherlands",
            countryCode: "nl",
            continent: "EU"
        },
        "PB": {
            call: "",
            country: "Netherlands",
            countryCode: "nl",
            continent: "EU"
        },
        "PC": {
            call: "",
            country: "Netherlands",
            countryCode: "nl",
            continent: "EU"
        },
        "PD": {
            call: "",
            country: "Netherlands",
            countryCode: "nl",
            continent: "EU"
        },
        "PE": {
            call: "",
            country: "Netherlands",
            countryCode: "nl",
            continent: "EU"
        },
        "PF": {
            call: "",
            country: "Netherlands",
            countryCode: "nl",
            continent: "EU"
        },
        "PG": {
            call: "",
            country: "Netherlands",
            countryCode: "nl",
            continent: "EU"
        },
        "PH": {
            call: "",
            country: "Netherlands",
            countryCode: "nl",
            continent: "EU"
        },
        "PI": {
            call: "",
            country: "Netherlands",
            countryCode: "nl",
            continent: "EU"
        },
        "PJ": {
            call: "",
            country: "Netherlands",
            countryCode: "nl",
            continent: "EU"
        },
        "PP": {
            call: "",
            country: "Brazil",
            countryCode: "br",
            continent: "SA"
        },
        "PQ": {
            call: "",
            country: "Brazil",
            countryCode: "br",
            continent: "SA"
        },
        "PR": {
            call: "",
            country: "Brazil",
            countryCode: "br",
            continent: "SA"
        },
        "PT": {
            call: "",
            country: "Brazil",
            countryCode: "br",
            continent: "SA"
        },
        "PU": {
            call: "",
            country: "Brazil",
            countryCode: "br",
            continent: "SA"
        },
        "PV": {
            call: "",
            country: "Brazil",
            countryCode: "br",
            continent: "SA"
        },
        "PW": {
            call: "",
            country: "Brazil",
            countryCode: "br",
            continent: "SA"
        },
        "PX": {
            call: "",
            country: "Brazil",
            countryCode: "br",
            continent: "SA"
        },
        "PY": {
            call: "",
            country: "Brazil",
            countryCode: "br",
            continent: "SA"
        },
        "R": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RA": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RC": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RD": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RI": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RJ": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RK": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RL": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RM": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RN": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RO": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RQ": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RT": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RU": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RV": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RW": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RX": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RY": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "RZ": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "S2": {
            call: "",
            country: "Bangladesh",
            countryCode: "bd",
            continent: "AS"
        },
        "S5": {
            call: "",
            country: "Slovenia",
            countryCode: "si",
            continent: "EU"
        },
        "SA": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SB": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SC": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SD": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SE": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SF": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SG": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SH": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SI": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SJ": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SK": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SL": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SM": {
            call: "",
            country: "Sweden",
            countryCode: "se",
            continent: "EU"
        },
        "SN": {
            call: "",
            country: "Poland",
            countryCode: "pl",
            continent: "EU"
        },
        "SO": {
            call: "",
            country: "Poland",
            countryCode: "pl",
            continent: "EU"
        },
        "SP": {
            call: "",
            country: "Poland",
            countryCode: "pl",
            continent: "EU"
        },
        "SQ": {
            call: "",
            country: "Poland",
            countryCode: "pl",
            continent: "EU"
        },
        "SR": {
            call: "",
            country: "Poland",
            countryCode: "pl",
            continent: "EU"
        },
        "SU": {
            call: "",
            country: "Egypt",
            countryCode: "eg",
            continent: "AF"
        },
        "SV": {
            call: "",
            country: "Greece",
            countryCode: "gr",
            continent: "EU"
        },
        "SW": {
            call: "",
            country: "Greece",
            countryCode: "gr",
            continent: "EU"
        },
        "SX": {
            call: "",
            country: "Greece",
            countryCode: "gr",
            continent: "EU"
        },
        "SY": {
            call: "",
            country: "Greece",
            countryCode: "gr",
            continent: "EU"
        },
        "SZ": {
            call: "",
            country: "Greece",
            countryCode: "gr",
            continent: "EU"
        },
        "T6": {
            call: "",
            country: "Afghanistan",
            countryCode: "af",
            continent: "AS"
        },
        "T7": {
            call: "",
            country: "San Marino",
            countryCode: "sm",
            continent: "EU"
        },
        "T8": {
            call: "",
            country: "Palau",
            countryCode: "pw",
            continent: "OC"
        },
        "TF": {
            call: "",
            country: "Iceland",
            countryCode: "is",
            continent: "EU"
        },
        "TK": {
            call: "",
            country: "Corsica",
            countryCode: "fr",
            continent: "EU"
        },
        "TS": {
            call: "",
            country: "Tunisia",
            countryCode: "tn",
            continent: "AF"
        },
        "TU": {
            call: "",
            country: "Cote d'Ivoire",
            countryCode: "ci",
            continent: "AF"
        },
        "UA": {
            call: "",
            country: "European Russia",
            countryCode: "ru",
            continent: "EU"
        },
        "UN": {
            call: "",
            country: "Kazakhstan",
            countryCode: "kz",
            continent: "AS"
        },
        "UP": {
            call: "",
            country: "Kazakhstan",
            countryCode: "kz",
            continent: "AS"
        },
        "UQ": {
            call: "",
            country: "Kazakhstan",
            countryCode: "kz",
            continent: "AS"
        },
        "UR": {
            call: "",
            country: "Ukraine",
            countryCode: "ua",
            continent: "EU"
        },
        "US": {
            call: "",
            country: "Ukraine",
            countryCode: "ua",
            continent: "EU"
        },
        "UT": {
            call: "",
            country: "Ukraine",
            countryCode: "ua",
            continent: "EU"
        },
        "UU": {
            call: "",
            country: "Ukraine",
            countryCode: "ua",
            continent: "EU"
        },
        "UV": {
            call: "",
            country: "Ukraine",
            countryCode: "ua",
            continent: "EU"
        },
        "UW": {
            call: "",
            country: "Ukraine",
            countryCode: "ua",
            continent: "EU"
        },
        "UX": {
            call: "",
            country: "Ukraine",
            countryCode: "ua",
            continent: "EU"
        },
        "UY": {
            call: "",
            country: "Ukraine",
            countryCode: "ua",
            continent: "EU"
        },
        "UZ": {
            call: "",
            country: "Ukraine",
            countryCode: "ua",
            continent: "EU"
        },
        "V5": {
            call: "",
            country: "Namibia",
            countryCode: "na",
            continent: "AF"
        },
        "V6": {
            call: "",
            country: "Micronesia",
            countryCode: "fm",
            continent: "OC"
        },
        "V7": {
            call: "",
            country: "Marshall Islands",
            countryCode: "mh",
            continent: "OC"
        },
        "VA": {
            call: "",
            country: "Canada",
            countryCode: "ca",
            continent: "NA"
        },
        "VB": {
            call: "",
            country: "Canada",
            countryCode: "ca",
            continent: "NA"
        },
        "VC": {
            call: "",
            country: "Canada",
            countryCode: "ca",
            continent: "NA"
        },
        "VD": {
            call: "",
            country: "Canada",
            countryCode: "ca",
            continent: "NA"
        },
        "VO": {
            call: "",
            country: "Canada",
            countryCode: "ca",
            continent: "NA"
        },
        "VR": {
            call: "",
            country: "Hong Kong",
            countryCode: "hk",
            continent: "AS"
        },
        "VU": {
            call: "",
            country: "India",
            countryCode: "in",
            continent: "AS"
        },
        "VY": {
            call: "",
            country: "Canada",
            countryCode: "ca",
            continent: "NA"
        },
        "WH": {
            call: "",
            country: "United States (Pacific)",
            countryCode: "us",
            continent: "OC"
        },
        "WL": {
            call: "",
            country: "Alaska",
            countryCode: "us",
            continent: "NA"
        },
        "XE": {
            call: "",
            country: "Mexico",
            countryCode: "mx",
            continent: "NA"
        },
        "XF": {
            call: "",
            country: "Mexico",
            countryCode: "mx",
            continent: "NA"
        },
        "XQ": {
            call: "",
            country: "Chile",
            countryCode: "cl",
            continent: "SA"
        },
        "XR": {
            call: "",
            country: "Chile",
            countryCode: "cl",
            continent: "SA"
        },
        "XU": {
            call: "",
            country: "Cambodia",
            countryCode: "kh",
            continent: "AS"
        },
        "XW": {
            call: "",
            country: "Laos",
            countryCode: "la",
            continent: "AS"
        },
        "XX": {
            call: "",
            country: "Macau",
            countryCode: "mo",
            continent: "AS"
        },
        "YA": {
            call: "",
            country: "Afghanistan",
            countryCode: "af",
            continent: "AS"
        },
        "YB": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "YC": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "YD": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "YE": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "YF": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "YG": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "YH": {
            call: "",
            country: "Indonesia",
            countryCode: "id",
            continent: "AS"
        },
        "YI": {
            call: "",
            country: "Iraq",
            countryCode: "iq",
            continent: "AS"
        },
        "YJ": {
            call: "",
            country: "Vanuatu",
            countryCode: "vu",
            continent: "OC"
        },
        "YL": {
            call: "",
            country: "Latvia",
            countryCode: "lv",
            continent: "EU"
        },
        "YO": {
            call: "",
            country: "Romania",
            countryCode: "ro",
            continent: "EU"
        },
        "YP": {
            call: "",
            country: "Romania",
            countryCode: "ro",
            continent: "EU"
        },
        "YQ": {
            call: "",
            country: "Romania",
            countryCode: "ro",
            continent: "EU"
        },
        "YR": {
            call: "",
            country: "Romania",
            countryCode: "ro",
            continent: "EU"
        },
        "YT": {
            call: "",
            country: "Serbia",
            countryCode: "rs",
            continent: "EU"
        },
        "YU": {
            call: "",
            country: "Serbia",
            countryCode: "rs",
            continent: "EU"
        },
        "YV": {
            call: "",
            country: "Venezuela",
            countryCode: "ve",
            continent: "SA"
        },
        "YW": {
            call: "",
            country: "Venezuela",
            countryCode: "ve",
            continent: "SA"
        },
        "YY": {
            call: "",
            country: "Venezuela",
            countryCode: "ve",
            continent: "SA"
        },
        "Z2": {
            call: "",
            country: "Zimbabwe",
            countryCode: "zw",
            continent: "AF"
        },
        "Z3": {
            call: "",
            country: "North Macedonia",
            countryCode: "mk",
            continent: "EU"
        },
        "Z6": {
            call: "",
            country: "Kosovo",
            countryCode: "xk",
            continent: "EU"
        },
        "ZA": {
            call: "",
            country: "Albania",
            countryCode: "al",
            continent: "EU"
        },
        "ZL": {
            call: "",
            country: "New Zealand",
            countryCode: "nz",
            continent: "OC"
        },
        "ZM": {
            call: "",
            country: "New Zealand",
            countryCode: "nz",
            continent: "OC"
        },
        "ZP": {
            call: "",
            country: "Paraguay",
            countryCode: "py",
            continent: "SA"
        },
        "ZR": {
            call: "",
            country: "South Africa",
            countryCode: "za",
            continent: "AF"
        },
        "ZS": {
            call: "",
            country: "South Africa",
            countryCode: "za",
            continent: "AF"
        },
        "ZZ": {
            call: "",
            country: "Brazil",
            countryCode: "br",
            continent: "SA"
        },

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
