export interface Spot {

    call: string;

    frequency: string;

    mode: string;

    source: string;

    age: string;

    confidence: number;

    snr: number;

}


export async function getSpots(): Promise<Spot[]> {


    return [

        {
            call: "ZD7XX",
            frequency: "14.025.0",
            mode: "CW",
            source: "HB9ON",
            age: "4s",
            confidence: 96,
            snr: 21
        },


        {
            call: "5Z4VJ",
            frequency: "18.100.0",
            mode: "FT8",
            source: "HB9ON",
            age: "8s",
            confidence: 91,
            snr: 15
        },


        {
            call: "VK9XX",
            frequency: "14.025.0",
            mode: "CW",
            source: "DXSpider",
            age: "15s",
            confidence: 94,
            snr: 24
        }

    ];

}
