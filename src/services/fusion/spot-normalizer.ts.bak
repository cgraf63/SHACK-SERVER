
import {
    FusionSpot
} from "./spot.model.js";

export class SpotNormalizer {

    normalize(raw: any, source: string): FusionSpot | null {

        if (!raw.call || !raw.frequency) {
            return null;
        }

        let frequency = Number(raw.frequency);

if (frequency < 1000) {
    frequency = frequency * 1000;
}

        const mode = this.detectMode(
            raw.mode,
            frequency
        );


console.log(
    "NORMALIZER LOCATOR",
    raw.call,
    raw.locator
);


        return {
    call: raw.call.toUpperCase().trim(),
    frequency,
    band: this.getBand(frequency),
    mode,
    sources: [source],
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    confidence: this.calculateConfidence(mode),
    snr: raw.snr,

...(raw.comment
        ? {
            comments: [raw.comment]
        }
        : {}),



    country: raw.country,
    dxcc: raw.dxcc,
    continent: raw.continent,
    flag: this.getFlag(raw.call),
    countryCode: this.getCountryCode(raw.call),

    locator: raw.locator,
    latitude: raw.latitude,
    longitude: raw.longitude,
    distance: raw.distance,
    azimuth: raw.azimuth
};
    }

    

private detectMode(
    mode: string | undefined,
    frequency: number
): string {

    /*
        1. Echter Mode aus der Spot-Quelle hat Vorrang.
        UNKNOWN wird jedoch nicht als echter Mode betrachtet.
    */

    if (mode) {

        const upper =
            mode.toUpperCase().trim();

        const validModes = [
            "FT8",
            "FT4",
            "RTTY",
            "CW",
            "SSB",
            "USB",
            "LSB",
            "AM",
            "FM"
        ];

        for (const item of validModes) {

            if (
                upper === item ||
                upper.includes(item)
            ) {

                return item;

            }

        }

    }


    /*
        2. Bekannte FT8-Frequenzen
    */

    const ft8Frequencies = [

        1840,
        3573,
        5357,
        7074,
        10136,
        14074,
        18095,
        18100,
        21074,
        24915,
        28074,
        50313,
        144174

    ];


    for (const center of ft8Frequencies) {

        if (
            Math.abs(
                frequency - center
            ) <= 3
        ) {

            return "FT8";

        }

    }


    /*
        3. Bekannte FT4-Frequenzen
    */

    const ft4Frequencies = [

        3575,
        7047.5,
        14080,
        18104,
        21140,
        24919,
        28180

    ];


    for (const center of ft4Frequencies) {

        if (
            Math.abs(
                frequency - center
            ) <= 3
        ) {

            return "FT4";

        }

    }


    /*
        4. HF BANDPLAN
        Frequenzen in kHz
    */


    // 160 m
    if (
        frequency >= 1800 &&
        frequency < 1840
    ) {

        return "CW";

    }

    if (
        frequency >= 1840 &&
        frequency <= 2000
    ) {

        return "SSB";

    }


    // 80 m
    if (
        frequency >= 3500 &&
        frequency < 3570
    ) {

        return "CW";

    }

    if (
        frequency >= 3570 &&
        frequency < 3600
    ) {

        return "DIGITAL";

    }

    if (
        frequency >= 3600 &&
        frequency <= 3800
    ) {

        return "SSB";

    }


    // 40 m
    if (
        frequency >= 7000 &&
        frequency < 7040
    ) {

        return "CW";

    }

    if (
        frequency >= 7040 &&
        frequency < 7050
    ) {

        return "DIGITAL";

    }

    if (
        frequency >= 7050 &&
        frequency <= 7200
    ) {

        return "SSB";

    }


    // 30 m
    if (
        frequency >= 10100 &&
        frequency < 10150
    ) {

        return "DIGITAL";

    }


    // 20 m
    if (
        frequency >= 14000 &&
        frequency < 14070
    ) {

        return "CW";

    }

    if (
        frequency >= 14070 &&
        frequency < 14110
    ) {

        return "DIGITAL";

    }

    if (
        frequency >= 14110 &&
        frequency <= 14350
    ) {

        return "SSB";

    }


    // 17 m
    if (
        frequency >= 18068 &&
        frequency < 18110
    ) {

        return "DIGITAL";

    }

    if (
        frequency >= 18110 &&
        frequency <= 18168
    ) {

        return "SSB";

    }


    // 15 m
    if (
        frequency >= 21000 &&
        frequency < 21070
    ) {

        return "CW";

    }

    if (
        frequency >= 21070 &&
        frequency < 21120
    ) {

        return "DIGITAL";

    }

    if (
        frequency >= 21120 &&
        frequency <= 21450
    ) {

        return "SSB";

    }


    // 12 m
    if (
        frequency >= 24890 &&
        frequency < 24915
    ) {

        return "CW";

    }

    if (
        frequency >= 24915 &&
        frequency < 24940
    ) {

        return "DIGITAL";

    }

    if (
        frequency >= 24940 &&
        frequency <= 24990
    ) {

        return "SSB";

    }


    // 10 m
    if (
        frequency >= 28000 &&
        frequency < 28070
    ) {

        return "CW";

    }

    if (
        frequency >= 28070 &&
        frequency < 28300
    ) {

        return "DIGITAL";

    }

    if (
        frequency >= 28300 &&
        frequency < 29100
    ) {

        return "SSB";

    }

    if (
        frequency >= 29100 &&
        frequency <= 29700
    ) {

        return "FM";

    }


    /*
        5. VHF
    */

    // 6 m
    if (
        frequency >= 50000 &&
        frequency < 50100
    ) {

        return "CW";

    }

    if (
        frequency >= 50100 &&
        frequency < 50200
    ) {

        return "SSB";

    }

    if (
        frequency >= 50200 &&
        frequency < 50400
    ) {

        return "DIGITAL";

    }

    if (
        frequency >= 50400 &&
        frequency <= 52000
    ) {

        return "SSB";

    }


    // 2 m
    if (
        frequency >= 144000 &&
        frequency < 144100
    ) {

        return "CW";

    }

    if (
        frequency >= 144100 &&
        frequency < 144400
    ) {

        return "SSB";

    }

    if (
        frequency >= 144400 &&
        frequency < 144500
    ) {

        return "DIGITAL";

    }

    if (
        frequency >= 144500 &&
        frequency <= 146000
    ) {

        return "FM";

    }


    return "UNKNOWN";

}


