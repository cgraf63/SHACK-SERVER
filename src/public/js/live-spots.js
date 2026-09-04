let liveSpotsTimer = null;
console.log("LIVE SPOTS JS LOADED");

let currentSpots = [];

function getLiveSpotPageSize() {
    return window.screen.height < 1100 ? 13 : 15;
}
let liveSpotOffset = 0;

let liveSpotOrder = [];

let workedStatus = {

    calls: new Set(),

    callsOnBand: new Set(),

    countries: new Set(),

    countriesOnBand: new Set()

};

let liveSpotsUpdating =
    false;

async function loadWorkedStatus() {

    try {

        const response =
            await fetch(
                "/api/qso/worked"
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        workedStatus.calls =
            new Set(
                data.calls || []
            );


        workedStatus.callsOnBand =
            new Set(
                data.callsOnBand || []
            );


        workedStatus.countries =
            new Set(
                data.countries || []
            );


        workedStatus.countriesOnBand =
            new Set(
                data.countriesOnBand || []
            );

    }

    catch (error) {

        console.error(
            "Worked status load failed:",
            error
        );

    }

}

function getWorkedStatus(spot) {

    const call =
        String(spot.call || "")
            .trim()
            .toUpperCase();

    const band =
        String(spot.band || "")
            .trim()
            .toUpperCase();

    const country =
        String(spot.countryCode || "")
            .trim()
            .toLowerCase();


    const stationOnBand =
        workedStatus.callsOnBand.has(
            `${call}|${band}`
        );


    const countryOnBand =
        workedStatus.countriesOnBand.has(
            `${country}|${band}`
        );


    const station =
        workedStatus.calls.has(
            call
        );


    const countryWorked =
        workedStatus.countries.has(
            country
        );


    if (stationOnBand) {

        return "station-band";

    }


    if (countryOnBand) {

        return "country-band";

    }


    if (station) {

        return "station";

    }


    if (countryWorked) {

        return "country";

    }


    return "new";

}


let selectedModes = [];
let selectedBand = "ALL";
let selectedCountry = "ALL";
let selectedSource = "ALL";
let selectedConfidence = 0;

let sortField = "age";


let sortDirection = "asc";





function sortSpots(spots) {

    const numericFields = new Set([
        "frequency",
        "distance",
        "azimuth",
        "age",
        "confidence"
    ]);


    return spots.sort(
        (a, b) => {

            let valueA =
                a[sortField];

            let valueB =
                b[sortField];


            /*
                Numeric fields
            */

            if (
                numericFields.has(sortField)
            ) {

                valueA =
                    Number(
                        String(
                            valueA ?? ""
                        ).replace(
                            /[^0-9.-]/g,
                            ""
                        )
                    );

                valueB =
                    Number(
                        String(
                            valueB ?? ""
                        ).replace(
                            /[^0-9.-]/g,
                            ""
                        )
                    );


                if (
                    !Number.isFinite(valueA)
                ) {

                    valueA =
                        sortDirection === "asc"
                            ? Infinity
                            : -Infinity;

                }


                if (
                    !Number.isFinite(valueB)
                ) {

                    valueB =
                        sortDirection === "asc"
                            ? Infinity
                            : -Infinity;

                }

            }


            /*
                Text fields
            */

            else {

                valueA =
                    String(
                        valueA ?? ""
                    ).toLowerCase();

                valueB =
                    String(
                        valueB ?? ""
                    ).toLowerCase();

            }


            if (
                valueA < valueB
            ) {

                return sortDirection === "asc"
                    ? -1
                    : 1;

            }


            if (
                valueA > valueB
            ) {

                return sortDirection === "asc"
                    ? 1
                    : -1;

            }


            return 0;

        }
    );

}

function filterSpots(spots) {

    return spots.filter(
        spot =>

            (
                                selectedModes.length === 0 ||
                selectedModes.some(
                    selectedMode => {

                        const mode =
                            String(
                                spot.mode || ""
                            ).toUpperCase();

                        if (selectedMode === "SSB") {
                            return [
                                "SSB",
                                "USB",
                                "LSB",
                                "AM"
                            ].includes(mode);
                        }

                        if (selectedMode === "DIGITAL") {
                            return [
                                "FT8",
                                "FT4",
                                "RTTY",
                                "PSK31"
                            ].includes(mode);
                        }

                        return mode ===
                            selectedMode;
                    }
                )
            )

            &&

            (
                !selectedBand ||
                selectedBand === "ALL" ||
                spot.band === selectedBand
            )

            &&

            (
                !selectedCountry ||
                selectedCountry === "ALL" ||
                spot.countryCode === selectedCountry
            )

            &&

            (
                !selectedSource ||
                selectedSource === "ALL" ||
                spot.source.includes(selectedSource)
            )

            &&

            (
                selectedConfidence === 0 ||
                spot.confidence >= selectedConfidence
            )

    );

}

function updateModeFilter(spots) {

    const button =
        document.getElementById(
            "modeFilterButton"
        );

    const menu =
        document.getElementById(
            "modeFilterMenu"
        );


    if (
        !button ||
        !menu
    ) {
        return;
    }
if (
    button.dataset.modeFilterReady !== "1"
) {

    button.dataset.modeFilterReady = "1";

    button.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            menu.hidden =
                !menu.hidden;

        }
    );


    menu.addEventListener(
        "click",
        event => {

            event.stopPropagation();

        }
    );


    document.addEventListener(
        "click",
        () => {

            menu.hidden =
                true;

        }
    );

}

    const modes = [
        ...new Set(
            spots
                .map(
                    spot =>
                        String(
                            spot.mode || ""
                        ).toUpperCase()
                )
                .filter(
                    mode =>
                        mode &&
                        mode !== "UNKNOWN"
                )
        )
    ].sort();


    const groups = [
        {
            value: "SSB",
            label: "SSB"
        },
        {
            value: "CW",
            label: "CW"
        },
        {
            value: "DIGITAL",
            label: "DIGITAL"
        },
        {
            value: "FM",
            label: "FM"
        }
    ];


    const groupMembers = {
        SSB: [
            "SSB",
            "USB",
            "LSB",
            "AM"
        ],

        CW: [
            "CW"
        ],

        DIGITAL: [
            "FT8",
            "FT4",
            "RTTY",
            "PSK31"
        ],

        FM: [
            "FM"
        ]
    };


    menu.innerHTML = "";


    const createSection =
        title => {

            const section =
                document.createElement(
                    "div"
                );

            section.className =
                "mode-filter-section";

            section.textContent =
                title;

            menu.appendChild(
                section
            );
        };


    const createOption =
        (
            value,
            label,
            isGroup
        ) => {

            const wrapper =
                document.createElement(
                    "label"
                );

            wrapper.className =
                isGroup
                    ? "mode-filter-option mode-filter-group"
                    : "mode-filter-option";


            const checkbox =
                document.createElement(
                    "input"
                );

            checkbox.type =
                "checkbox";

            checkbox.value =
                value;

            checkbox.checked =
                selectedModes.includes(
                    value
                );


            checkbox.addEventListener(
                "change",
                () => {

                    if (
                        checkbox.checked
                    ) {

                        if (
                            !selectedModes.includes(
                                value
                            )
                        ) {

                            selectedModes.push(
                                value
                            );

                        }

                    }
                    else {

                        selectedModes =
                            selectedModes.filter(
                                mode =>
                                    mode !== value
                            );

                    }


                    updateModeFilter(
                        spots
                    );

                    renderLiveSpots();

                }
            );


            wrapper.appendChild(
                checkbox
            );

            wrapper.append(
                document.createTextNode(
                    label
                )
            );

            menu.appendChild(
                wrapper
            );
        };


    createSection(
        "GROUPS"
    );


    groups.forEach(
        group => {

            createOption(
                group.value,
                group.label,
                true
            );

        }
    );


    createSection(
        "MODES"
    );


    modes.forEach(
        mode => {

            const belongsToGroup =
                Object.values(
                    groupMembers
                )
                    .some(
                        members =>
                            members.includes(
                                mode
                            )
                    );


            if (
                belongsToGroup &&
                [
                    "SSB",
                    "CW",
                    "DIGITAL",
                    "FM"
                ].includes(mode)
            ) {
                return;
            }


            createOption(
                mode,
                mode,
                false
            );

        }
    );


    if (
        selectedModes.length === 0
    ) {

        button.textContent =
            "ALL MODES";

    }
    else {

        button.textContent =
            selectedModes.join(
                ", "
            );

    }

}


