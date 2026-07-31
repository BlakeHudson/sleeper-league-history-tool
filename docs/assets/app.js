async function loadHistory() {
  const response = await fetch("data/history.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load history.json (${response.status})`);
  return response.json();
}

function formatRecord(person) {
  const c = person.career;
  return c.ties ? `${c.wins}-${c.losses}-${c.ties}` : `${c.wins}-${c.losses}`;
}

function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatPoints(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

function personLink(person) {
  return `person.html?id=${encodeURIComponent(person.id)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}