    private calculateConfidence(mode: string): number {
        return mode === "UNKNOWN" ? 60 : 75;
    }

    private getBand(frequency: number): string {
        const mhz = frequency / 1000;
        if (mhz >= 430 && mhz <= 440) return "70cm";
 	if (mhz >= 144 && mhz <= 146) return "2m";
	if (mhz >= 70 && mhz < 71) return "4m";
        if (mhz >= 50) return "6m";
        if (mhz >= 28) return "10m";
        if (mhz >= 26.5) return "11m";
	if (mhz >= 24.89) return "12m";
	if (mhz >= 21) return "15m";
 	if (mhz >= 18.087) return "17m";
	if (mhz >= 14) return "20m";
        if (mhz >= 7) return "40m";
        if (mhz >= 3.5) return "80m";
    	if (mhz >= 1.8) return "160m";


        return "unknown";
    }

    private getFlag(call: string): string {
        const code = this.getCountryCode(call);

        const flags: Record<string,string> = {

    // Europe
    by:"🇧🇾",
    ru:"🇷🇺",
    de:"🇩🇪",
    ch:"🇨🇭",
    fr:"🇫🇷",
    gb:"🇬🇧",
    it:"🇮🇹",
    es:"🇪🇸",
    pt:"🇵🇹",
    be:"🇧🇪",
    nl:"🇳🇱",
    lu:"🇱🇺",
    at:"🇦🇹",
    pl:"🇵🇱",
    cz:"🇨🇿",
    sk:"🇸🇰",
    si:"🇸🇮",
    hr:"🇭🇷",
    hu:"🇭🇺",
    ro:"🇷🇴",
    bg:"🇧🇬",
    gr:"🇬🇷",
    se:"🇸🇪",
    no:"🇳🇴",
    fi:"🇫🇮",
    dk:"🇩🇰",
    is:"🇮🇸",
    ie:"🇮🇪",
    ua:"🇺🇦",
   
    lt:"🇱🇹",
    lv:"🇱🇻",
    ee:"🇪🇪",
    rs:"🇷🇸",
    me:"🇲🇪",
    ba:"🇧🇦",
    mk:"🇲🇰",

    // North America
    us:"🇺🇸",
    ca:"🇨🇦",
    mx:"🇲🇽",

    // Caribbean
    pr:"🇵🇷",
    do:"🇩🇴",
    cu:"🇨🇺",
    jm:"🇯🇲",
    bs:"🇧🇸",
    bb:"🇧🇧",
    tt:"🇹🇹",
    ky:"🇰🇾",
    bm:"🇧🇲",
    vi:"🇻🇮",
    gp:"🇬🇵",
    mq:"🇲🇶",
    mf:"🇲🇫",
    aw:"🇦🇼",
    cw:"🇨🇼",
    bq:"🇧🇶",

    // South America
    br:"🇧🇷",
    ar:"🇦🇷",
    cl:"🇨🇱",
    uy:"🇺🇾",
    py:"🇵🇾",
    bo:"🇧🇴",
    pe:"🇵🇪",
    ec:"🇪🇨",
    co:"🇨🇴",
    ve:"🇻🇪",
    gy:"🇬🇾",
    sr:"🇸🇷",

    // Africa
    za:"🇿🇦",
    ke:"🇰🇪",
    ng:"🇳🇬",
    gh:"🇬🇭",
    ma:"🇲🇦",
    dz:"🇩🇿",
    tn:"🇹🇳",
    eg:"🇪🇬",
    ly:"🇱🇾",
    sn:"🇸🇳",
    ml:"🇲🇱",
    ug:"🇺🇬",
    tz:"🇹🇿",
    zw:"🇿🇼",
    zm:"🇿🇲",
    bw:"🇧🇼",
    na:"🇳🇦",
    mz:"🇲🇿",
    mg:"🇲🇬",
    mu:"🇲🇺",
    sc:"🇸🇨",

    // Middle East
    il:"🇮🇱",
    jo:"🇯🇴",
    sa:"🇸🇦",
    ae:"🇦🇪",
    qa:"🇶🇦",
    kw:"🇰🇼",
    bh:"🇧🇭",
    om:"🇴🇲",

    // Asia
    jp:"🇯🇵",
    kr:"🇰🇷",
    cn:"🇨🇳",
    tw:"🇹🇼",
    hk:"🇭🇰",
    in:"🇮🇳",
    id:"🇮🇩",
    th:"🇹🇭",
    my:"🇲🇾",
    sg:"🇸🇬",
    ph:"🇵🇭",
    vn:"🇻🇳",
    pk:"🇵🇰",

    // Oceania
    au:"🇦🇺",
    nz:"🇳🇿",
    fj:"🇫🇯",
    pg:"🇵🇬",
    ws:"🇼🇸",
    to:"🇹🇴",
    vu:"🇻🇺",
    sb:"🇸🇧",
   
    
    
    EK:"am",
    ge:"🇬🇪",
    az:"🇦🇿",
    kz:"🇰🇿",
    kg:"🇰🇬",
    uz:"🇺🇿",
    tj:"🇹🇯",
    tm:"🇹🇲",
    md:"🇲🇩",

};

 return flags[code] ?? "🌐";
  }




