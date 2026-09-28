"""
Convert original Heroine Dusk art to Bangle.js 2 images.

The original uses the 16 colour DawnBringer palette, the Bangle.js 2
screen has 8 colours (3 bits: red, green, blue). COLORS is the mapping
most of the already converted art uses (tiles, backgrounds, enemies);
some of those images were tuned by hand (e.g. the imp's orange is red),
so a conversion can override single colours.

Output is an Espruino image string: width, height, bpp + 128
(transparent), transparent colour, then the pixels, 3 bits each, most
significant bit first; heatshrink compressed with Espruino's own
heatshrink (heatshrink_b64.js, needs node and webtools/).
"""

import subprocess
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent

BLACK, BLUE, GREEN, CYAN, RED, MAGENTA, YELLOW, WHITE = range(8)

# DawnBringer 16 colour -> Bangle.js 2 colour
COLORS = {
    (20, 12, 28): BLACK,
    (68, 36, 52): BLACK,
    (48, 52, 109): BLUE,
    (78, 74, 78): BLACK,
    (133, 76, 48): RED,
    (52, 101, 36): BLACK,
    (208, 70, 72): RED,
    (117, 113, 97): YELLOW,
    (133, 149, 161): WHITE,
    (109, 170, 44): GREEN,
    (210, 125, 44): YELLOW,
    (89, 125, 206): WHITE,
    (210, 170, 153): WHITE,
    (109, 194, 202): CYAN,
    (218, 212, 94): YELLOW,
    (222, 238, 214): WHITE,
    # strays outside the palette
    (0, 0, 0): BLACK,
    (73, 73, 73): BLACK,
}

BPP = 3


def to_pixels(image, overrides=None):
    """Bangle colour per pixel, None where transparent."""
    colors = dict(COLORS)
    colors.update(overrides or {})
    image = image.convert('RGBA')
    pixels = []
    for red, green, blue, alpha in image.getdata():
        if alpha == 0:
            pixels.append(None)
        elif alpha == 255:
            pixels.append(colors[(red, green, blue)])
        else:
            raise ValueError(f'partially transparent pixel in {image}')
    return pixels


def to_image_bytes(width, height, pixels):
    used = {pixel for pixel in pixels if pixel is not None}
    unused = [color for color in range(1 << BPP) if color not in used]
    if not unused:
        raise ValueError('no colour left for transparency')
    transparent = unused[0]
    bits = ''.join(format(transparent if pixel is None else pixel, '03b')
                   for pixel in pixels)
    bits += '0' * (-len(bits) % 8)
    data = bytes(int(bits[i:i + 8], 2) for i in range(0, len(bits), 8))
    return bytes([width, height, BPP | 128, transparent]) + data


def compress_b64(data):
    return subprocess.run(['node', str(HERE / 'heatshrink_b64.js')],
                          input=data, capture_output=True,
                          check=True).stdout.decode()


def to_js(image, overrides=None):
    """JS expression that evaluates to the image on the watch."""
    width, height = image.size
    data = to_image_bytes(width, height, to_pixels(image, overrides))
    return f'require("heatshrink").decompress(atob("{compress_b64(data)}"))'