function updateBandFilter(spots) {

    const select =
        document.getElementById(
            "bandFilter"
        );


    if (!select) {
        return;
    }


    const current =
        select.value;


    const bands =
        [
            ...new Set(
                spots
                    .map(
                        s => s.band
                    )
                    .filter(
                        b => b
                    )
            )
        ]
        .sort();


    select.innerHTML =
        `
        <option value="">
            ALL BANDS
        </option>
        `;


    bands.forEach(
        band => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                band;

            option.textContent =
                band;

            select.appendChild(
                option
            );

        }
    );


    select.value =
        current;

}


function updateCountryFilter(spots) {

    const select =
        document.getElementById(
            "countryFilter"
        );


    if (!select) {
        return;
    }


    const current =
        select.value;


    const countries =
        [
            ...new Set(
                spots
                    .map(
                        s => s.countryCode
                    )
                    .filter(
                        c => c
                    )
            )
        ]
        .sort();


    select.innerHTML =
        `
        <option value="">
            ALL COUNTRIES
        </option>
        `;


    countries.forEach(
        country => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                country;

            option.textContent =
                country.toUpperCase();

            select.appendChild(
                option
            );

        }
    );


    select.value =
        current;

}


function updateSourceFilter(spots) {

    const select =
        document.getElementById(
            "sourceFilter"
        );


    if (!select) {
        return;
    }


    const current =
        select.value;


    const sources =
        [
            ...new Set(
                spots
                    .flatMap(
                        s =>
                            s.source
                                .split(", ")
                    )
                    .filter(
                        s => s
                    )
            )
        ]
        .sort();


    select.innerHTML =
        `
        <option value="">
            ALL SOURCES
        </option>
        `;


    sources.forEach(
        source => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                source;

            option.textContent =
                source;

            select.appendChild(
                option
            );

        }
    );


    select.value =
        current;

}






