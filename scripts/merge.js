const fs = require("fs");
const path = require("path");
const { loadIdentityMap, resolveOwnerId } = require("./lib/identityMap");

const HISTORICAL_PATH = path.join(__dirname, "..", "data", "historical.json");
const CURRENT_PATH = path.join(__dirname, "..", "data", "current_season.json");
const OUTPUT_PATH = path.join(__dirname, "..", "docs", "data", "history.json");

function winPct(team) {
  const games = team.wins + team.losses + team.ties;
  if (!games) return 0;
  return (team.wins + team.ties * 0.5) / games;
}

function emptyPerson(id) {
  return {
    id,
    displayName: null,
    avatar: null,
    seasons: [],
    career: { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, championships: 0, playoffAppearances: 0 }
  };
}

function buildPeople(seasons, identityMap) {
  const people = new Map();

  for (const season of seasons) {
    for (const team of season.teams) {
      const canonicalId = resolveOwnerId(identityMap, team.ownerId);
      if (!people.has(canonicalId)) people.set(canonicalId, emptyPerson(canonicalId));
      const person = people.get(canonicalId);

      // Later seasons overwrite display name/avatar so the profile reflects
      // the account's current identity, not whatever it was called first.
      person.displayName = team.displayName || person.displayName;
      person.avatar = team.avatar || person.avatar;

      person.seasons.push({
        season: season.season,
        teamName: team.teamName,
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
        pointsFor: Number(team.pointsFor.toFixed(2)),
        pointsAgainst: Number(team.pointsAgainst.toFixed(2)),
        placement: team.placement,
        madePlayoffs: team.madePlayoffs,
        isChampion: team.isChampion,
        streak: team.streak
      });

      person.career.wins += team.wins;
      person.career.losses += team.losses;
      person.career.ties += team.ties;
      person.career.pointsFor += team.pointsFor;
      person.career.pointsAgainst += team.pointsAgainst;
      if (team.isChampion) person.career.championships += 1;
      if (team.madePlayoffs) person.career.playoffAppearances += 1;
    }
  }

  for (const person of people.values()) {
    person.seasons.sort((a, b) => Number(a.season) - Number(b.season));
    person.career.pointsFor = Number(person.career.pointsFor.toFixed(2));
    person.career.pointsAgainst = Number(person.career.pointsAgainst.toFixed(2));
    person.career.gamesPlayed = person.career.wins + person.career.losses + person.career.ties;
    person.career.winPct = Number(winPct(person.career).toFixed(4));
    person.seasonsPlayed = person.seasons.length;

    if (person.seasons.length) {
      const bySeasonWinPct = [...person.seasons].sort((a, b) => winPct(b) - winPct(a) || b.pointsFor - a.pointsFor);
      person.bestSeason = bySeasonWinPct[0];
      person.worstSeason = bySeasonWinPct[bySeasonWinPct.length - 1];
      person.mostRecentSeason = person.seasons[person.seasons.length - 1];
      person.currentStreak = {
        season: person.mostRecentSeason.season,
        value: person.mostRecentSeason.streak
      };
    }
  }

  return people;
}

function buildHeadToHead(seasons, identityMap) {
  // personA -> personB -> { wins, losses, ties } (wins = personA's wins over personB)
  const grid = new Map();

  function ensurePair(a, b) {
    if (!grid.has(a)) grid.set(a, new Map());
    if (!grid.get(a).has(b)) grid.get(a).set(b, { wins: 0, losses: 0, ties: 0 });
    return grid.get(a).get(b);
  }

  for (const season of seasons) {
    const ownerByRoster = new Map(season.teams.map((t) => [t.rosterId, t.ownerId]));

    for (const matchup of season.headToHead) {
      const ownerA = ownerByRoster.get(matchup.rosterA);
      const ownerB = ownerByRoster.get(matchup.rosterB);
      if (!ownerA || !ownerB) continue; // orphaned/ownerless roster, can't attribute

      const personA = resolveOwnerId(identityMap, ownerA);
      const personB = resolveOwnerId(identityMap, ownerB);
      if (personA === personB) continue; // shouldn't happen, but guard anyway

      const aVsB = ensurePair(personA, personB);
      const bVsA = ensurePair(personB, personA);

      if (matchup.scoreA > matchup.scoreB) {
        aVsB.wins += 1;
        bVsA.losses += 1;
      } else if (matchup.scoreB > matchup.scoreA) {
        aVsB.losses += 1;
        bVsA.wins += 1;
      } else {
        aVsB.ties += 1;
        bVsA.ties += 1;
      }
    }
  }

  const result = {};
  for (const [personA, opponents] of grid.entries()) {
    result[personA] = {};
    for (const [personB, record] of opponents.entries()) {
      result[personA][personB] = record;
    }
  }
  return result;
}

function main() {
  const historical = JSON.parse(fs.readFileSync(HISTORICAL_PATH, "utf8"));
  const current = fs.existsSync(CURRENT_PATH) ? JSON.parse(fs.readFileSync(CURRENT_PATH, "utf8")) : null;
  const identityMap = loadIdentityMap();

  const seasons = historical.seasons.filter((s) => !current || s.season !== current.season.season);
  if (current) seasons.push(current.season);
  seasons.sort((a, b) => Number(a.season) - Number(b.season));

  const people = buildPeople(seasons, identityMap);
  const headToHead = buildHeadToHead(seasons, identityMap);

  const peopleList = [...people.values()].sort(
    (a, b) => b.career.championships - a.career.championships || b.career.winPct - a.career.winPct
  );

  const output = {
    generatedAt: new Date().toISOString(),
    sourceLeagueId: historical.sourceLeagueId,
    seasonsCovered: seasons.map((s) => s.season),
    people: peopleList,
    headToHead
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${OUTPUT_PATH} (${peopleList.length} people, ${seasons.length} seasons)`);
}

main();
