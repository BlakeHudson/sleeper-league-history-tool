const {
  getRosters,
  getUsers,
  getWinnersBracket,
  getLosersBracket,
  getMatchups
} = require("./sleeperApi");

function centsToNumber(whole, decimal) {
  if (whole == null) return 0;
  return Number(whole) + Number(decimal || 0) / 100;
}

// Sleeper tags the deciding match of each bracket "rung" with a placement
// number `p` (the match awarding places `p` and `p + 1`). Offset shifts
// losers-bracket placements past the playoff-team count (e.g. placements
// 7/8 instead of 1/2) so winners + losers brackets together cover every team.
function extractPlacements(bracket, offset) {
  const placements = {};
  for (const match of bracket) {
    if (!match.p) continue;
    placements[match.w] = match.p + offset;
    placements[match.l] = match.p + offset + 1;
  }
  return placements;
}

function extractPlayoffRosterIds(winnersBracket) {
  const ids = new Set();
  for (const match of winnersBracket) {
    if (match.t1 != null) ids.add(match.t1);
    if (match.t2 != null) ids.add(match.t2);
  }
  return ids;
}

async function fetchRegularSeasonMatchups(leagueId, playoffWeekStart) {
  if (!playoffWeekStart || playoffWeekStart < 2) return [];
  const weeks = [];
  for (let week = 1; week < playoffWeekStart; week += 1) {
    weeks.push(week);
  }

  const results = [];
  for (const week of weeks) {
    const matchups = await getMatchups(leagueId, week);
    if (!matchups.length) continue;

    const byMatchupId = new Map();
    for (const entry of matchups) {
      if (entry.matchup_id == null) continue;
      if (!byMatchupId.has(entry.matchup_id)) byMatchupId.set(entry.matchup_id, []);
      byMatchupId.get(entry.matchup_id).push(entry);
    }

    for (const pair of byMatchupId.values()) {
      if (pair.length !== 2) continue;
      const [a, b] = pair;
      results.push({
        week,
        rosterA: a.roster_id,
        rosterB: b.roster_id,
        scoreA: a.points ?? 0,
        scoreB: b.points ?? 0
      });
    }
  }
  return results;
}

async function fetchSeasonData(leagueMeta) {
  const { leagueId, season, settings } = leagueMeta;

  const [rosters, users, winnersBracket, losersBracket] = await Promise.all([
    getRosters(leagueId),
    getUsers(leagueId),
    getWinnersBracket(leagueId),
    getLosersBracket(leagueId)
  ]);

  const usersById = new Map(users.map((user) => [user.user_id, user]));
  const winnersPlacements = extractPlacements(winnersBracket, 0);
  const losersPlacements = extractPlacements(losersBracket, settings.playoffTeams || 0);
  const playoffRosterIds = extractPlayoffRosterIds(winnersBracket);

  const teams = rosters
    .filter((roster) => roster.owner_id)
    .map((roster) => {
      const user = usersById.get(roster.owner_id);
      const placement = winnersPlacements[roster.roster_id] ?? losersPlacements[roster.roster_id] ?? null;

      return {
        rosterId: roster.roster_id,
        ownerId: roster.owner_id,
        coOwnerIds: Array.isArray(roster.co_owners) ? roster.co_owners : [],
        teamName: user?.metadata?.team_name || null,
        displayName: user?.display_name || null,
        avatar: user?.avatar || null,
        wins: roster.settings?.wins ?? 0,
        losses: roster.settings?.losses ?? 0,
        ties: roster.settings?.ties ?? 0,
        pointsFor: centsToNumber(roster.settings?.fpts, roster.settings?.fpts_decimal),
        pointsAgainst: centsToNumber(roster.settings?.fpts_against, roster.settings?.fpts_against_decimal),
        placement,
        madePlayoffs: playoffRosterIds.has(roster.roster_id),
        isChampion: placement === 1,
        streak: roster.metadata?.streak || null
      };
    });

  const headToHead = await fetchRegularSeasonMatchups(leagueId, settings.playoffWeekStart);

  return {
    season,
    leagueId,
    numTeams: settings.numTeams,
    playoffTeams: settings.playoffTeams,
    teams,
    headToHead
  };
}

module.exports = { fetchSeasonData };
