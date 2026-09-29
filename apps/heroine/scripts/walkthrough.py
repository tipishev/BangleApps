#!/usr/bin/env python
"""
Write the "Walk to Stonegate" test into ../test.json.

The Trade Tunnel's way to Stonegate crosses a bone pile, so the walk
plays the demo: fetch the Heal spellbook at Meditation Point, buy Burn
from Sage Therel (the 100 gold are granted by the test, standing in for
fights), burn the bone pile from the Info screen, walk to Stonegate.

Each walk is the shortest one found with a breadth-first search over
the maps in atlas.js and the walkability in tileset.js. It avoids shop
doors other than the one it goes to, and scripted enemies; chests and
hay bales are fine. Inputs: F swipe up (forward), D swipe down, L/R
swipe left/right (turn, or select), T tap, B button.
"""

import json
import re
from collections import deque
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
TEST_JSON = APP_DIR / 'test.json'
DESCRIPTION = 'Walk from the start to the end of the demo at Stonegate'

GOAL_MAP, GOAL_SHOP = 10, 5
SCRIPTED_ENEMIES = {(9, 4, 9), (9, 11, 5), (10, 14, 9), (10, 6, 4)}
FACINGS = ['north', 'east', 'south', 'west']
STEP = {'north': (0, -1), 'east': (1, 0), 'south': (0, 1), 'west': (-1, 0)}


def load_maps():
    src = (APP_DIR / 'atlas.js').read_text()
    maps = {}
    for m in re.finditer(r'atlas\.maps\[(\d+)\]\.tiles = \[(.*?)\];', src, re.S):
        rows = re.findall(r'\[([\d,\s]+)\]', m.group(2))
        maps[int(m.group(1))] = {
            'tiles': [[int(v) for v in row.split(',')] for row in rows],
            'exits': {}, 'shops': {}}
    for m in re.finditer(r'atlas\.maps\[(\d+)\]\.(exits|shops)\[\d+\] = \{(.*?)\};', src):
        fields = dict((k, int(v)) for k, v in re.findall(r'(\w+):(\d+)', m.group(3)))
        maps[int(m.group(1))][m.group(2)][(fields['exit_x'], fields['exit_y'])] = fields
    return maps


def load_walkable():
    src = (APP_DIR / 'tileset.js').read_text()
    return {int(n): v == 'true'
            for n, v in re.findall(r'is_walkable\[(\d+)\] = (true|false);', src)}


def route(maps, walkable, start, goal, burned=()):
    """Shortest walk from start (map, x, y) to goal, which is a
    (map, x, y) to stand on or a shop id to enter.
    Returns the facings of each step and where it ends."""
    previous = {start: None}
    queue = deque([start])
    while queue:
        state = queue.popleft()
        if state == goal:
            return walk_back(previous, state), state
        map_id, x, y = state
        for facing, (dx, dy) in STEP.items():
            nx, ny = x + dx, y + dy
            tiles = maps[map_id]['tiles']
            if not (0 <= ny < len(tiles) and 0 <= nx < len(tiles[0])):
                continue
            if not (walkable.get(tiles[ny][nx]) or (map_id, nx, ny) in burned):
                continue
            if (map_id, nx, ny) in SCRIPTED_ENEMIES:
                continue
            shop = maps[map_id]['shops'].get((nx, ny))
            if shop:
                if shop['shop_id'] == goal:
                    # entering puts the heroine back outside
                    return (walk_back(previous, state) + [facing],
                            (map_id, shop['dest_x'], shop['dest_y']))
                continue
            exit_ = maps[map_id]['exits'].get((nx, ny))
            if exit_:
                nxt = (exit_['dest_map'], exit_['dest_x'], exit_['dest_y'])
            else:
                nxt = (map_id, nx, ny)
            if nxt not in previous:
                previous[nxt] = (state, facing)
                queue.append(nxt)
    raise SystemExit(f'{goal} is unreachable from {start}')


def walk_back(previous, state):
    facings = []
    while previous[state]:
        state, facing = previous[state]
        facings.append(facing)
    return facings[::-1]


def to_swipes(facings, facing):
    """Inputs to walk the facings, and the facing at the end."""
    moves = ''
    for wanted in facings:
        turns = (FACINGS.index(wanted) - FACINGS.index(facing)) % 4
        moves += {0: '', 1: 'R', 2: 'RR', 3: 'L'}[turns] + 'F'
        facing = wanted
    return moves, facing


def turn_to(facing, wanted):
    turns = (FACINGS.index(wanted) - FACINGS.index(facing)) % 4
    return {0: '', 1: 'R', 2: 'RR', 3: 'L'}[turns]


def play(inputs):
    js = ('"' + inputs + '".split("").forEach(function(i){handle_input('
          '{F:{up:true},D:{down:true},L:{left:true},R:{right:true},'
          'T:{tap:{x:88,y:88}},B:{btn:true}}[i]);})')
    return {'t': 'cmd', 'js': js}


def check(js, to, text=None):
    step = {'t': 'assert', 'js': js, 'is': 'equal', 'to': to}
    if text:
        step['text'] = text
    return step


def make_test():
    maps, walkable = load_maps(), load_walkable()
    steps = [
        {'t': 'load', 'fn': 'heroine.app.js'},
        {'t': 'cmd', 'js': 'ctx.explore.encounter_increment=0',
         'text': 'no random encounters in this test'},
        dict(play('TT'), text='Start, Wake up'),
        check('ctx.state', '0'),
    ]
    position, facing = (0, 1, 1), 'south'
    total = 0

    def walk(goal, text, burned=()):
        nonlocal position, facing, total
        facings, position = route(maps, walkable, position, goal, burned)
        moves, facing = to_swipes(facings, facing)
        total += len(facings)
        steps.append(dict(play(moves), text=f'{text}: {len(facings)} steps'))

    walk((3, 2, 1), 'to the Meditation Point chest')
    steps.append(check('ctx.avatar.spellbook', '1', 'found the Heal spellbook'))
    steps.append({'t': 'cmd', 'js': 'ctx.avatar.gold+=100',
                  'text': 'gold for Burn, standing in for fights'})
    walk(3, 'into Sage Therel\'s')
    steps.append(check('ctx.dialog.title', '"Sage Therel"'))
    steps.append(dict(play('FTB'), text='select the spellbook, buy it, leave'))
    steps.append(check('ctx.avatar.spellbook', '2', 'learned Burn'))
    walk((10, 2, 3), 'to the bone pile in the Trade Tunnel')
    steps.append(dict(play(turn_to(facing, 'south') + 'TRTB'),
                      text='face it, Info, select Burn, cast, close'))
    facing = 'south'
    steps.append(check('ctx.info.power_result', '"Cleared Path!"'))
    walk(GOAL_SHOP, 'to Stonegate', burned={(10, 2, 4)})
    steps += [
        check('ctx.state', '3'),
        check('ctx.dialog.title', '"Stonegate Entrance"'),
        check('ctx.dialog.option[1].msg2', '"Thanks for playing!)"'),
    ]
    return {'description': DESCRIPTION, 'steps': steps}, total


def main():
    test, total = make_test()
    tests = json.loads(TEST_JSON.read_text())
    tests['tests'] = [t for t in tests['tests']
                      if t.get('description') != DESCRIPTION]
    # before the font test, which font_reference.py keeps last
    tests['tests'].insert(len(tests['tests']) - 1, test)
    TEST_JSON.write_text(json.dumps(tests, indent=2) + '\n')
    print(f'wrote "{DESCRIPTION}": {total} steps')


if __name__ == '__main__':
    main()