    private getCountryCode(call: string): string {
        const prefix = call.toUpperCase().replace(/[^A-Z0-9]/g, "");

//
//These are all the callsign prefixes. Hard coded I know
        const codes: Record<string,string> = {

"VJ":"au",
ER:"md",
EZ:"tm",
EY:"tj",
UK:"uz",
EX:"kg",
UN:"kz",
UP:"kz",
UQ:"kz",
"4J":"az",
"4K":"az",

"4L":"ge",
EK:"am",
ES:"ee",
// Belarus
EU:"by",
EV:"by",
EW:"by",
//Lettland
YL:"lv",
//Littauen
LY:"lt",


//Ukraine
UR:"ua",
UT:"ua",
UU:"ua",
UV:"ua",
UW:"ua",
UX:"ua",
UY:"ua",
UZ:"ua",
EM:"ua",
EN:"ua",
EO:"ua",


    // Germany
    DA:"de",
    DB:"de",
    DC:"de",
    DD:"de",
    DF:"de",
    DG:"de",
    DH:"de",
    DJ:"de",
    DK:"de",
    DL:"de",
    DM:"de",
    DN:"de",
    DO:"de",
    DP:"de",
    DQ:"de",
    DR:"de",

    // Switzerland
    HB:"ch",

    // France
    F:"fr",

    // United Kingdom
    G:"gb",
    M:"gb",
    "2E":"gb",
    MW:"gb",

    // Italy
    I:"it",

    // Spain
EA:"es",
EB:"es",
EC:"es",
ED:"es",
EE:"es",
EF:"es",
EG:"es",
EH:"es",
    // Portugal
    CT:"pt",

    // Belgium
    ON:"be",

    // Netherlands
    PA:"nl",

    // Luxembourg
    LX:"lu",

    // Austria
    OE:"at",

    // Poland
    SP:"pl",
    SQ:"pl",

    // Czech Republic
    OK:"cz",

    // Slovakia
    OM:"sk",

    // Slovenia
    "S5":"si",

    // Croatia
    "9A":"hr",

    // Hungary
    HA:"hu",
    HG:"hu",

    // Romania
    YO:"ro",
    YR:"ro",

    // Bulgaria
    LZ:"bg",

    // Greece
    SV:"gr",

    // Sweden
    SM:"se",

    // Norway
    LA:"no",

    // Finland
    OH:"fi",

    // Denmark
    OZ:"dk",

    // Iceland
    TF:"is",

    // Ireland
    EI:"ie",

    // Switzerland special
    "HB0":"li",

    // Serbia
    YU:"rs",

    // Montenegro
    "4O":"me",

    // Bosnia
    "E7":"ba",

    // North Macedonia
    "Z3":"mk",

    
//Russland
    R:"ru",
	
// North America

    // United States
    K:"us",
    N:"us",
    W:"us",
    AA:"us",
    AB:"us",
    AC:"us",
    AD:"us",
    AE:"us",
    AF:"us",
    AG:"us",
    AI:"us",
    AK:"us",
    K0:"us",

    // Canada
    VE:"ca",
    VA:"ca",
    VO:"ca",
    VY:"ca",
    CF:"ca",
    CG:"ca",
    CH:"ca",
    CI:"ca",
    CJ:"ca",
    CK:"ca",
    CY:"ca",

    // Mexico
    XE:"mx",
    XF:"mx",
    XG:"mx",
    XH:"mx",
    XI:"mx",

    // Caribbean

    // Puerto Rico
    "KP4":"pr",

    // Dominican Republic
    HI:"do",

    // Cuba
    CO:"cu",

    // Jamaica
    "6Y":"jm",

    // Bahamas
    "C6":"bs",

    // Barbados
    "8P":"bb",

    // Trinidad and Tobago
    "9Y":"tt",

    // Cayman Islands
    "ZF":"ky",

    // Bermuda
    "VP9":"bm",

    // Virgin Islands
    "KP2":"vi",

    // Guadeloupe
    FG:"gp",

    // Martinique
    FM:"mq",

    // Saint Martin / Saint Barthelemy
    FS:"mf",

    // Aruba
   "P4":"aw",

    // Curaçao
    "PJ2":"cw",

    // Bonaire
    "PJ42":"bq",


    // South America

    // Brazil
    PP:"br",
    PQ:"br",
    PR:"br",
    PS:"br",
    PT:"br",
    PU:"br",
    PV:"br",
    PW:"br",
    PX:"br",
    PY:"br",

    // Argentina
    LU:"ar",

    // Chile
    CE:"cl",

    // Uruguay
    CX:"uy",

    // Paraguay
    ZP:"py",

    // Bolivia
    CP:"bo",

    // Peru
    OA:"pe",

    // Ecuador
    HC:"ec",

    // Colombia
    HK:"co",

    // Venezuela
    YV:"ve",

    // Guyana
    "8R":"gy",

    // Suriname
    PZ:"sr",

    // French Guiana
    FY:"fr",

    // Africa

    // South Africa
    ZS:"za",
    ZR:"za",
    ZT:"za",
    ZU:"za",

    // Kenya
    "5Z":"ke",

    // Nigeria
    "5N":"ng",

    // Ghana
    "9G":"gh",

    // Morocco
    CN:"ma",

    // Algeria
    "7X":"dz",

    // Tunisia
    "3V":"tn",

    // Egypt
    SU:"eg",

    // Libya
    "5A":"ly",

    // Senegal
    "6W":"sn",

    // Mali
    TZ:"ml",

    // Uganda
    "5X":"ug",

    // Tanzania
    "5H":"tz",
    "5I":"tz",

    // Zimbabwe
    "Z2":"zw",

    // Zambia
    "9J":"zm",

    // Botswana
    "A2":"bw",

    // Namibia
    "V5":"na",

    // Mozambique
    "C9":"mz",

    // Madagascar
    "5R":"mg",

    // Mauritius
    "3B8":"mu",

    // Seychelles
    "S7":"sc",


    // Middle East

    // Israel
    "4X":"il",
    "4Z":"il",

    // Jordan
    JY:"jo",

    // Saudi Arabia
    HZ:"sa",

    // United Arab Emirates
    A6:"ae",

    // Qatar
    A7:"qa",

    // Kuwait
    "9K":"kw",

    // Bahrain
    A9:"bh",

    // Oman
    A4:"om",


    // Asia

    // Japan
    
    JB:"jp",
    JC:"jp",
    JD:"jp",
    JE:"jp",
    JF:"jp",
    JG:"jp",
    JH:"jp",
    JI:"jp",
    JJ:"jp",
    JK:"jp",
    JL:"jp",
    JM:"jp",
    JN:"jp",
    JO:"jp",
    JP:"jp",
    JQ:"jp",
    JR:"jp",
    JS:"jp",

    // South Korea
    HL:"kr",
    DS:"kr",
    "6K":"kr",

    // China
    BA:"cn",
    BD:"cn",
    BG:"cn",
    BH:"cn",
    BI:"cn",

    // Taiwan
    BV:"tw",

    // Hong Kong
    VR:"hk",

    // India
    VU:"in",

    // Indonesia
    YB:"id",

    // Thailand
    HS:"th",

    // Malaysia
    "9M":"my",

    // Singapore
    "9V":"sg",

    // Philippines
    DU:"ph",

    // Vietnam
    XV:"vn",

    // Pakistan
    AP:"pk",


    // Oceania

    // Australia
    VK:"au",

    // New Zealand
    ZL:"nz",

    // Fiji
    "3D2":"fj",

    // Papua New Guinea
    P2:"pg",

    // Samoa
    "5W":"ws",

    // Tonga
    A3:"to",

    // Vanuatu
    YJ:"vu",

    // Solomon Islands
    H4:"sb",

};

////
//// end of prefix section
       
        for (const key of Object.keys(codes).sort((a,b)=>b.length-a.length)) {
            if (prefix.startsWith(key)) {
                return codes[key] ?? "";
            }
        }
return "";
  
    }
}

