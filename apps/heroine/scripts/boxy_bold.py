"""
The "boxy bold" bitmap font of the original Heroine Dusk.

boxy_bold.png is copied unchanged from the original game
(release/images/interface/boxy_bold.png). Art by Clint Bellanger,
CC-BY-SA 3.0, https://github.com/clintbellanger/heroine-dusk

The glyphs are in one row, one pixel apart, in the order and widths
of the original bitfont.js glyph table.
"""

from pathlib import Path

from PIL import Image

HEIGHT = 8
KERNING = -1  # every glyph overlaps the next one by a pixel
SPACE = 3  # the space advances the cursor by 3 and draws nothing

# character and width, in the order of the original glyph table
GLYPHS = [
    ('!', 4), ('"', 7), ('#', 9), ('$', 7), ('%', 10), ('&', 9), ("'", 4),
    ('(', 5), (')', 5), ('*', 6), ('+', 8), (',', 5), ('-', 6), ('.', 4),
    ('/', 6),
    ('0', 7), ('1', 4), ('2', 7), ('3', 7), ('4', 7), ('5', 7), ('6', 7),
    ('7', 7), ('8', 7), ('9', 7),
    (':', 4), (';', 4), ('<', 6), ('=', 6), ('>', 6), ('?', 8), ('@', 8),
    ('A', 7), ('B', 7), ('C', 7), ('D', 7), ('E', 7), ('F', 7), ('G', 7),
    ('H', 7), ('I', 4), ('J', 7), ('K', 7), ('L', 7), ('M', 9), ('N', 8),
    ('O', 7), ('P', 7), ('Q', 8), ('R', 7), ('S', 7), ('T', 8), ('U', 7),
    ('V', 7), ('W', 9), ('X', 7), ('Y', 8), ('Z', 7),
    ('[', 5), ('\\', 6), (']', 5), ('^', 8), ('_', 6), ('`', 5),
    ('{', 5), ('|', 4), ('}', 5), ('~', 9),
]

JUSTIFY_LEFT = 0
JUSTIFY_RIGHT = 1
JUSTIFY_CENTER = 2

FONT_WHITE = 0
FONT_RED = 1

# pixel classes
EMPTY = '.'
OUTLINE = '#'
FILL = {FONT_WHITE: 'o', FONT_RED: 'r'}

STRIP = Path(__file__).with_name('boxy_bold.png')


def classify(pixel):
    red, green, blue, alpha = pixel
    if alpha == 0:
        return EMPTY
    if alpha != 255:
        raise ValueError(f'partially transparent pixel {pixel}')
    # the strip only uses (20,12,28) for outline and (222,238,214) for fill
    return OUTLINE if red < 128 else FILL[FONT_WHITE]


def load_glyphs():
    """Return {char: columns}, each column a string of HEIGHT pixel classes,
    top to bottom."""
    image = Image.open(STRIP).convert('RGBA')
    assert image.size[1] == HEIGHT, image.size
    glyphs = {}
    x = 0
    for char, width in GLYPHS:
        glyphs[char] = [
            ''.join(classify(image.getpixel((x + column, y)))
                    for y in range(HEIGHT))
            for column in range(width)
        ]
        x += width + 1
    assert x == image.size[0] + 1, (x, image.size)  # no gap after the last one
    return glyphs


def calc_width(text):
    """Same as the original bitfont_calcwidth()."""
    widths = dict(GLYPHS)
    total = 0
    for char in text:
        total += SPACE if char == ' ' else widths[char] + KERNING
    return total - KERNING


def start_x(text, x, justify):
    """Same as the original bitfont_setposition(), with the half pixel of
    centred odd widths rounded up, which is how the original canvas
    drawImage() places it (measured in Chrome at scale 1)."""
    if justify == JUSTIFY_RIGHT:
        return x - calc_width(text)
    if justify == JUSTIFY_CENTER:
        return x - calc_width(text) // 2
    return x


def render(text, x, y, justify, color, width=160, height=120):
    """Render like the original bitfont_render() onto an empty width*height
    screen and return the rows as strings of pixel classes."""
    glyphs = load_glyphs()
    text = text.upper()
    screen = [[EMPTY] * width for _ in range(height)]
    cursor = start_x(text, x, justify)
    for char in text:
        if char == ' ':
            cursor += SPACE
            continue
        for column_index, column in enumerate(glyphs[char]):
            for row_index, pixel in enumerate(column):
                if pixel == EMPTY:
                    continue
                if pixel != OUTLINE:
                    pixel = FILL[color]
                px, py = cursor + column_index, y + row_index
                if 0 <= px < width and 0 <= py < height:
                    screen[py][px] = pixel
        cursor += len(glyphs[char]) + KERNING
    return [''.join(row) for row in screen]
