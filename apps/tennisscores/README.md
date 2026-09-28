# Tennis Scores

Live tennis scores on your wrist, from the [Live Tennis API](https://livetennisapi.com).

When matches are live it shows one match per page: tournament, round, both
players, games per set, current points and a dot next to the serving player.
When nothing is live it shows the next scheduled fixtures instead.

## Usage

Just install and configure the app. This needs an internet-enabled Gadgetbridge version.

You need a (free) API key from [livetennisapi.com](https://livetennisapi.com).
The easiest way to enter it is the app's web interface in the App Loader,
which lets you paste the key and pick a tour from the browser. Alternatively
install one of the text input libraries and set the key on the watch in the
app settings.

## Controls

* Swipe up/down (or press the button) to page through matches/fixtures
* Tap the screen to refresh

## Settings

* **Tour** - only show matches for one tour (ATP, WTA, Challenger, ITF, Juniors) or all
* **Auto refresh** - refresh automatically while the app is open (off by default)
* **Refresh every** - auto refresh interval, default 15 minutes
* **API key** - your Live Tennis API key (needs a text input library installed)

## API usage and the free tier

The free tier allows 30 requests/minute and 100 requests/day. Live scores,
players and fixtures are free; historical data is paid.

Each refresh is one request (two when nothing is live, because the app then
also fetches the fixtures list). At the default 15 minute auto-refresh a full
day of continuous refreshing is about 96 requests, which fits the free tier's
100/day - and since the app only refreshes while it is open, real usage is
normally far below that. If you want a faster refresh interval you'll likely
need a paid key.

## Creator

[bensynapse](https://github.com/bensynapse)

Disclosure: I maintain the Live Tennis API this app talks to.
