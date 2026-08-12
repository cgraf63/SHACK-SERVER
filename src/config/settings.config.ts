export interface ShackSettings {

    callsign: string;

    operatorName: string;

    locator: string;

    club?: string;

    sources: {

        dxspider: boolean;

        holycluster: boolean;

        dxsummit: boolean;

    };

}


export const shackSettings: ShackSettings = {

    callsign: "HB9ISO",

    operatorName: "Christoph",

    locator: "JN36FL",

    club: "HB9OM",

    sources: {

        dxspider: true,

        holycluster: true,

        dxsummit: true

    }

};