function updateSortIcons() {


    document
        .querySelectorAll(
            "th[data-sort]"
        )
        .forEach(
            th => {


                const icon =
                    th.querySelector(
                        ".sort-icon"
                    );


                if (!icon) {

                    return;

                }


                if (
                    th.dataset.sort === sortField
                ) {

                    icon.textContent =
                        sortDirection === "asc"
                        ?
                        "↑"
                        :
                        "↓";

                }
                else {

                    icon.textContent =
                        "↕";

                }


            }
        );
}

function mapSpotModeToRgo(
    mode,
    frequencyHz
) {

    const normalized =
        String(mode || "").toUpperCase();

    if (
        normalized === "SSB"
    ) {

        if (
            frequencyHz < 10000000
        ) {

            return "LSB";

        }

        return "USB";

    }

    if (
        normalized === "CW"
    ) {

        return "CW";

    }

    if (
        normalized === "CW-R"
    ) {

        return "CW-R";

    }

    if (
        normalized === "AM"
    ) {

        return "AM";

    }

    if (
        normalized === "FM"
    ) {

        return "FM";

    }

    return null;

}

function setupSpotSorting() {

    if (
        window.liveSpotSortingInitialized
    ) {
        return;
    }

    window.liveSpotSortingInitialized = true;


    document.addEventListener(
        "click",
        event => {

            const th =
                event.target.closest(
                    "th[data-sort]"
                );


            if (!th) {
                return;
            }


            const field =
                th.dataset.sort;


            if (!field) {
                return;
            }


            if (
                sortField === field
            ) {

                sortDirection =
                    sortDirection === "asc"
                        ? "desc"
                        : "asc";

            }
            else {

                sortField =
                    field;

                sortDirection =
                    "asc";

            }


          



            renderLiveSpots();

        }
    );

}


function updateLiveSpotOrder(spots) {

    const currentKeys =
        new Set(
            spots.map(
                spot =>
                    `${spot.call}|${spot.frequency}|${spot.mode}`
            )
        );


    // Entfernte Spots aus der Historie entfernen

    liveSpotOrder =
        liveSpotOrder.filter(
            key =>
                currentKeys.has(key)
        );


    // Neue Spots feststellen

    const knownKeys =
        new Set(
            liveSpotOrder
        );


    const newKeys =
        spots
            .map(
                spot =>
                    `${spot.call}|${spot.frequency}|${spot.mode}`
            )
            .filter(
                key =>
                    !knownKeys.has(key)
            );


    // Neue Spots ganz nach vorne

    liveSpotOrder =
        [
            ...newKeys,
            ...liveSpotOrder
        ];

}


