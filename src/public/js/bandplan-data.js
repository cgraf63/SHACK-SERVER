const BANDPLAN_DATA = [

    {
        band: "160m",
        min: 1.810,
        max: 2.000,
        segments: [
            { start: 1.810, end: 1.838, mode: "CW" },
            { start: 1.838, end: 1.840, mode: "DIGITAL" },
            { start: 1.840, end: 2.000, mode: "ALL MODE" }
        ],
        markers: [
            { frequency: 1.873, label: "EMERGENCY" }
        ]
    },

    {
        band: "80m",
        min: 3.500,
        max: 3.800,
        segments: [
            { start: 3.500, end: 3.570, mode: "CW" },
            { start: 3.570, end: 3.580, mode: "DIGITAL" },
            { start: 3.580, end: 3.600, mode: "DIGITAL / MGM" },
            { start: 3.600, end: 3.775, mode: "ALL MODE" },
            { start: 3.775, end: 3.800, mode: "SSB" }
        ],
        markers: [
            { frequency: 3.760, label: "EMERGENCY" }
        ]
    },

    {
        band: "40m",
        min: 7.000,
        max: 7.200,
        segments: [
            { start: 7.000, end: 7.040, mode: "CW" },
            { start: 7.040, end: 7.060, mode: "DIGITAL" },
            { start: 7.060, end: 7.100, mode: "MGM / DIGITAL" },
            { start: 7.100, end: 7.200, mode: "SSB" }
        ],
        markers: [
            { frequency: 7.110, label: "EMERGENCY" }
        ]
    },

    {
        band: "30m",
        min: 10.100,
        max: 10.150,
        segments: [
            { start: 10.100, end: 10.130, mode: "CW" },
            { start: 10.130, end: 10.150, mode: "DIGITAL / MGM" }
        ]
    },

    {
        band: "20m",
        min: 14.000,
        max: 14.350,
        segments: [
            { start: 14.000, end: 14.070, mode: "CW" },
            { start: 14.070, end: 14.099, mode: "DIGITAL / MGM" },
            { start: 14.099, end: 14.101, mode: "BEACON" },
            { start: 14.101, end: 14.350, mode: "ALL MODE" }
        ],
        markers: [
            { frequency: 14.074, label: "FT8" },
            { frequency: 14.100, label: "IBP BEACON" },
            { frequency: 14.300, label: "EMERGENCY" }
        ]
    },

    {
        band: "17m",
        min: 18.068,
        max: 18.168,
        segments: [
            { start: 18.068, end: 18.095, mode: "CW" },
            { start: 18.095, end: 18.109, mode: "DIGITAL / MGM" },
            { start: 18.109, end: 18.111, mode: "BEACON" },
            { start: 18.111, end: 18.168, mode: "ALL MODE" }
        ],
        markers: [
            { frequency: 18.100, label: "IBP BEACON" },
            { frequency: 18.160, label: "EMERGENCY" }
        ]
    },

    {
        band: "15m",
        min: 21.000,
        max: 21.450,
        segments: [
            { start: 21.000, end: 21.070, mode: "CW" },
            { start: 21.070, end: 21.110, mode: "DIGITAL / MGM" },
            { start: 21.110, end: 21.150, mode: "BEACON / DIGITAL" },
            { start: 21.150, end: 21.450, mode: "ALL MODE" }
        ],
        markers: [
            { frequency: 21.074, label: "FT8" },
            { frequency: 21.360, label: "EMERGENCY" }
        ]
    },

    {
        band: "12m",
        min: 24.890,
        max: 24.990,
        segments: [
            { start: 24.890, end: 24.915, mode: "CW" },
            { start: 24.915, end: 24.929, mode: "DIGITAL / MGM" },
            { start: 24.929, end: 24.931, mode: "BEACON" },
            { start: 24.931, end: 24.990, mode: "ALL MODE" }
        ]
    },

    {
        band: "10m",
        min: 28.000,
        max: 29.700,
        segments: [
            { start: 28.000, end: 28.070, mode: "CW" },
            { start: 28.070, end: 28.120, mode: "DIGITAL / MGM" },
            { start: 28.120, end: 29.000, mode: "ALL MODE" },
            { start: 29.000, end: 29.200, mode: "SSB" },
            { start: 29.200, end: 29.300, mode: "DIGITAL" },
            { start: 29.300, end: 29.510, mode: "SATELLITE" },
            { start: 29.510, end: 29.700, mode: "FM" }
        ]
    },

    {
        band: "6m",
        min: 50.000,
        max: 52.000,
        segments: [
            { start: 50.000, end: 50.100, mode: "CW / MGM" },
            { start: 50.100, end: 50.500, mode: "SSB / CW" },
            { start: 50.500, end: 51.000, mode: "MGM / DIGITAL" },
            { start: 51.000, end: 52.000, mode: "FM / DIGITAL" }
        ],
        markers: [
            { frequency: 50.110, label: "DX CALLING" },
            { frequency: 50.313, label: "FT8" }
        ]
    },

    {
        band: "2m",
        min: 144.000,
        max: 146.000,
        segments: [
            { start: 144.000, end: 144.150, mode: "CW / SSB" },
            { start: 144.150, end: 144.400, mode: "SSB / DIGITAL" },
            { start: 144.400, end: 144.490, mode: "BEACON" },
            { start: 144.490, end: 144.800, mode: "MGM / DIGITAL" },
            { start: 144.800, end: 145.000, mode: "FM / DIGITAL" },
            { start: 145.000, end: 145.200, mode: "FM" },
            { start: 145.200, end: 145.575, mode: "FM / REPEATER" },
            { start: 145.575, end: 145.800, mode: "FM / SIMPLEX" },
            { start: 145.800, end: 146.000, mode: "SATELLITE" }
        ],
        markers: [
            { frequency: 144.300, label: "SSB CALLING" },
            { frequency: 145.500, label: "FM CALLING" }
        ]
    },

    {
        band: "70cm",
        min: 430.000,
        max: 440.000,
        segments: [
            { start: 430.000, end: 432.000, mode: "CW / SSB / DIGITAL" },
            { start: 432.000, end: 432.500, mode: "SSB / DIGITAL" },
            { start: 432.500, end: 432.800, mode: "MGM" },
            { start: 432.800, end: 433.000, mode: "BEACON" },
            { start: 433.000, end: 435.000, mode: "FM / DIGITAL" },
            { start: 435.000, end: 438.000, mode: "SATELLITE / DIGITAL" },
            { start: 438.000, end: 440.000, mode: "FM / REPEATER" }
        ],
        markers: [
            { frequency: 432.200, label: "SSB CALLING" },
            { frequency: 433.500, label: "FM CALLING" }
        ]
    }

];
