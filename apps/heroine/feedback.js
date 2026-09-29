/**
 Vibration instead of the original's sound effects

 One pattern per original sound, [on, off, on, ...] in milliseconds.
 A new pattern replaces one that is still playing. Nothing plays when
 the Vibration option is off.
 */

const PATTERNS = {
  attack: [40],
  miss: [15],
  critical: [60, 50, 60],
  heal: [30, 60, 30],
  fire: [120],
  coin: [20, 40, 20],
  hpdrain: [80, 40, 80],
  mpdrain: [40, 40, 40],
  run: [20, 30, 20, 30, 20],
  blocked: [25, 50, 25],  // every swipe buzzes once already
  defeat: [400],
  boneshield: [150, 50, 150],
  click: [20],
  unlock: [30, 30, 60],
};

// increases with every pattern, an older one stops at its next step
let playing = 0;

exports.play = function(ctx, sound) {
  if (!ctx.options.vibration) return;
  const pattern = PATTERNS[sound];
  const token = ++playing;

  function step(i) {
    if (token != playing || i >= pattern.length) return;
    if (i % 2 == 0) {
      Bangle.buzz(pattern[i]).then(function() { step(i + 1); });
    }
    else {
      setTimeout(function() { step(i + 1); }, pattern[i]);
    }
  }
  step(0);
};
