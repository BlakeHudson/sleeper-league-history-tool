const fs = require("fs");
const path = require("path");
const { discoverLeagueChain } = require("./lib/leagueChain");
const { fetchSeasonData } = require("./lib/season");

const ROOT_LEAGUE_ID = process.env.SLEEPER_LEAGUE_ID || "1388349774029164544";
const OUTPUT_PATH = path.join(__dirname, "..", "data", "current_season.json");

async function main() {
  const chain = await discoverLeagueChain(ROOT_LEAGUE_ID);
  const current = chain[chain.length - 1];
  if (!current) {
    throw new Error(`Could not resolve current season from league ${ROOT_LEAGUE_ID}`);
  }

  console.log(`Fetching current season ${current.season} (status: ${current.status})...`);
  const seasonData = await fetchSeasonData(current);

  const output = {
    generatedAt: new Date().toISOString(),
    sourceLeagueId: ROOT_LEAGUE_ID,
    season: seasonData
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