function renderLiveSpots() {


    const table =
        document.getElementById(
            'spotTableBody'
        );


    if (!table) {

        return;

    }



    table.innerHTML = "";



    const filtered =
    filterSpots(
        [...currentSpots]
    );


    const sorted =
        sortSpots(
            filtered
    );


    const pageSlider =
        document.getElementById(
            "liveSpotsSlider"
        );


    if (
        pageSlider &&
        pageSlider.dataset.ready !== "1"
    ) {

        pageSlider.dataset.ready =
            "1";

        pageSlider.addEventListener(
            "input",
            () => {

                liveSpotOffset =
                    Number(
                        pageSlider.value
                    ) || 0;

                renderLiveSpots();

            }
        );

    }


    const maxOffset =
        Math.max(
            0,
            sorted.length -
            getLiveSpotPageSize()
        );


    liveSpotOffset =
        Math.min(
            liveSpotOffset,
            maxOffset
        );


    if (pageSlider) {
        pageSlider.style.height = window.screen.height < 1100 ? "480px" : "640px";
        pageSlider.style.height = window.screen.height < 1100 ? "480px" : "640px";

        pageSlider.max =
            String(maxOffset);

        pageSlider.value =
            String(liveSpotOffset);

        pageSlider.disabled =
            maxOffset === 0;

    }


    sorted
        .slice(
            liveSpotOffset,
            liveSpotOffset +
            getLiveSpotPageSize()
        )
        .forEach(
            spot => {

	    const worked =
		getWorkedStatus(spot);

            const row =
                document.createElement(
                    'tr'
                );



      
               
            row.innerHTML = `




<td
    class="call-cell"
    title="${
        spot.countryCode
            ? new Intl.DisplayNames(
                  ["de-CH"],
                  { type: "region" }
              ).of(
                  String(
                      spot.countryCode
                  ).toUpperCase()
              ) || ""
            : ""
    }"
>

    ${
        worked === "station-band"
            ? `<span class="worked-indicator worked-station-band" title="Station auf diesem Band gearbeitet">●</span>`
            : worked === "country-band"
                ? `<span class="worked-indicator worked-country-band" title="Land auf diesem Band gearbeitet">●</span>`
                : worked === "station"
                    ? `<span class="worked-indicator worked-station" title="Station bereits gearbeitet">●</span>`
                    : worked === "country"
                        ? `<span class="worked-indicator worked-country" title="Land bereits gearbeitet">●</span>`
                        : `<span class="worked-indicator worked-new" title="Noch nicht gearbeitet">●</span>`

      }

      ${
          spot.countryCode
              ?
              `<img
                  src="/assets/flags/${spot.countryCode}.svg"
                  class="flag"
                  title="${
                      new Intl.DisplayNames(
                          ["de-CH"],
                          { type: "region" }
                      ).of(
                          String(
                              spot.countryCode
                          ).toUpperCase()
                      ) || ""
                  }"
                  alt=""
              >`
              :
              ""
      }

    <span>
        ${
            spot.activity === "POTA"
                ? `<span style="color:#00c853; font-size:12px; margin-right:5px;">▲</span>`
                : spot.activity === "SOTA"
                    ? `<span style="color:white; font-size:12px; margin-right:5px;">▲</span>`
                    : ""
        }
        ${spot.call}
    </span>

</td>



                <td class="frequency">
                    ${spot.frequency}
                </td>



                <td>
    ${
        spot.mode === "UNKNOWN"
            ? "-"
            : spot.mode
    }
</td>



                <td class="comment-cell">
                    ${
                        Array.isArray(spot.comments)
                        && spot.comments.length
                            ? spot.comments[0]
                            : "-"
                    }
                </td>



                <td>
                    ${
                        spot.distance !== undefined
                        ?
                        `${spot.distance} km`
                        :
                        "-"
                    }
                </td>



                <td>
                    ${
                        spot.azimuth !== undefined
                        ?
                        `${spot.azimuth}°`
                        :
                        "-"
                    }
                </td>



                <td class="source">
                    ${spot.source}
                </td>

  



       



                <td>
                    ${spot.age}
                </td>



                <td class="confidence">
                    ${spot.confidence}%
                </td>



                <td class="spot-actions">

    <button
        class="spot-btn details-btn"
	data-action="details"
	data-call="${spot.call}"
	title="View details">
        👀
    </button>

    <button
    class="spot-btn tune-btn"
    data-frequency="${spot.frequency}"
    data-mode="${spot.mode}"
    data-call="${spot.call}"
    title="Tune radio">
    🎯
</button>

<button
    class="spot-btn qso-btn"
    title="Log QSO">
    📝
</button>



</td>


            `;



            table.appendChild(
                row
            );


/*
    View details button
*/

const detailsButton =
    row.querySelector(
        ".details-btn"
    );

if (detailsButton) {

    detailsButton.addEventListener(
        "click",
        () => {

            console.log(
                "VIEW DETAILS:",
                spot
            );

            showSpotDetails(
                spot
            );

        }
    );

}



            /*
                QSO button

                The complete live-spot object is frozen at the
                exact moment of the click. The UTC timestamp is
                generated here and therefore represents the
                actual moment the operator selected the spot.
            */

            const qsoButton =
                row.querySelector(
                    ".qso-btn"
                );


            if (qsoButton) {

                qsoButton.addEventListener(
                    "click",
                    async () => {

                        console.log(
                            "OPEN QSO:",
                            spot
                        );


                        const qsoSpot = {

                            ...spot,

                            qsoTimeUtc:
                                new Date().toISOString()

                        };


                        /*
                            Load the station data so the QSO
                            dialog receives the current station
                            callsign and locator (e.g. HB9ISO / JN36FL).
                        */

                        let station = null;


                        try {

                            const response =
                                await fetch(
                                    "/api/station"
                                );


                            if (!response.ok) {

                                throw new Error(
                                    `Station API failed: HTTP ${response.status}`
                                );

                            }


                            station =
                                await response.json();


                        }
                        catch (error) {

                            console.error(
                                "Station data loading failed:",
                                error
                            );

                            return;

                        }


                        if (
                            typeof openQsoDialog !==
                            "function"
                        ) {

                            console.error(
                                "openQsoDialog() is not available."
                            );

                            return;

                        }


                        openQsoDialog(
                            qsoSpot,
                            station
                        );

                    }
                );

            }


      	/*
    Tune button
*/

const tuneButton =
    row.querySelector(
        ".tune-btn"
    );


if (tuneButton) {

    tuneButton.addEventListener(
        "click",
        async event => {

            const button =
                event.currentTarget;


            const spotFrequency =
                button.dataset.frequency;


            const spotMode =
                button.dataset.mode;


            const spotCall =
                button.dataset.call;


            console.log(
                "TUNE CLICK:",
                {
                    call:
                        spotCall,

                    frequency:
                        spotFrequency,

                    mode:
                        spotMode
                }
            );


            /*
                FT8 vorerst nicht tunen
            */

            if (
                !spotMode ||
                spotMode.toUpperCase() ===
                    "FT8"
            ) {

                console.log(
                    "Radio tune skipped:",
                    spotMode
                );

                return;

            }


            const frequencyKHz =
                Number(
                    spotFrequency
                );


            if (
                !Number.isFinite(
                    frequencyKHz
                )
            ) {

                console.error(
                    "Invalid spot frequency:",
                    spotFrequency
                );

                return;

            }


            const frequencyHz =
                Math.round(
                    frequencyKHz *
                    1000
                );


            const mode =
                mapSpotModeToRgo(
                    spotMode,
                    frequencyHz
                );


            if (!mode) {

                console.log(
                    "Radio tune skipped:",
                    spotMode
                );

                return;

            }


            console.log(
                "TUNING RADIO:",
                {
                    call:
                        spotCall,

                    frequencyKHz:
                        frequencyKHz,

                    frequencyHz:
                        frequencyHz,

                    mode:
                        mode
                }
            );


            try {

                const response =
                    await fetch(
                        "/api/radio/tune",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    {
                                        frequency:
                                            frequencyHz,

                                        mode:
                                            mode
                                    }
                                )
                        }
                    );


                const result =
                    await response.json();


                if (
                    !response.ok
                ) {

                    console.error(
                        "Radio tune failed:",
                        result
                    );

                    return;

                }


                console.log(
                    "Radio tuned:",
                    result
                );


                /*
                    Optional:
                    Station-Anzeige sofort
                    aktualisieren
                */

                if (
                    typeof updateStationInline ===
                    "function"
                ) {

                    updateStationInline();

                }

            }
            catch (error) {

                console.error(
                    "Radio tune request failed:",
                    error
                );

            }

        }
    );

            }
        }
    );


    updateSortIcons();

}

        
               

