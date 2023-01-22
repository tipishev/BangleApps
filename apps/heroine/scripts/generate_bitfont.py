#!/usr/bin/env python

from string import Template
from datetime import datetime
from PIL import Image

FILE_TO_CHAR = {
    0: ' ',
    1: '!',
    2: '"',
    3: '#',
    4: '$',
    5: '%',
    6: '&',
    7: "'",
    8: '(',
    9: ')',

    10: '*',
    11: '+',
    12: ',',
    13: '-',
    14: '.',
    15: '/',

    16: '0',
    17: '1',
    18: '2',
    19: '3',
    20: '4',
    21: '5',
    22: '6',
    23: '7',
    24: '8',
    25: '9',

    26: ':',
    27: ';',
    28: '<',
    29: '=',
    30: '>',
    31: '?',
    32: '@',

    33: 'A',
    34: 'B',
    35: 'C',
    36: 'D',
    37: 'E',
    38: 'F',
    39: 'G',
    40: 'H',
    41: 'I',
    42: 'J',
    43: 'K',
    44: 'L',
    45: 'M',
    46: 'N',
    47: 'O',
    48: 'P',
    49: 'Q',
    50: 'R',
    51: 'S',
    52: 'T',
    53: 'U',
    54: 'V',
    55: 'W',
    56: 'X',
    57: 'Y',
    58: 'Z',

    59: '[',
    60: '\\',
    61: ']',
    62: '^',
    63: '_',
    64: '`',

    # skipped lowercase block

    #  91: '{',
    #  92: '|',
    #  93: '}',
    #  94: '~'
}


def to_color(red, green, blue, alpha):
    if alpha == 0:
        return 'transparent'
    elif red == 0:
        return 'black'
    elif red == 255:
        return 'white'


def to_columns(filename):
    image = Image.open(filename)
    width, height = image.size
    pixels = image.load()

    columns = []
    for x in range(width):
        column = []
        for y in range(height):
            pixel = pixels[x, y]
            color = to_color(*pixel)
            column.append(color)
        columns.append(column)
    return columns


def to_bg_bit(color):
    return {'black': 1, 'white': 0, 'transparent': 0}[color]


def to_fg_bit(color):
    return {'black': 0, 'white': 1, 'transparent': 0}[color]


def to_hexes(columns, to_bit_function):
    return ([hex(int(''.join([str(to_bit_function(color))
                              for color in column]), 2))
            for column in columns])


def to_character_dict(columns, character):
    return {
            'character': character,
            'width': len(columns),
            'bg': to_hexes(columns, to_bg_bit),
            'fg': to_hexes(columns, to_fg_bit),
            }


def get_character_dicts():
    result = []
    for number, character in FILE_TO_CHAR.items():
        filename = f'glyphs/{number}.png'
        columns = to_columns(filename)
        character_dict = to_character_dict(columns, character)
        result.append(character_dict)
    return result


def generate_template_values():
    character_dicts = get_character_dicts()
    bg_block = ""
    fg_block = ""
    widths_block = ""
    for character_dict in character_dicts:

        character = character_dict['character']

        # singular
        width = character_dict['width']
        widths_block += f'{width},'

        bg_hexes = ', '.join(character_dict['bg'])
        fg_hexes = ', '.join(character_dict['fg'])

        bg_block += f'{bg_hexes}, // {character}\n'
        fg_block += f'{fg_hexes}, // {character}\n'

    return {
            'widths_block': widths_block,
            'bg_block': bg_block,
            'fg_block': fg_block,
            }


def generate_bitfont_js():
    with open('bitfont.js.template', 'r') as f:
        template = Template(f'// autogenerated with generate_bitfont.py'
                            f' at {datetime.now()}'
                            f'\n\n{f.read()}')
    template_values = generate_template_values()
    return template.safe_substitute(template_values)


def main():
    with open('bitfont.js', 'w') as f:
        f.write(generate_bitfont_js())


main()
