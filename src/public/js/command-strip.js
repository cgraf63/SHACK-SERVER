console.log("COMMAND STRIP JS LOADED");
async function updateDXOpportunity() {

    try {

        const response =
            await fetch('/api/priority-dx');


        if (!response.ok) {
            return;
        }


        const spots =
            await response.json();


        if (!spots.length) {

    const saved =
        localStorage.getItem(
            "dx-opportunity"
        );


    if (saved) {

        const element =
            document.getElementById(
                "dx-opportunity-value"
            );


        if (element) {

            element.textContent =
                saved;

        }

    }


    return;

}         

        const spot =
            spots[0];


        const mode =
            spot.mode &&
            spot.mode !== "UNKNOWN"
                ? ` · ${spot.mode}`
                : "";

                const flag =
            spot.flag ?? "🌐";

const text =
    `${flag} ${spot.call} · ${spot.band}${mode}`;


        const element =
    document.getElementById(
        "dx-opportunity-value"
    );


console.log(
    "DX ELEMENT",
    element
);


if (element) {

            element.textContent =
                text;

		localStorage.setItem(
  		"dx-opportunity",
    text
);

        }


    }
    catch(error) {

        console.error(
            "DX Opportunity update failed",
            error
        );

    }

}

console.log("COMMAND STRIP UPDATE START");

updateDXOpportunity();


setInterval(
    updateDXOpportunity,
    15000
);
