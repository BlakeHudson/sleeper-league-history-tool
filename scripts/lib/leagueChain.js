const { getLeague } = require("./sleeperApi");

/**
 * Walks previous_league_id backward from the given league id, returning every
 * season in the chain ordered oldest-first.
 */
async function discoverLeagueChain(startLeagueId) {
  const seasons = [];
  let currentId = startLeagueId;

  while (currentId) {
    const league = await getLeague(currentId);
    if (!league) break;
    seasons.push({
      leagueId: league.league_id,
      season: league.season,
      status: league.status,
      name: league.name,
      settings: {
        numTeams: league.settings?.num_teams ?? null,
        playoffTeams: league.settings?.playoff_teams ?? null,
        playoffWeekStart: league.settings?.playoff_week_start ?? null,
        lastScoredLeg: league.settings?.last_scored_leg ?? null
      }
    });
    currentId = league.previous_league_id || null;
  }

  return seasons.reverse();
}

module.exports = { discoverLeagueChain };
