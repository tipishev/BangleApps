# Heroine Dusk → Bangle.js 2: porting plan

Goal: feature parity with the original browser game
(https://github.com/clintbellanger/heroine-dusk, `release/js/`), which is a
demo that ends at Stonegate Entrance (shop 5). Each milestone leaves the app
launchable and playable, bumps `metadata.json` version and adds a `ChangeLog`
line.

## Scope

In scope: exploration, random + scripted encounters, combat (Attack, Run,
Heal, Burn, Unlock), boss (Death Speaker + Bone Shield), chests/rewards, hay
bale rest + respawn, bone piles / locked doors, info screen, shops & dialogs
(incl. opening "Nightmare" scene), title + options menu, save/continue.
**Font rendering pixel parity:** every string drawn by the port matches,
pixel for pixel in the 160×120 game space, what the original's
`bitfont_render` draws (glyph shapes, kerning, space width, justification,
white/red colour), with the original's two palette colours mapped to
Bangle black/white.

Out of scope:
- Music (4 tracks) — no speaker worth using.
- Light / Freeze / Reflect spells — the original only has buttons and prices,
  no implementation.
- 60 fps redraw loop — replaced by the timing model below.

Sound effects become vibration patterns (last milestone).

## Architecture decisions

1. **One shared, mutated `ctx`.** `app.js` builds a single object once:
   `ctx = {state, avatar, atlas, mazemap, minimap, explore, combat, dialog,
   info, options, input, redraw}`. Every module exports `logic(ctx)` /
   `render(ctx)` (and helpers taking `ctx`) that mutate it in place and set
   `ctx.redraw = true`. `export_context` / `import_context` and returned result
   objects are removed.
2. **Input via `Bangle.setUI({mode:"custom", swipe, touch, btn, remove})`**,
   translated into `ctx.input = {up, down, left, right, tap:{x,y}, btn}`, then
   `gamestate.logic(ctx)`; render if `ctx.redraw`. `remove` saves and frees
   intervals.
3. **Timing model.** No permanent loop. States that animate (combat intro
   slide, hit shake, delayed text) call `anim.start(ctx, frames, fps)` which
   runs a `setInterval` ticking `ctx.combat.timer` and rendering, then clears
   itself. Input is ignored while an animation runs. With
   `options.animation` off, phases jump straight to their end state.
4. **Atlas built once** at startup and stored on `ctx.atlas`; `mazemap.set`
   copies the map's tile rows (`.slice()`) so runtime edits (chests, doors,
   bones) don't mutate the atlas and are re-applied by mapscript on load.
5. **Save policy.** `heroine.save.json` (avatar incl. `campaign`, `map_id`,
   position) and `heroine.options.json`, written via `require("Storage")`
   only on meaningful events: rest, chest, combat end (victory/defeat/run),
   purchase, map change, spell cast on map, and in `remove` / `E.on("kill")`.
   Never per step.
6. **Loading guard.** Equivalent of the original's `init_complete` +
   `avatar.moved`: mapscript enemy/haybale triggers only fire after a real
   move, so loading a save never starts a fight or a rest.
7. **Lazy modules for memory.** `combat`, `power`, `boss`, `shop`/`dialog`,
   `title` are `require`d on entering their state and
   `Modules.removeCached(...)` on leaving, if measurements show it's needed.
   Every milestone checks `process.memory()` (explore idle, and peak in the
   new state) and records the numbers here.
8. **Text API matches the original.** `bitfont.render(text, x, y, justify)`
   with `JUSTIFY_LEFT/RIGHT/CENTER` (same values 0/1/2 as the original), and
   `bitfont.set_color(FONT_WHITE|FONT_RED)`. Callers always pass coordinates
   in the original 160×120 space; bitfont/tileset add the screen offset
   (8, 32) in one place (shared `heroine_config` constants). Details in M1.

## Controls

| State | Swipe up | Swipe down | Swipe left/right | Tap | BTN1 (short) |
|---|---|---|---|---|---|
| Explore | step forward | step back | turn | open Info | open Info |
| Info | — | — | previous/next spell | cast selected spell (Heal/Burn/Unlock) | back to Explore |
| Combat | Attack | Run | previous/next spell | cast selected spell | — |
| Combat victory/defeat | continue | continue | — | continue | continue |
| Dialog/shop | select previous option | select next option | — | confirm selected | Exit shop |
| Title/options | previous item | next item | — | confirm | — |

