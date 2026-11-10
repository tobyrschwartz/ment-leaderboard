const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRO9dN-T2Almg8DbAnZRm4Lh_X-Vmt9QYKwoplJtIYIkpWM4BSmR1o7gLWdX-c7Rp198KOnQprih5K6/pub?gid=1660851265&single=true&output=csv";

const $ = (selector) => document.querySelector(selector);
const state = { teams: [], weeks: [], activePeriod: "total", currentWeekPosition: -1, insightTeam: "" };
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
const count = (value) => value === null ? "—" : new Intl.NumberFormat("en-US").format(value);
const METRICS = ["Shopify Sessions", "Shopify Orders", "Shopify Top Traffic Source", "Shopify Conversion Rate", "Social Views", "Social Likes", "Social Comments", "Social Shares"];

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((cells) => cells.some((value) => value.trim()));
}

function parseAmount(value) {
  if (!value?.trim()) return null;
  const amount = Number(value.replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1"));
  return Number.isFinite(amount) ? amount : null;
}

function loadRows(rows) {
  const selectedPeriod = state.teams.length ? state.activePeriod : null;
  const headers = rows.shift().map((header) => header.trim());
  const metricIndexes = Object.fromEntries(METRICS.map((name) => [name, headers.findIndex((header) => header.toLowerCase() === name.toLowerCase())]));
  const groupIndex = headers.findIndex((header) => header.toLowerCase() === "group name");
  const totalIndex = headers.findIndex((header) => header.toLowerCase() === "total revenue");
  if (groupIndex < 0) throw new Error("The published CSV needs a “Group Name” column.");
  const weekIndexes = headers.map((header, index) => ({ header, index })).filter(({ header }) => /^week\s/i.test(header));
  if (!weekIndexes.length) throw new Error("No weekly revenue columns were found in the published CSV.");
  state.weeks = weekIndexes;
  state.teams = rows.map((cells, order) => {
    const weeks = weekIndexes.map(({ index }) => parseAmount(cells[index] || ""));
    const weeklySum = weeks.reduce((sum, value) => sum + (value ?? 0), 0);
    const metrics = Object.fromEntries(METRICS.map((name) => [name, (cells[metricIndexes[name]] || "").trim()]));
    return { name: (cells[groupIndex] || "").trim(), order, weeks, total: parseAmount(cells[totalIndex] || "") ?? weeklySum, metrics };
  }).filter((team) => team.name);
  const activeWeek = [...weekIndexes].reverse().find(({ index }) => rows.some((cells) => parseAmount(cells[index] || "") !== null));
  state.currentWeekPosition = activeWeek ? weekIndexes.findIndex((week) => week.index === activeWeek.index) : -1;
  state.activePeriod = selectedPeriod && (selectedPeriod === "total" || weekIndexes.some(({ index }) => String(index) === selectedPeriod))
    ? selectedPeriod : activeWeek ? String(activeWeek.index) : "total";
  const period = $("#period");
  period.replaceChildren(new Option("All-time revenue", "total"));
  weekIndexes.forEach(({ header, index }) => period.add(new Option(header.replace(/^Week\s*/i, ""), String(index))));
  period.value = state.activePeriod;
  $("#team-count").textContent = String(state.teams.length).padStart(2, "0");
  updatePeriodLabel();
  $("#footer-date").textContent = `Updated ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date())}`;
  $("#error").hidden = true;
  if (!state.teams.some((team) => team.name === state.insightTeam)) state.insightTeam = rankings()[0]?.name || "";
  const insightSelect = $("#insight-team");
  insightSelect.replaceChildren(...state.teams.map((team) => new Option(team.name, team.name)));
  insightSelect.value = state.insightTeam;
  render();
}

function updatePeriodLabel() {
  const week = state.weeks.find(({ index }) => String(index) === state.activePeriod);
  $("#updated").textContent = `Showing ${week ? week.header.replace(/\s+Revenue$/i, "") : "all-time revenue"} · refreshed just now`;
}

function rankings() {
  const selected = state.activePeriod;
  const index = Number(selected);
  return state.teams.map((team) => ({ ...team, value: selected === "total" ? team.total : (team.weeks[state.weeks.findIndex((week) => week.index === index)] ?? 0) }))
    .sort((a, b) => b.value - a.value || a.order - b.order);
}

function render() {
  const ranked = rankings();
  const podium = $("#podium");
  podium.replaceChildren();
  const order = ranked.length > 1 ? [1, 0, 2] : [0];
  order.forEach((index) => {
    const team = ranked[index];
    if (!team) return;
    const card = document.createElement("article");
    card.className = `leader-card${index === 0 ? " first" : ""}`;
    card.innerHTML = `<div class="leader-meta"><span class="rank-badge">#${index + 1}</span><span class="leader-week">${state.activePeriod === "total" ? "ALL-TIME" : "SELECTED WEEK"}</span></div><div><h3 class="leader-name"></h3><div class="leader-total">${money(team.value)}</div></div>${index === 0 ? '<span class="leader-doodle" aria-hidden="true">✳</span>' : ""}`;
    card.querySelector(".leader-name").textContent = team.name;
    podium.append(card);
  });

  const query = $("#search").value.trim().toLowerCase();
  const visible = ranked.filter((team) => team.name.toLowerCase().includes(query));
  const max = Math.max(1, ...ranked.map((team) => team.value));
  const list = $("#standings");
  list.replaceChildren();
  renderInsights();
  if (!visible.length) { list.innerHTML = '<div class="message">No teams match that search.</div>'; return; }
  visible.forEach((team) => {
    const rank = ranked.indexOf(team) + 1;
  const week = state.activePeriod === "total" ? state.currentWeekPosition : state.weeks.findIndex((item) => item.index === Number(state.activePeriod));
    const current = state.activePeriod === "total" ? (team.weeks[week] ?? 0) : team.value;
    const row = document.createElement("div");
    row.className = "team-row";
    row.innerHTML = `<span class="team-rank">${String(rank).padStart(2, "0")}</span><span class="team-name"></span><span class="team-week"><span class="bar-track"><span class="bar-fill" style="display:block;width:${Math.max(0, current / max * 100)}%"></span></span><span class="team-week-label">${money(current)}</span></span><span class="team-total">${money(team.value)}</span>`;
    row.querySelector(".team-name").textContent = team.name;
    list.append(row);
  });
}

function renderInsights() {
  const team = state.teams.find((item) => item.name === state.insightTeam);
  const metric = (name) => team?.metrics[name] || "";
  const number = (name) => {
    const value = metric(name);
    return value && /^\d[\d,]*$/.test(value) ? count(Number(value.replace(/,/g, ""))) : "—";
  };
  const social = (name) => {
    const value = metric(name);
    if (!value) return "—";
    if (/^\d[\d,]*$/.test(value)) return count(Number(value.replace(/,/g, "")));
    return value.replace(/(?:,\s*|\s+)(?=(?:TikTok|TicTok|Instagram|Saved to fav)\b)/gi, "\n")
      .split("\n").map((part) => part.trim()).filter(Boolean).join("\n");
  };
  const text = (name) => metric(name) || "—";
  const rate = metric("Shopify Conversion Rate");
  const groups = [
    ["#shopify-metrics", [["Sessions", number("Shopify Sessions")], ["Orders", number("Shopify Orders")], ["Top traffic source", text("Shopify Top Traffic Source")], ["Gross revenue", team ? money(team.total) : "—"], ["Conversion rate", rate ? (rate.includes("%") ? rate : `${rate}%`) : "—"]]],
    ["#social-metrics", [["Views", social("Social Views")], ["Likes", social("Social Likes")], ["Comments", social("Social Comments")], ["Shares", social("Social Shares")]]]
  ];
  groups.forEach(([selector, entries]) => {
    const list = $(selector);
    list.replaceChildren();
    entries.forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "metric";
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      item.append(term, description);
      list.append(item);
    });
  });
}

async function refresh() {
  const button = $("#refresh");
  button.disabled = true;
  $("#updated").textContent = "Checking the class sheet…";
  try {
    const response = await fetch(`${CSV_URL}&cache=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`The class sheet returned ${response.status}.`);
    loadRows(parseCSV(await response.text()));
  } catch (error) {
    $("#updated").textContent = "Couldn’t refresh the class sheet";
    $("#error").textContent = `${error.message} Check that the Leaderboard tab is published as CSV and available to anyone with the link.`;
    $("#error").hidden = false;
    if (!state.teams.length) $("#standings").innerHTML = '<div class="message">Leaderboard data could not be loaded.</div>';
  } finally { button.disabled = false; }
}

$("#period").addEventListener("change", (event) => { state.activePeriod = event.target.value; updatePeriodLabel(); render(); });
$("#search").addEventListener("input", render);
$("#insight-team").addEventListener("change", (event) => { state.insightTeam = event.target.value; renderInsights(); });
$("#refresh").addEventListener("click", refresh);
refresh();
setInterval(refresh, 5 * 60 * 1000);