function updateDxOpportunity() {

    const element =
        document.getElementById(
            "dx-opportunity-value"
        );

    if (!element) {
        return;
    }


console.log(
    "TOP DISTANCE SPOTS:",
    [...currentSpots]
        .filter(
            s => s.distance !== undefined
        )
        .sort(
            (a,b) =>
                b.distance - a.distance
        )
        .slice(0,10)
        .map(
            s => ({
                call: s.call,
                distance: s.distance,
                frequency: s.frequency,
                mode: s.mode,
                age: s.age
            })
        )
);


    const dx =
    [...currentSpots]
        .filter(
            spot =>
                spot.distance !== undefined
        )
        .sort(
            (a,b) =>
                b.distance - a.distance
        )[0];

    if (!dx) {

        element.textContent =
            "No DX data";

        return;
    }


    const mhz =
        dx.frequency
            ? (
                Number(dx.frequency) / 1000
              ).toFixed(3)
              + " MHz"
            : "";


    const mode =
    dx.mode !== "UNKNOWN"
        ? " " + dx.mode
        : "";


console.log(
    "DX OBJECT JSON",
    JSON.stringify(dx, null, 2)
);

element.innerHTML =
    `
    ${
        dx.countryCode
            ? `<img class="dx-flag" src="/assets/flags/${dx.countryCode}.svg">`
            : ""
    }
    ${dx.call} on ${mhz}${mode}
    `;


}

