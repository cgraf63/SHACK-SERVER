export interface BandCondition {

    band: string;

    score: number;

    condition: string;

}


export interface PropagationStatus {

    solarFlux: number;

    aIndex: number;

    kIndex: number;

    muf: number;

    bands: BandCondition[];

    updated: string;

}



export async function getPropagation(): Promise<PropagationStatus> {


    return {

        solarFlux: 158,

        aIndex: 12,

        kIndex: 3,

        muf: 21.5,


        bands: [

            {
                band: "6m",
                score: 20,
                condition: "Poor"
            },

            {
                band: "10m",
                score: 45,
                condition: "Fair"
            },

            {
                band: "12m",
                score: 70,
                condition: "Good"
            },

            {
                band: "15m",
                score: 95,
                condition: "Excellent"
            },

            {
                band: "17m",
                score: 90,
                condition: "Excellent"
            },

            {
                band: "20m",
                score: 85,
                condition: "Excellent"
            },

            {
                band: "30m",
                score: 75,
                condition: "Good"
            },

            {
                band: "40m",
                score: 60,
                condition: "Fair"
            },

            {
                band: "60m",
                score: 50,
                condition: "Fair"
            },

            {
                band: "80m",
                score: 45,
                condition: "Fair"
            }

        ],


        updated: new Date().toISOString()

    };

}