BTN1 long-press is the firmware exit; nothing critical is bound to it. Taps
use the whole screen (no tiny 20 px buttons).

## Milestones

### M0 — Infrastructure and bug fixes (v0.15)
Files: `app.js`, `gamestate.js`, `explore.js`, `avatar.js`, `mazemap.js`,
`minimap.js`, `atlas.js`, `enemy.js`, `bitfont.js`, new `config.js`.
- Switch to shared mutated `ctx` (decision 1) and `setUI` input (decision 2).
- `gamestate.logic/render` dispatch every state to a module (stubs for
  unported states), never return `undefined`; ignore diagonal swipes.
- Build atlas once (decision 4); fix `mazemap.set_tile` (undefined
  `mazemap_bounds_check`, global `mazemap`); fix `avatar.respawn`
  (`mazemap.set` doesn't exist, undeclared `result`); fix
  `enemy.enemy_render` (undefined `enemy`).
- Remove the 100 ms buzz on every render.
- Minimap cache: test whether `writeJSON` of `asImage()` layers survives a
  `readJSON` round trip; if not, store raw buffers with `Storage.write` and
  rebuild the image object. Persist the cache index (or derive the filename
  from `map_id`) so it survives restarts; delete stray
  `minimap_single_broken_image`.
- Add `config.js` + any new files to `metadata.json` `storage`.
- Verification setup: `git submodule update --init` (core), `npm install`,
  clone `EspruinoWebIDE` next to this repo; get `node bin/sanitycheck.js`
  clean for heroine and `npx eslint apps/heroine` passing (unported verbatim
  files may be excluded until their milestone, but not listed in
  `lint_exemptions.js` permanently).
- Add `apps/heroine/test.json` that loads the app in the emulator, swipes,
  and asserts position/map change.

Acceptance: walk from Serf Quarters to Cedar Village and back; minimap
correct after an app restart; no errors in console; memory numbers recorded.

Status: **done**. Notes from doing it:
- Minimap: the flash cache was dropped instead of fixed. Map events
  change tiles at runtime (doors, bones, chests), which the original's
  minimap shows because it reads live tiles, so a per-map flash cache would
  go stale. The three 1-bpp layers are rebuilt in RAM on each map change
  (`minimap.invalidate(ctx)` for tile changes). `minimap.render` rebuilds
  them itself when the map id changed, so map changes from anywhere
  (exits, respawn) need no extra call. Leftover
  `heroine_minimap_cache_*` files are erased at startup.
- `setUI` has no `remove` handler yet: providing one promises fast-load
  cleanup, which only makes sense once saving exists (M2).
- Emulator tests: `node apps/heroine/scripts/run_emulator_tests.js`. The
  plain `bin/runapptests.js` runs out of memory uploading
  `heroine_tileset`, because the node App Loader never sets
  `Const.UPLOAD_CHUNKSIZE`; the wrapper sets it to the web loader's 1024.
- `test.json` covers: walking and blocking, diagonal swipes, taps,
  Serf Quarters ⇄ Monastery ⇄ Monastery Trail ⇄ Cedar Village, memory
  stable across map switches, `set_tile`, `respawn`, every enemy image,
  and the old cache clean-up.
- Verbatim browser files (`combat.js`, `power.js`, `title.js`) carry an
  `eslint-disable` header until their milestone ports them.

### M1 — Font rendering pixel parity (v0.16)
Files: `bitfont.js` (regenerated), `scripts/generate_bitfont.py`,
`scripts/bitfont.js.template`, `scripts/glyphs/`, new
`scripts/font_reference.py`, new `test.json` steps.

Findings from comparing against the original (`release/js/bitfont.js` +
`images/interface/boxy_bold.png`, 516×8, colours dark `(20,12,28)` and
light `(222,238,214)`), checked by pixel class (outline/fill/transparent):
- 64 of 65 glyph PNGs match the strip exactly. **`Z` is wrong in 4 pixels**
  (x,y): (3,2) and (3,4) should be fill, (1,3) and (5,3) should be outline.
  The port's diagonal is drawn the wrong way:

  ```
  original   port
  #######    #######
  #ooooo#    #ooooo#
  ###ooo#    ####oo#
  ##ooo##    #ooooo#
  #ooo###    #oo####
  #ooooo#    #ooooo#
  #######    #######
  ```
- **`{ | } ~` are missing** (commented out in `FILE_TO_CHAR`); the original
  has them at x=490/496/501/507.
- **The deployed `apps/heroine/bitfont.js` is stale**: it is an older
  generator output without justify or screen offset. `scripts/bitfont.js`
  (newer) has both but was never copied over. Callers currently pass
  screen coordinates (e.g. `explore.js` draws the facing at 60,34), so they
  change when the offset moves into bitfont.
- **Width off by one:** the original `bitfont_calcwidth` is
  `sum(w-1) + 1` (spaces count 3, final kerning removed); the template's
  `getWidth` is `stringWidth(text) - len` = `sum(w-1)`, so RIGHT is 1 px
  right and CENTER 0.5 px off.
- **Fractional CENTER x:** the original passes `x - width/2` (can be .5) to
  canvas `drawImage`; the port passes a float to `drawString`. Pick one
  rounding rule, confirm it against the browser original once, and apply
  it explicitly.
- **No red font:** `boxy_bold_red.png` is the same strip with only the
  fill recoloured to `(208,70,72)`, so it needs no extra glyph data. The
  original draws all text with it whenever `avatar_badly_hurt()` (hp ≤ max_hp/3), chosen once per frame in
  `gamestate_render` via `bitfont_determinecolor()`.
- Correct already: advance `w-1` per glyph, space advance 3, per-glyph
  outline-then-fill order (next glyph's outline overwrites the shared
  column), MSB-top column bytes, uppercase conversion.

Tasks:
- Regenerate glyphs straight from `boxy_bold.png` using the original's
  `glyph_x`/`glyph_w` table instead of hand-cut PNGs; classify pixels by
  alpha/luminance; include `{ | } ~` (the font's first char stays space,
  fill ASCII 97–122 with zero-width entries or remap to keep the table
  contiguous).
- Template: widths per original, `calcwidth` exactly as the original,
  explicit rounding for CENTER, `set_color` for white/red (red = fill drawn
  in Bangle red `#F00`, outline unchanged), `g.setFontAlign(-1,-1)` reset
  before drawing. Keep `setFontCustom` calls out of the per-char loop where
  possible without changing draw order.
- Copy the generator output to `apps/heroine/bitfont.js` as part of the
  generator (no manual copy step), and update callers to 160×120 coordinates.
- `gamestate.render` picks the colour once per frame like the original.
- `scripts/font_reference.py`: renders a string set with the original
  algorithm from `boxy_bold.png` into a 160×120 image per string with
  three pixel states (outline / fill / untouched) — the reference.
- Emulator test: clear the game rectangle to a sentinel colour so
  untouched pixels are detectable, render the same strings (all glyphs; "WEST"; a
  right-justified "0 Gold" at 158; a centred odd-width title at 80; spaces;
  red variant), read back `g` pixels in the game rectangle, and compare
  with the reference. Zero differing pixels to pass.

Acceptance: the comparison passes for every string; screenshot of explore
HUD side by side with the browser original at 1×.

Status: **done**. Notes from doing it:
- Measured in Chrome with the original's own `bitfont_render` on a
  160×120 canvas at scale 1: centred odd widths start at `x - floor(w/2)`
  (the half pixel rounds up); no partially transparent pixels.
- `scripts/boxy_bold.py` holds the original glyph table and reads the
  original `boxy_bold.png` (copied unchanged into `scripts/`);
  `generate_bitfont.py` writes `bitfont.js` straight into the app; the
  hand-cut `scripts/glyphs/` and the stale `scripts/bitfont.js` are gone.
- `scripts/font_reference.py` renders 14 cases (every glyph, left/right/
  centre, odd and even widths, spaces, red) with the original algorithm,
  checks them against CRC32s measured from the original in Chrome, and
  writes the "Font pixel parity" test into `test.json`. The watch test
  compares the CRC32 of each 160×8 text line: all 14 match. A deliberate
  1 px rounding change makes it fail.
- The side-by-side screenshot wasn't produced: the browser tool refuses
  to return canvas image data. The pixel test compares against the same
  original renderer, so it stands in for it.
- The explore HUD now uses the original's positions: facing at (80, 2),
  messages at (80, 70) / (80, 100), centred.

### M2 — Item data + save/load (v0.17)
Files: new `items.js` (weapons, armors, spells tables from original
`info.js`), `avatar.js`.
- `avatar.init` loads `heroine.save.json` or resets; `avatar.save(ctx)`.
- `avatar.sleep` / `respawn` work on ctx.
Acceptance: move, exit via BTN long-press, relaunch → same map, position,
facing.

Status: **done**. Notes from doing it:
- `heroine.save.json` is the avatar as JSON, listed under `data` in
  `metadata.json` so it survives updates and goes on uninstall. Saved on
  map change and in `E.on("kill")`; a save identical to the last one isn't
  rewritten. Later milestones call `avatar.save(ctx)` at their events.
- Loading follows the original's `avatar_init()`: continue if HP > 0,
  otherwise respawn at the sleep point. Fields missing from an older save
  get their starting values; an unreadable save starts a new game.
- `avatar.has_save()` is there for the title's Continue (M8).
- Checked in the emulator with `load()`, which fires `kill` like
  switching apps. Not checked on a watch: a BTN1 long-press should go
  through `load()` too, but a hard reset (holding BTN1 ~10 s) or a flat
  battery loses the steps since the last save.
- Still no `setUI` `remove` handler (no fast-load support).

### M3 — Map scripts and treasure (v0.18)
Files: new `mapscript.js`, new `treasure.js`, `explore.js`, `mazemap.js`.
Assets: `treasure/treasure.png` sprite sheet (gold pile icons 0–9, item icons
10–15), 32×32 each.
- Port `mapscript_exec` per map: hay bales (rest + message), chests with
  `campaign` flags and item grants (stick, Heal spellbook, HP/MP/Atk/Def
  gems, gold), bone pile / locked door load & save, message scripts.
- Chest tiles hidden once opened (8→5, 9→1).
- Explore renders gold pile / found item and the message above it.
- Loading guard (decision 6).
Acceptance: open the Monk Quarters chest (Wood Stick), rest on the Serf
Quarters hay bale, restart → chest stays open.

Status: **done**. Notes from doing it:
- `mapscript.exec(ctx, map_id)` runs from `mazemap.set` (restoring chests,
  bones, doors; required lazily because mapscript requires mazemap) and
  after each step in explore, which saves when it returns true.
  Scripted enemies (maps 9, 10) are stubs until M5; `boss_alter_map` M6.
- Start-up follows the original `avatar_init()` exactly: a dead heroine
  respawns without loading the map she died on (loading it could run
  its chest script). `respawn` sets the position before the map, fixing
  an original bug where the old coordinates could open a chest on the
  respawn map.
- Images: `scripts/convert_image.py` + `generate_images.py` (Pillow +
  Espruino's own `webtools/heatshrink.js`). Reconverting `nightsky` and
  `skeleton` gives exactly the existing images. The existing art was
  tuned per image (e.g. the imp's orange is red, tempest's purple red),
  so `COLORS` is the majority mapping and a module can override colours;
  treasure overrides the sapphire's mid blue to blue. Browns map to red
  (like the brick tiles), so the stick and spellbook are red.
- Gold piles reach below the 120 px game area; drawn with a clip
  rectangle like the original's canvas edge.
- `run_emulator_tests.js` now runs each test in its own process:
  `runapptests.js` gives all of an app's tests 60 s together.

### M4 — Info screen (v0.19)
Files: new `info.js`, new `action.js` (spell selection, watch version),
`power.js` (map spells only here).
Assets: `interface/heroine.png` paper doll (80×100 layers per armor/weapon
tier), spell icons from `interface/action_buttons.png`, select frame.
- Info screen: title, paper doll with worn armor/weapon, item names with
  bonuses, HP/MP, gold, known spells with selection, minimap (hidden when a
  message shows).
- Map spells: Heal, Burn (skull pile 16→5 + save), Unlock (locked door 18→3
  + save), "(No Target)" case.
- Shared `info.render_hpmp(ctx)` / `render_gold(ctx)` for combat.
Acceptance: pick up Heal spellbook, take damage via a debug hook, heal from
Info; MP decreases and persists.

### M5 — Combat (v0.20)
Files: `combat.js` (rewrite of the verbatim copy), `power.js`, `enemy.js`,
new `anim.js`, `explore.js`.
- Random encounters: `encounter_chance` +0.05 per step, max 0.30, reset on
  fight and map change; enemy list per map from atlas.
- Scripted encounters from mapscript (mimics; boss wired in M5).
- Phases intro → input → offense → defense → victory/defeat with the timing
  model (decision 3): slide-in, enemy/hero shake, delayed log text.
- Powers: attack (20% miss, 10% crit), Heal, Burn (×2/×1/×0 crit by
  category), Unlock (automatons only), Run (66%); enemy attack, Scorch,
  HP drain, MP drain; armor absorb.
- Victory: gold reward + gold pile, `victory_status` into `campaign`, save.
  Defeat: "You are defeated..." → respawn at sleep point, lose gold, save.
Acceptance: win and lose a fight on Monastery Trail; run away; gold and HP
correct after restart; peak memory in combat recorded.

### M6 — Boss (v0.21)
Files: new `boss.js`, `power.js`, `mapscript.js`.
- Death Speaker on Dead Walkways (11,5) with `dspeak` flag; boss power table
  (2/3 attack, else Scorch or Bone Shield up to 3×); Bone Shield absorbs
  attacks, Burn breaks it; overlay image already in `enemy.js`.
- After victory the boss tile becomes grass (`boss_alter_map`).
Acceptance: defeat the boss (debug stats allowed), tile gone after restart.

### M7 — Shops and dialog (v0.22)
Files: new `dialog.js`, new `shop.js`, `explore.js`, `mazemap.js`
(`check_shop`).
Assets: `interface/dialog_buttons.png` (buy/exit icons), `interior` and
`tempest` backgrounds (already in tileset).
- All 9 shops: weapons, armor, spells, inn room (rest), messages; disabled
  reasons as in the original ("(You own this)", "(Yours is better)",
  "(You know this)", "(Too advanced)", "(You are well rested)"; buy option
  inert when gold is short); gold shown when items for sale; purchase
  message; avatar placed back outside.
- Stonegate Entrance demo-end text.
Acceptance: buy Iron Knife at Cedar Arms, rest at Pilgrim Inn, read all
message shops.

### M8 — Title, options, new game (v0.23)
Files: `title.js` (rewrite), `gamestate.js`, `app.js`.
Assets: `backgrounds/title.png`.
- Title menu Start/Continue (Continue when a save exists), Options
  (animations, minimap; music/sound entries replaced by "Vibration on/off"),
  credits lines.
- Start → "A Nightmare" dialog (shop 8) with "Wake up" → Serf Quarters.
- New game wipes save.
Acceptance: fresh install shows Start → Nightmare → Serf Quarters; options
persist across restarts.

### M9 — Feedback and polish (v0.24)
Files: new `feedback.js`, callers of the original `sounds_play`.
- Map each SFX (attack, critical, miss, heal, fire, run, blocked, coin,
  unlock, hpdrain, mpdrain, boneshield, defeat, click) to a short
  `Bangle.buzz` pattern; respect the vibration option.
- Red bitfont variant (`boxy_bold_red`) if used for damage/disabled text.
- Update README (controls table above, features), screenshots,
  `metadata.json` description; full playthrough to Stonegate.

## Asset conversion

Use the existing pipeline that produced `tileset.js` / `enemy.js`
(heatshrink + base64, 3-bit palette). Source PNGs are in the original repo
under `release/images/`. Still to convert: `backgrounds/title.png`,
`interface/heroine.png`, `interface/action_buttons.png`,
`interface/select.png`, `interface/dialog_buttons.png`,
`treasure/treasure.png`, optionally `interface/boxy_bold_red.png`.

## Measurements log

| Milestone | Idle free vars (explore) | Peak state | Peak free vars |
|---|---|---|---|
| M0 | 6809 free / 12000 after load (Serf Quarters), emulator 2v29 | explore, Cedar Village | 6602 |
| M1 | — | explore, Monastery after 3 moves | 6604 |
| M2 | 6582 free / 12000 after loading a save on the Monastery | — | — |
| M3 | — | explore, Cedar Village after the gold chest | 6019 (−563 vs M2: mapscript, treasure and its images stay in RAM once loaded; lazy-load treasure images if M5 needs the room) |