function updateOpportunities() {

    const items = [];

    const newDxcc =
        currentSpots.some(
            spot =>
                spot.countryCode &&
                !workedStatus.countries.has(
                    spot.countryCode.toLowerCase()
                )
        );

    const newBand =
        currentSpots.some(
            spot =>
                spot.countryCode &&
                workedStatus.countries.has(
                    spot.countryCode.toLowerCase()
                ) &&
                !workedStatus.countriesOnBand.has(
                    `${spot.countryCode.toLowerCase()}|${String(spot.band || "").toUpperCase()}`
                )
        );

    const activity =
        currentSpots.some(
            spot =>
                spot.activity === "POTA" ||
                spot.activity === "SOTA"
        );

    const multiCluster =
        currentSpots.some(
            spot =>
                Array.isArray(spot.sources) &&
                spot.sources.length >= 2
        );

    if (newDxcc) {
        items.push("NEW DXCC");
    }

    if (newBand) {
        items.push("NEW BAND");
    }

    if (activity) {
        items.push("POTA/SOTA");
    }

    if (multiCluster) {
        items.push("MULTI-CLUSTER");
    }

    const element =
        document.getElementById(
            "opportunities-value"
        );

    const title =
        document.getElementById(
            "opportunities-title"
        );

    if (!element || !title) {
        return;
    }

    if (!items.length) {

        title.textContent =
            "NO OPPORTUNITIES";

        element.textContent =
            "Nothing requiring attention";

        return;
    }

    title.textContent =
        `${items.length} OPPORTUNIT${items.length === 1 ? "Y" : "IES"}`;

    element.textContent =
        items.join(" · ");
}


async function updateLiveSpots() {

    if (
        liveSpotsUpdating
    ) {

        return;

    }


    liveSpotsUpdating =
        true;


    try {

        await loadWorkedStatus();


        const response =
            await fetch(
                '/api/spots'
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        currentSpots =
            await response.json();


        /*
            Update filters
        */

        updateBandFilter(
            currentSpots
        );


        updateModeFilter(
            currentSpots
        );


        updateCountryFilter(
            currentSpots
        );


        updateSourceFilter(
            currentSpots
        );


        /*
            Update dashboard elements
        */

        updateDxOpportunity();


        updateOpportunities();


        updatePriorityDX();


                /*
            Render live spots table
        */

        renderLiveSpots();

    }
    catch (error) {

        console.error(
            "Live spots update failed:",
            error
        );

    }
    finally {

        liveSpotsUpdating =
            false;

    }

}

function setupSpotFilters() {


const resetView =
    document.getElementById(
        "resetView"
    );


if (resetView) {

    resetView.addEventListener(
        "click",
        () => {

            selectedModes = [];
            selectedBand = "ALL";
            selectedCountry = "ALL";
            selectedSource = "ALL";
            selectedConfidence = 0;


            document.getElementById(
                "modeFilter"
            ).value = "";


            document.getElementById(
                "bandFilter"
            ).value = "";


            document.getElementById(
                "countryFilter"
            ).value = "";


            document.getElementById(
                "sourceFilter"
            ).value = "";


            document.getElementById(
                "confidenceFilter"
            ).value = "";


            updateLiveSpots();

        }
    );

}



const confidence =
    document.getElementById(
        "confidenceFilter"
    );


if (confidence) {

    confidence.addEventListener(
        "change",
        () => {

            selectedConfidence =
                Number(
                    confidence.value
                ) || 0;


            renderLiveSpots();

        }
    );

}


const source =
    document.getElementById(
        "sourceFilter"
    );


if (source) {

    source.addEventListener(
        "change",
        () => {

            selectedSource =
                source.value ||
                "ALL";

            renderLiveSpots();

        }
    );

}

const country =
    document.getElementById(
        "countryFilter"
    );


if (country) {

    country.addEventListener(
        "change",
        () => {

            selectedCountry =
                country.value ||
                "ALL";

            renderLiveSpots();

        }
    );

}


}
function setupWorkedHelp() {

    const button =
        document.getElementById(
            "worked-help-btn"
        );

    if (!button) {
        return;
    }

    if (button.dataset.helpReady === "1") {
        return;
    }

    button.dataset.helpReady = "1";

    button.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            const existing =
                document.getElementById(
                    "worked-help-popup"
                );

            if (existing) {
                existing.remove();
                return;
            }

            const popup =
                document.createElement(
                    "div"
                );

            popup.id =
                "worked-help-popup";

            popup.innerHTML = `
                <div class="worked-help-row">
                    <span class="worked-help-dot worked-help-green">●</span>
                    <span>Station + Band</span>
                </div>

                <div class="worked-help-row">
                    <span class="worked-help-dot worked-help-yellow">●</span>
                    <span>Land + Band</span>
                </div>

                <div class="worked-help-row">
                    <span class="worked-help-dot worked-help-blue">●</span>
                    <span>Station bereits gearbeitet</span>
                </div>

                <div class="worked-help-row">
                    <span class="worked-help-dot worked-help-purple">●</span>
                    <span>Land bereits gearbeitet</span>
                </div>

                <div class="worked-help-row">
                    <span class="worked-help-dot worked-help-new">●</span>
                    <span>Neu</span>
                </div>
            `;

            document.body.appendChild(
                popup
            );

            const rect =
                button.getBoundingClientRect();

            popup.style.left =
                `${rect.left}px`;

            popup.style.top =
                `${rect.bottom + 6}px`;

        }
    );

    document.addEventListener(
        "click",
        (event) => {

            const popup =
                document.getElementById(
                    "worked-help-popup"
                );

            if (
                popup &&
                event.target !== button &&
                !popup.contains(event.target)
            ) {
                popup.remove();
            }

        }
    );
}

