from PIL import Image

FILE_TO_CHAR = {
    # 1: '!',
    # 2: '"',
    # 3: '#',
    # 4: '$',
    # 5: '%',
    # 6: '&',
    # 7: "'",
    # 8: '(',
    # 9: ')',
    # 10: '*',
    # 11: '+',
    # 12: ',',
    # 13: '-',
    # 14: '.',
    # 15: '/',
    # 16: '0',
    # 17: '1',
    # 18: '2',
    # 19: '3'

    33: 'A',
    34: 'B',
    35: 'C',
    36: 'D',
}

def to_color(red, green, blue, alpha):
    if alpha == 0: return 'transparent'
    elif red == 0: return 'black'
    elif red == 255: return 'white'

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

def to_background_bit(color):
    return {'black': 1, 'white': 0, 'transparent': 0}[color]

def to_foreground_bit(color):
    return {'black': 0, 'white': 1, 'transparent': 0}[color]

def to_hexes(columns, function):
    return ([hex(int(''.join([str(function(color))
            for color in column]), 2))
            for column in columns])

def to_char_dict(columns, character):
    background = to_hexes(columns, to_background_bit) 
    foreground = to_hexes(columns, to_foreground_bit) 
    width = len(columns)
    return {
            'character': character,
            'width': width,
            'background': background,
            'foreground': foreground
            }

def get_char_dicts():
    result = []
    for number, character in FILE_TO_CHAR.items():
        filename = f'{number}.png'
        columns = to_columns(filename)
        char_dict = to_char_dict(columns, character)
        result.append(char_dict)
    return result

def main():
      char_dicts = get_char_dicts()
      for char_dict in char_dicts:
          hexes = ', '.join(char_dict['background'])
          character = char_dict['character']
          line = f'{hexes}, // {character}'
          print(line)

main()
