const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "..", "config", "identity-map.json");

function loadIdentityMap() {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  return {
    aliases: raw.aliases || {},
    displayNameOverrides: raw.displayNameOverrides || {}
  };
}

// Follows an alias chain (secondary user_id -> primary user_id) to its root,
// so a manager who played under multiple Sleeper accounts is credited as one person.
function resolveOwnerId(identityMap, ownerId) {
  let current = ownerId;
  const seen = new Set();
  while (identityMap.aliases[current] && !seen.has(current)) {
    seen.add(current);
    current = identityMap.aliases[current];
  }
  return current;
}

module.exports = { loadIdentityMap, resolveOwnerId };
