const BASE_URL = "https://api.sleeper.app/v1";

async function getJson(path, { optional = false } = {}) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (response.status === 404 && optional) return null;
  if (!response.ok) {
    throw new Error(`Sleeper API request failed: ${path} (${response.status})`);
  }
  const text = await response.text();
  if (!text || text === "null") return null;
  return JSON.parse(text);
}

function getLeague(leagueId) {
  return getJson(`/league/${leagueId}`);
}

function getRosters(leagueId) {
  return getJson(`/league/${leagueId}/rosters`).then((data) => data || []);
}

function getUsers(leagueId) {
  return getJson(`/league/${leagueId}/users`).then((data) => data || []);
}

function getWinnersBracket(leagueId) {
  return getJson(`/league/${leagueId}/winners_bracket`, { optional: true }).then((data) => data || []);
}

function getLosersBracket(leagueId) {
  return getJson(`/league/${leagueId}/losers_bracket`, { optional: true }).then((data) => data || []);
}

function getMatchups(leagueId, week) {
  return getJson(`/league/${leagueId}/matchups/${week}`, { optional: true }).then((data) => data || []);
}

module.exports = {
  getLeague,
  getRosters,
  getUsers,
  getWinnersBracket,
  getLosersBracket,
  getMatchups
};