function startLiveSpotsUpdater() {


    setupSpotSorting();
  
    setupSpotFilters();

    setupWorkedHelp();


    updateLiveSpots();



    if (
        liveSpotsTimer !== null
    ) {


        clearInterval(
            liveSpotsTimer
        );


    }



    liveSpotsTimer =
        setInterval(

            updateLiveSpots,

            15000

        );


}







window.addEventListener(

    "componentsLoaded",

    startLiveSpotsUpdater

);
// fallback:

// fallback
setTimeout(
    () => {
        startLiveSpotsUpdater();
    },
    500
);




async function showSpotDetails(spot) {

    const activity =
        spot.activity === "POTA"
            ? `<span style="color:#00c853;">▲ POTA</span>`
            : spot.activity === "SOTA"
                ? `<span style="color:white;">▲ SOTA</span>`
                : "";

const flag =
    spot.countryCode
        ? `<img
                class="dx-flag"
                src="/assets/flags/${spot.countryCode}.svg"
		title="${spot.country || ""}"
alt="${spot.country || ""}"
                style="width:20px; height:14px; vertical-align:middle;"
           >`
        : "";
    const distance =
        spot.distance !== undefined
            ? `${spot.distance.toLocaleString("de-CH")} km`
            : "—";

    const azimuth =
        spot.azimuth !== undefined
            ? `${spot.azimuth}°`
            : "—";

    const frequency =
        Number(spot.frequency)
            .toLocaleString("de-CH");

    const overlay =
        document.createElement("div");

    overlay.id =
        "spot-details-overlay";

    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    overlay.innerHTML = `

        <div
            id="spot-details-dialog"
            style="
                position: relative;
                width: 90vw;
                max-width: 1100px;
                background: #0b151e;
                border-radius: 10px;
                padding: 18px;
                box-shadow: 0 10px 40px rgba(0,0,0,.6);
            "
        >

            <button
                id="spot-details-close"
                type="button"
                style="
                    position:absolute;
                    right:12px;
                    top:8px;
                    background:none;
                    border:none;
                    color:white;
                    font-size:20px;
                    cursor:pointer;
                "
            >✕</button>


            <div
                style="
                    display:flex;
                    align-items:center;
                    gap:22px;
                    padding-right:35px;
                    font-size:16px;
                    white-space:nowrap;
                "
            >

                <span>
                    ${flag}${spot.call}
                </span>

                <span>
                    ${frequency} kHz
                </span>

                <span>
                    ${spot.mode}
                </span>

                <span>
                    ${distance}
                </span>

                <span>
                    ${azimuth}
                </span>

                ${activity}

            </div>


            <div
                <div
    id="spot-details-map"
    style="
        margin-top:18px;
        height:550px;
        border-radius:6px;
        overflow:hidden;
    "
></div>

        </div>
    `;

    document.body.appendChild(
        overlay
    );


const mapElement =
    document.getElementById(
        "spot-details-map"
    );

if (!mapElement) {
    return;
}

const dxPosition =
    maidenheadToLatLon(
        spot.locator
    );

if (!dxPosition) {

    mapElement.innerHTML =
        "No valid DX locator";

    return;
}


const map =
    L.map(
        mapElement
    );


L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 18,
        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(map);


const dxMarker =
    L.marker([
        dxPosition.lat,
        dxPosition.lon
    ])
    .addTo(map);

dxMarker.bindPopup(
    `<b>${spot.call}</b><br>${spot.locator}`
);


const points = [
    [
        dxPosition.lat,
        dxPosition.lon
    ]
];


try {

    const response =
        await fetch(
            "/api/station"
        );

    if (response.ok) {

        const station =
            await response.json();

        const qthPosition =
            maidenheadToLatLon(
                station.locator
            );

        if (qthPosition) {

            const qthMarker =
                L.marker([
                    qthPosition.lat,
                    qthPosition.lon
                ])
                .addTo(map);

            qthMarker.bindPopup(
                `<b>${station.callsign}</b><br>${station.locator}`
            );


            points.push([
                qthPosition.lat,
                qthPosition.lon
            ]);


            L.polyline(
                [
                    [
                        qthPosition.lat,
                        qthPosition.lon
                    ],
                    [
                        dxPosition.lat,
                        dxPosition.lon
                    ]
                ],
                {
                    weight: 2
                }
            ).addTo(map);

        }

    }

}
catch (error) {

    console.error(
        "Station data failed:",
        error
    );

}


map.fitBounds(
    points,
    {
        padding: [
            40,
            40
        ]
    }
);

    const closeButton =
        document.getElementById(
            "spot-details-close"
        );

    closeButton?.addEventListener(
        "click",
        () => overlay.remove()
    );


    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target === overlay
            ) {
                overlay.remove();
            }

        }
    );

}


