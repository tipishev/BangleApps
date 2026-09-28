#!/usr/bin/env python
"""
Reference renderings for the font pixel-parity test.

Renders CASES with the original bitfont algorithm (boxy_bold.py), checks
them against CRC32s measured from the original game running in Chrome,
and writes the "Font pixel parity" test into ../test.json.

A case's CRC32 covers the 8 rows of its text line across the whole
160 pixel wide game area, one character per pixel:
'.' untouched, '#' outline, 'o' white fill, 'r' red fill.

To re-measure CHROME_CRC32: serve the original's release/ directory,
open index.html, set the global ctx to a 160x120 canvas with
imageSmoothingEnabled = false and SCALE = 1, then for each case set
bitfont.color, call bitfont_render(text, x, y, justify) on a cleared
canvas, classify the pixels of rows y..y+7 as above, and CRC32 them.
"""

import json
import zlib
from pathlib import Path

from boxy_bold import (FONT_RED, FONT_WHITE, JUSTIFY_CENTER, JUSTIFY_LEFT,
                       JUSTIFY_RIGHT, render)

# text, x, y, justify, color
CASES = [
    ("!\"#$%&'()*+,-./", 2, 2, JUSTIFY_LEFT, FONT_WHITE),
    ("0123456789:;<=>?@", 2, 12, JUSTIFY_LEFT, FONT_WHITE),
    ("ABCDEFGHIJKLM", 2, 22, JUSTIFY_LEFT, FONT_WHITE),
    ("NOPQRSTUVWXYZ", 2, 32, JUSTIFY_LEFT, FONT_WHITE),
    ("[\\]^_`{|}~", 2, 42, JUSTIFY_LEFT, FONT_WHITE),
    ("west", 60, 34, JUSTIFY_LEFT, FONT_WHITE),
    ("0 Gold", 158, 110, JUSTIFY_RIGHT, FONT_WHITE),
    ("INFO", 80, 2, JUSTIFY_CENTER, FONT_WHITE),
    ("Gar'ashi Monastery", 80, 60, JUSTIFY_CENTER, FONT_WHITE),
    ("Victory!", 80, 60, JUSTIFY_CENTER, FONT_WHITE),
    ("You rest for awhile.", 2, 100, JUSTIFY_LEFT, FONT_WHITE),
    ("  two  spaces ", 158, 50, JUSTIFY_RIGHT, FONT_WHITE),
    ("HP 5/25", 2, 100, JUSTIFY_LEFT, FONT_RED),
    ("You are defeated...", 158, 100, JUSTIFY_RIGHT, FONT_RED),
]

# measured from the original in Chrome 153, 2026-09-28
CHROME_CRC32 = [
    549737886, 784644739, 2380124298, 1339923442, 4218809469, 2532185294,
    3432912705, 4032207004, 4045119380, 547635168, 111591779, 899601055,
    2400638639, 3467496429,
]

TEST_JSON = Path(__file__).resolve().parent.parent / 'test.json'
TEST_DESCRIPTION = 'Font pixel parity with the original'

# Defines fontcrc(text, x, y, justify, color) on the watch: fills the game
# area with blue, renders the text, classifies the pixels of its line like
# the reference and returns their CRC32.
HELPER = (
    'global.fontcrc=function(t,x,y,j,c){'
    'var OX=8,OY=32,B=g.toColor("#00F"),K=g.toColor("#000"),'
    'W=g.toColor("#FFF"),R=g.toColor("#F00");'
    'g.setColor(B).fillRect(OX,OY,OX+159,OY+119);'
    'var f=require("heroine_bitfont");f.set_color(c);f.render(t,x,y,j);'
    'var s="";for(var yy=y;yy<y+8;yy++)for(var xx=0;xx<160;xx++){'
    'var p=g.getPixel(OX+xx,OY+yy);'
    's+=p==B?".":p==K?"#":p==W?"o":p==R?"r":"?";}'
    'return E.CRC32(s);}'
)


def case_crc32(case):
    text, x, y, justify, color = case
    rows = render(text, x, y, justify, color)
    return zlib.crc32(''.join(rows[y:y + 8]).encode())


def make_test():
    steps = [
        {'t': 'load', 'fn': 'heroine.app.js'},
        {'t': 'cmd', 'js': HELPER,
         'text': 'define fontcrc(), see scripts/font_reference.py'},
    ]
    for case, crc in zip(CASES, map(case_crc32, CASES)):
        steps.append({
            't': 'assert',
            'js': 'fontcrc(' + ','.join(json.dumps(v) for v in case) + ')',
            'is': 'equal',
            'to': str(crc),
            'text': json.dumps(case[0]),
        })
    return {'description': TEST_DESCRIPTION, 'steps': steps}


def main():
    crcs = [case_crc32(case) for case in CASES]
    mismatches = [(case[0], ours, chrome)
                  for case, ours, chrome in zip(CASES, crcs, CHROME_CRC32)
                  if ours != chrome]
    if mismatches:
        raise SystemExit(f'reference differs from the original: {mismatches}')
    print(f'{len(CASES)} cases match the original')

    tests = json.loads(TEST_JSON.read_text())
    tests['tests'] = [test for test in tests['tests']
                      if test.get('description') != TEST_DESCRIPTION]
    tests['tests'].append(make_test())
    TEST_JSON.write_text(json.dumps(tests, indent=2) + '\n')
    print(f'wrote "{TEST_DESCRIPTION}" to {TEST_JSON.name}')


if __name__ == '__main__':
    main()
