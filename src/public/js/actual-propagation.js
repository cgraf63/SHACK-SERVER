let actualPropagationTimer = null;

function getSpotRegion(countryCode) {

    const code =
        String(countryCode || "")
            .trim()
            .toLowerCase();


    const europe = new Set([
        "by","ru","ua","al","ad","at","by","be","ba","bg","hr","cy","cz",
        "dk","ee","fi","fr","de","gr","hu","is","ie",
        "it","xk","lv","li","lt","lu","mt","md","mc",
        "me","nl","mk","no","pl","pt","ro","ru","sm","rs",
        "sk","si","es","se","ch","tr","ua","gb","va"
    ]);


    const northAmerica = new Set([
        "ca","us","mx"
    ]);


    const southAmerica = new Set([
        "ar","bo","br","cl","co","ec","fk","gf",
        "gy","pe","py","sr","uy","ve"
    ]);


    const asia = new Set([
        "cn","hk","in","id","ir","iq","il","jp","jo",
        "kr","kp","kw","la","lb","my","mn","np","om",
        "pk","ph","qa","sa","sg","th","tw","vn","ye"
    ]);


    const pacific = new Set([
        "au","fj","ki","mh","fm","nr","nz","pw",
        "pg","sb","to","tv","vu","ws"
    ]);


    const africa = new Set([
        "dz","ao","bj","bw","bf","bi","cv","cm","cf",
        "td","km","cg","cd","dj","eg","gq","er","sz",
        "et","ga","gm","gh","gn","gw","ci","ke","ls",
        "lr","ly","mg","mw","ml","mr","mu","ma","mz",
        "na","ne","ng","rw","st","sn","sc","sl","so",
        "za","ss","sd","tz","tg","tn","ug","zm","zw"
    ]);


const centralAmerica = new Set([
    "bz",  // Belize
    "cr",  // Costa Rica
    "gt",  // Guatemala
    "hn",  // Honduras
    "ni",  // Nicaragua
    "pa",  // Panama
    "sv"   // El Salvador
]);

const caribbean = new Set([
    "ag",  // Antigua and Barbuda
    "aw",  // Aruba
    "bb",  // Barbados
    "bl",  // Saint Barthélemy
    "bm",  // Bermuda
    "bq",  // Caribbean Netherlands
    "bs",  // Bahamas
    "cu",  // Cuba
    "cw",  // Curaçao
    "dm",  // Dominica
    "do",  // Dominican Republic
    "gd",  // Grenada
    "gp",  // Guadeloupe
    "ht",  // Haiti
    "jm",  // Jamaica
    "kn",  // Saint Kitts and Nevis
    "ky",  // Cayman Islands
    "lc",  // Saint Lucia
    "mf",  // Saint Martin
    "mq",  // Martinique
    "ms",  // Montserrat
    "pr",  // Puerto Rico
    "sx",  // Sint Maarten
    "tc",  // Turks and Caicos Islands
    "tt",  // Trinidad and Tobago
    "vc",  // Saint Vincent and the Grenadines
    "vg",  // British Virgin Islands
    "vi"   // US Virgin Islands
]);

if (europe.has(code)) {
    return "EUROPE";
}

if (northAmerica.has(code)) {
    return "NORTH AMERICA";
}

if (centralAmerica.has(code)) {
    return "CENTRAL AMERICA";
}

if (caribbean.has(code)) {
    return "CARIBBEAN";
}

if (southAmerica.has(code)) {
    return "SOUTH AMERICA";
}

if (asia.has(code)) {
    return "ASIA";
}

if (pacific.has(code)) {
    return "PACIFIC";
}

if (africa.has(code)) {
    return "AFRICA";
}

    return null;

}

