# Sleeper League History Tool

Career history for the league, attributed by **manager** (Sleeper `owner_id`)
instead of by **team slot** (`roster_id`) — the fix for Sleeper's own history
view, which silently hands a new manager the win/loss record of whoever used
that roster slot before them.

Live site (after Pages is enabled — see below): `https://<your-github-username>.github.io/sleeper-league-history-tool/`

## How it works

1. `scripts/build-historical.js` walks the league backward via `previous_league_id`
   starting from the configured league id, and builds `data/historical.json`
   covering every **completed** season. Run this once, and again only if a past
   season was missed or the identity map changes.
2. `scripts/build-current.js` fetches just the current (in-progress or
   pre-draft) season into `data/current_season.json`. This is what the daily
   Action re-runs — cheap and fast, since it never re-walks history.
3. `scripts/merge.js` combines both files, applies the identity map
   (`config/identity-map.json`), computes career totals / championships /
   playoff appearances / best-worst season / head-to-head, and writes the
   final `docs/data/history.json` that the site actually reads.
4. `docs/` is a static site (no build step, no framework) that fetches
   `data/history.json` and renders:
   - `index.html` — all-time leaderboard
   - `person.html?id=<owner_id>` — one manager's career page
   - `head-to-head.html` — head-to-head grid between every manager

## Running it locally

```bash
npm start
```

Serves the `docs/` folder at `http://127.0.0.1:8080`. `docs/` is plain static
files, so this just needs to be *some* HTTP server — `fetch()` is blocked on
`file://`, which is the only reason a server is required at all.

To pull fresh data before viewing it (optional — the repo already has
committed data):

```bash
npm run build:all   # full rebuild: historical + current + merge (rarely needed)
npm run build       # just current season + merge (what the daily Action runs)
```

## Identity mapping (`config/identity-map.json`)

Turnover **within** a roster slot (a new manager takes over an existing team)
is detected automatically — every season is grouped by `owner_id`, so a new
Sleeper account naturally starts its own career line.

The one thing the API can't detect on its own: **the same person playing
under two different Sleeper accounts** in different years. For that case, add
an alias:

```json
{
  "aliases": {
    "<secondary_user_id>": "<primary_user_id>"
  },
  "displayNameOverrides": {
    "<primary_user_id>": "Preferred Display Name"
  }
}
```

After editing this file, re-run `npm run build:all` (or the merge step, if
`historical.json` doesn't need to change) and commit the result.

## GitHub Pages setup (one-time, manual)

This repo has no `gh` CLI access baked into the Action beyond pushing commits,
so enabling Pages itself is a one-click step you do once in the GitHub UI:

1. Push this repo to GitHub (already done if you're reading this from there).
2. Go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Branch: `main`, folder: **`/docs`**. Save.

GitHub will publish the site at `https://<username>.github.io/<repo>/` and
redeploy automatically every time `main` updates — including every time the
scheduled Action commits fresh data. No separate deploy step needed.

## GitHub Actions

`.github/workflows/refresh.yml` runs daily (13:00 UTC) and on-demand (**Actions
tab → Refresh current season data → Run workflow**). It re-fetches only the
current season, re-merges, and commits `data/current_season.json` +
`docs/data/history.json` back to `main` if anything changed.

## Data notes

- Sleeper's API is free, unauthenticated, and CORS-friendly — no API key or
  server needed.
- A roster with no `owner_id` (a manager who left without being replaced) is
  excluded from per-person stats, since there's no one to attribute it to —
  it still shows up in league-wide season data, just not on anyone's career
  page. **Known case:** in the 2025 season, roster slot 6 (`gamesjary`'s team
  in 2022–2024) has `owner_id: null` — that manager's account was removed
  from the league and no one took over the slot, so 2025 has one fewer
  attributable manager than the roster count implies. If that person ever
  rejoins under a (possibly new) Sleeper account, add them to
  `config/identity-map.json` so future seasons link back to their earlier
  history.
- Head-to-head stats only count **regular season** matchups (weeks before
  `playoff_week_start`), not playoff games, to keep the grid a clean
  round-robin comparison.
