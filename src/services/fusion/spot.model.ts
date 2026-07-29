export interface FusionSpot {


    call: string;


    frequency: number;


    band: string;


    mode: string;



    sources: string[];



    firstSeen: number;


    lastSeen: number;



    confidence: number;



    snr?: number;



    spotters?: string[];



    comments?: string[];



    // DX information

    country?: string;


    dxcc?: number;


    continent?: string;


    flag?: string;


    // ISO 3166-1 alpha-2 country code

    // used for graphical flag assets

    countryCode?: string;


}
