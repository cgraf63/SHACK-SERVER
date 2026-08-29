export type BandSegmentType =
    | "CW"
    | "SSB"
    | "DIGITAL"
    | "FM"
    | "BEACON"
    | "SATELLITE"
    | "REPEATER"
    | "EME"
    | "OTHER";


export interface BandSegment {

    fromMHz: number;

    toMHz: number;

    type: BandSegmentType;

    label: string;

}


export interface BandDefinition {

    id: string;

    label: string;

    minMHz: number;

    maxMHz: number;

    segments: BandSegment[];

}


export const BAND_DEFINITIONS: BandDefinition[] = [

    {
        id: "160m",
        label: "160m",
        minMHz: 1.800,
        maxMHz: 2.000,
        segments: []
    },

    {
        id: "80m",
        label: "80m",
        minMHz: 3.500,
        maxMHz: 3.800,
        segments: []
    },

    {
        id: "60m",
        label: "60m",
        minMHz: 5.3515,
        maxMHz: 5.3665,
        segments: []
    },

    {
        id: "40m",
        label: "40m",
        minMHz: 7.000,
        maxMHz: 7.200,
        segments: []
    },

    {
        id: "30m",
        label: "30m",
        minMHz: 10.100,
        maxMHz: 10.150,
        segments: []
    },

    {
        id: "20m",
        label: "20m",
        minMHz: 14.000,
        maxMHz: 14.350,
        segments: []
    },

    {
        id: "17m",
        label: "17m",
        minMHz: 18.068,
        maxMHz: 18.168,
        segments: []
    },

    {
        id: "15m",
        label: "15m",
        minMHz: 21.000,
        maxMHz: 21.450,
        segments: []
    },

    {
        id: "12m",
        label: "12m",
        minMHz: 24.890,
        maxMHz: 24.990,
        segments: []
    },

    {
        id: "10m",
        label: "10m",
        minMHz: 28.000,
        maxMHz: 29.700,
        segments: []
    },

    {
        id: "6m",
        label: "6m",
        minMHz: 50.000,
        maxMHz: 52.000,
        segments: []
    },

    {
        id: "2m",
        label: "2m",
        minMHz: 144.000,
        maxMHz: 146.000,
        segments: []
    },

    {
        id: "70cm",
        label: "70cm",
        minMHz: 430.000,
        maxMHz: 440.000,
        segments: []
    }

];
