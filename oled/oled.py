from luma.core.interface.serial import i2c
from luma.oled.device import sh1106
from PIL import Image, ImageDraw
import time
import socket



# ============================================================
# IP ADDRESS
# ============================================================

def get_ip_address():

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

        # Keine echte Verbindung notwendig.
        # Damit ermittelt Linux die verwendete lokale IP.
        s.connect(("8.8.8.8", 80))

        ip = s.getsockname()[0]

        s.close()

        return ip

    except Exception:
        return "NO IP"

# ============================================================
# OLED SETUP
# ============================================================

serial = i2c(
    port=1,
    address=0x3C
)

display = sh1106(serial)


# ============================================================
# COMPACT PIXEL FONT 4x7
# ============================================================

FONT = {
    "A": [
        "0110",
        "1001",
        "1001",
        "1111",
        "1001",
        "1001",
        "1001",
    ],

    "C": [
        "0111",
        "1000",
        "1000",
        "1000",
        "1000",
        "1000",
        "0111",
    ],

    "E": [
        "1111",
        "1000",
        "1000",
        "1110",
        "1000",
        "1000",
        "1111",
    ],

    "H": [
        "1001",
        "1001",
        "1001",
        "1111",
        "1001",
        "1001",
        "1001",
    ],

    "K": [
        "1001",
        "1010",
        "1100",
        "1100",
        "1010",
        "1001",
        "1001",
    ],

    "R": [
        "1110",
        "1001",
        "1001",
        "1110",
        "1010",
        "1001",
        "1001",
    ],

    "S": [
        "0111",
        "1000",
        "1000",
        "0110",
        "0001",
        "0001",
        "1110",
    ],

    "V": [
        "1001",
        "1001",
        "1001",
        "1001",
        "1001",
        "0110",
        "0110",
    ],

    "-": [
        "0000",
        "0000",
        "0000",
        "1111",
        "0000",
        "0000",
        "0000",
    ],

    " ": [
        "0000",
        "0000",
        "0000",
        "0000",
        "0000",
        "0000",
        "0000",
    ],
}


def pixel_text(draw, text, x, y, scale=2):

    for char in text.upper():

        bitmap = FONT.get(char, FONT[" "])

        for row, line in enumerate(bitmap):

            for col, pixel in enumerate(line):

                if pixel == "1":

                    draw.rectangle(
                        (
                            x + col * scale,
                            y + row * scale,
                            x + col * scale + scale - 1,
                            y + row * scale + scale - 1,
                        ),
                        fill=1
                    )

        # 4 Pixel Zeichen + 1 Pixel Abstand
        x += 5 * scale


# ============================================================
# SHACK-SERVER LOGO
# ============================================================

def draw_logo(draw, active_node):

    cx = 64
    cy = 34

    # --------------------------------------------------------
    # Node positions
    # --------------------------------------------------------

    nodes = [
        (64, 24),   # oben
        (73, 27),   # oben rechts
        (78, 34),   # rechts
        (73, 41),   # unten rechts
        (64, 44),   # unten
        (55, 41),   # unten links
        (50, 34),   # links
        (55, 27),   # oben links
    ]

    # --------------------------------------------------------
    # Connections
    # --------------------------------------------------------

    for x, y in nodes:

        draw.line(
            (cx, cy, x, y),
            fill=1,
            width=1
        )

    # --------------------------------------------------------
    # Central node
    # --------------------------------------------------------

    draw.ellipse(
        (
            cx - 4,
            cy - 4,
            cx + 4,
            cy + 4
        ),
        fill=1
    )

    # Schwarzer Mittelpunkt
    draw.point(
        (cx, cy),
        fill=0
    )

    # --------------------------------------------------------
    # Outer nodes
    # --------------------------------------------------------

    for index, (x, y) in enumerate(nodes):

        if index == active_node:

            # Aktiver Punkt
            draw.ellipse(
                (
                    x - 3,
                    y - 3,
                    x + 3,
                    y + 3
                ),
                fill=1
            )

        else:

            # Normale Punkte
            draw.ellipse(
                (
                    x - 2,
                    y - 2,
                    x + 2,
                    y + 2
                ),
                fill=1
            )


# ============================================================
# COMPLETE DISPLAY
# ============================================================

def create_screen(active_node):

    image = Image.new(
        "1",
        (128, 64),
        0
    )

    draw = ImageDraw.Draw(image)

    # --------------------------------------------------------
    # Outer frame
    # --------------------------------------------------------

    draw.rectangle(
        (1, 1, 126, 62),
        outline=1
    )

    # --------------------------------------------------------
    # BIG SHACK-SERVER TITLE
    # --------------------------------------------------------

    title = "SHACK-SERVER"

    title_width = len(title) * 10 - 2

    title_x = (128 - title_width) // 2

    pixel_text(
        draw,
        title,
        title_x,
        3,
        scale=2
    )

    # --------------------------------------------------------
    # SHACK-SERVER LOGO
    # --------------------------------------------------------

    draw_logo(
        draw,
        active_node
    )

    # --------------------------------------------------------
    # IP ADDRESS BOX
    # --------------------------------------------------------

    ip =  get_ip_address()

    draw.rectangle(
        (20, 50, 107, 61),
        outline=1
    )

    draw.text(
        (27, 52),
        ip,
        fill=1
    )

    return image


# ============================================================
# ANIMATION
# ============================================================

try:

    active = 0

    while True:

        image = create_screen(active)

        display.display(image)

        # Geschwindigkeit der Logo-Animation
        time.sleep(0.20)

        active += 1

        if active >= 8:
            active = 0


except KeyboardInterrupt:

    display.clear()
    display.show()

    print("OLED beendet")