function maidenheadToLatLon(locator) {

    if (!locator || locator.length < 4) {
        return null;
    }

    locator =
        locator
            .trim()
            .toUpperCase();

    const lon =
        -180
        + (locator.charCodeAt(0) - 65) * 20
        + (locator.charCodeAt(2) - 48) * 2;

    const lat =
        -90
        + (locator.charCodeAt(1) - 65) * 10
        + (locator.charCodeAt(3) - 48);

    let longitude = lon + 1;
    let latitude = lat + 0.5;

    if (locator.length >= 6) {

        longitude +=
            (locator.charCodeAt(4) - 65)
            * (5 / 60);

        latitude +=
            (locator.charCodeAt(5) - 65)
            * (2.5 / 60);

        longitude += 2.5 / 60;
        latitude += 1.25 / 60;
    }

    return {
        lat: latitude,
        lon: longitude
    };
}

/* =========================================================
   FLAG COUNTRY TOOLTIP
   ========================================================= */

(() => {

    let tooltip = null;

    const countryNames =
        new Intl.DisplayNames(
            ["de-CH"],
            {
                type: "region"
            }
        );


    function getCountryCode(flag) {

        const match =
            flag?.src?.match(
                /\/flags\/([a-z]{2})\.svg/i
            );

        return match
            ? match[1].toUpperCase()
            : "";
    }


    function showTooltip(flag) {

        const code =
            getCountryCode(flag);

        if (!code) {
            return;
        }


        const country =
            countryNames.of(code);

        if (!country) {
            return;
        }


        if (!tooltip) {

            tooltip =
                document.createElement("div");

            tooltip.className =
                "flag-country-tooltip";

            document.body.appendChild(
                tooltip
            );
        }


        tooltip.textContent =
            country;

        tooltip.style.display =
            "block";


        const rect =
            flag.getBoundingClientRect();

        tooltip.style.left =
            `${rect.left + rect.width / 2}px`;

        tooltip.style.top =
            `${rect.top - 8}px`;

    }


    function hideTooltip() {

        if (tooltip) {

            tooltip.style.display =
                "none";

        }

    }


    document.addEventListener(
        "mouseover",
        event => {

            const flag =
                event.target.closest(
                    ".flag"
                );

            if (flag) {

                showTooltip(flag);

            }

        }
    );


    document.addEventListener(
        "mouseout",
        event => {

            if (
                event.target.closest(".flag")
            ) {

                hideTooltip();

            }

        }
    );

})();