async function updateActualPropagation() {

    const element =
        document.getElementById(
            "actual-propagation-status"
        );

    if (!element) {
        return;
    }


    try {

        const [
            spotsResponse,
            propagationResponse
        ] = await Promise.all([

            fetch("/api/spots"),

            fetch("/api/propagation")

        ]);


        if (
            !spotsResponse.ok ||
            !propagationResponse.ok
        ) {

            throw new Error(
                "Propagation API request failed"
            );

        }


        const spots =
            await spotsResponse.json();

        const propagation =
            await propagationResponse.json();


        /*
            Only recent non-activity spots
        */

        const freshSpots =
            spots.filter(
                spot => {

                    const age =
                        parseInt(
                            String(
                                spot.age || ""
                            ).replace(
                                /[^0-9]/g,
                                ""
                            ),
                            10
                        );

                    if (
                        !Number.isFinite(age) ||
                        age > 600
                    ) {
                        return false;
                    }


                    if (
                        spot.activity === "POTA" ||
                        spot.activity === "SOTA"
                    ) {
                        return false;
                    }


                    return (
                        spot.band &&
                        spot.countryCode
                    );

                }
            );


        /*
            Analyze each band
        */

        const candidates =
            propagation.bands
                .map(
                    bandData => {

                        const band =
                            String(
                                bandData.band
                            ).toUpperCase();


                        const bandSpots =
                            freshSpots.filter(
                                spot =>
                                    String(
                                        spot.band
                                    ).toUpperCase()
                                    === band
                            );


                        const dxcc =
                            new Set(
                                bandSpots.map(
                                    spot =>
                                        String(
                                            spot.countryCode
                                        ).toLowerCase()
                                )
                            );


                        const averageConfidence =
                            bandSpots.length
                                ? bandSpots.reduce(
                                    (sum, spot) =>
                                        sum +
                                        (
                                            Number(
                                                spot.confidence
                                            ) || 0
                                        ),
                                    0
                                )
                                / bandSpots.length
                                : 0;


                        let score =
                            Number(
                                bandData.score
                            ) || 0;


                        /*
                            Actual activity
                        */

                        score +=
                            Math.min(
                                25,
                                bandSpots.length * 3
                            );


                        /*
                            DXCC diversity
                        */

                        score +=
                            Math.min(
                                20,
                                dxcc.size * 4
                            );


                        /*
                            Confidence
                        */

                        score +=
                            averageConfidence * 0.10;


                        return {

                            band:
                                bandData.band,

                            propagation:
                                Number(
                                    bandData.score
                                ) || 0,

                            spots:
                                bandSpots.length,

                            dxcc:
                                dxcc.size,

                            score

                        };

                    }
                )
                .filter(
                    item =>
                        item.spots >= 2 &&
                        item.dxcc >= 2 &&
                        item.propagation >= 40
                )
                .sort(
                    (a,b) =>
                        b.score - a.score
                );


        const best =
            candidates[0];


        if (!best) {


            element.textContent =
                "No clear opening";

            return;

        }


        /*
            Opening strength
        */

        let status =
            "ACTIVE DX";


        if (
            best.spots >= 5 &&
            best.dxcc >= 3 &&
            best.propagation >= 55
        ) {

            status =
                "DX OPENING";

        }



const bestBandSpots =
    freshSpots.filter(
        spot =>
            String(
                spot.band
            ).toUpperCase()
            === String(
                best.band
            ).toUpperCase()
    );


const regionCounts = {};


bestBandSpots.forEach(
    spot => {

        const region =
            getSpotRegion(
                spot.countryCode
            );

        if (!region) {
            return;
        }

        regionCounts[region] =
            (regionCounts[region] || 0) + 1;

    }
);


const bestRegion =
    Object.entries(
        regionCounts
    )
    .sort(
        (a,b) =>
            b[1] - a[1]
    )[0]?.[0];


element.textContent =
    bestRegion
        ? `${best.band} → ${bestRegion} ${status}`
        : `${best.band} → ${status}`;

        console.log(
            "ACTUAL PROPAGATION:",
            best
        );

    }
    catch (error) {

        console.error(
            "Actual propagation update failed:",
            error
        );

    }

}


function startActualPropagation() {

    updateActualPropagation();


    actualPropagationTimer =
        setInterval(
            updateActualPropagation,
            30000
        );

}


window.addEventListener(
    "componentsLoaded",
    startActualPropagation
);
