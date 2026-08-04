
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

    private detectMode(mode: string | undefined, frequency: number): string {
        if (mode) {
            const upper = mode.toUpperCase();
            for (const item of ["FT8","FT4","RTTY","CW","SSB","USB","LSB"]) {
                if (upper.includes(item)) return item;
            }
        }

        if (frequency >= 144100 && frequency <= 144150) return "FT8";
        if (frequency >= 50300 && frequency <= 50400) return "FT8";
        if (frequency >= 14070 && frequency <= 14110) return "FT8";
        if (frequency >= 7000 && frequency <= 7050) return "CW";
        if (frequency >= 7050 && frequency <= 7200) return "SSB";

        return "UNKNOWN";
    }

    private calculateConfidence(mode: string): number {
        return mode === "UNKNOWN" ? 60 : 75;
    }

    private getBand(frequency: number): string {
        const mhz = frequency / 1000;

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
    by:"🇧🇾",
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
    sb:"🇸🇧"

};

 return flags[code] ?? "🌐";
  }




    private getCountryCode(call: string): string {
        const prefix = call.toUpperCase().replace(/[^A-Z0-9]/g, "");

//
//These are all the callsign prefixes. Hard coded I know
        const codes: Record<string,string> = {

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

    // Ukraine
    UR:"ua",
    UT:"ua",
    UX:"ua",

    // Belarus
    EU:"by",
    EV:"by",
    EW:"by",

    // Lithuania
    LY:"lt",

    // Latvia
    YL:"lv",

    // Estonia
    ES:"ee",

    // Serbia
    YU:"rs",

    // Montenegro
    "4O":"me",

    // Bosnia
    "E7":"ba",

    // North Macedonia
    "Z3":"mk",

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

