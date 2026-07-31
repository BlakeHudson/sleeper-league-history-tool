const fs = require("fs");
const path = require("path");
const { discoverLeagueChain } = require("./lib/leagueChain");
const { fetchSeasonData } = require("./lib/season");

const ROOT_LEAGUE_ID = process.env.SLEEPER_LEAGUE_ID || "1388349774029164544";
const OUTPUT_PATH = path.join(__dirname, "..", "data", "historical.json");

async function main() {
  console.log(`Discovering league chain from ${ROOT_LEAGUE_ID}...`);
  const chain = await discoverLeagueChain(ROOT_LEAGUE_ID);
  console.log(`Found ${chain.length} season(s):`, chain.map((s) => `${s.season} (${s.status})`).join(", "));

  const completedSeasons = chain.filter((s) => s.status === "complete");
  console.log(`Building historical data for ${completedSeasons.length} completed season(s)...`);

  const seasons = [];
  for (const meta of completedSeasons) {
    console.log(`  fetching ${meta.season}...`);
    const seasonData = await fetchSeasonData(meta);
    seasons.push(seasonData);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sourceLeagueId: ROOT_LEAGUE_ID,
    seasons
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
