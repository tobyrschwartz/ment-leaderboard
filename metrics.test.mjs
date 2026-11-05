import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

class Element {
  children = [];
  textContent = "";
  value = "";
  hidden = false;
  replaceChildren(...children) { this.children = children; }
  append(...children) { this.children.push(...children); }
  add(option) { this.children.push(option); }
  addEventListener() {}
  querySelector() { return new Element(); }
}

const elements = new Map();
const context = vm.createContext({
  document: {
    querySelector: (selector) => {
      if (!elements.has(selector)) elements.set(selector, new Element());
      return elements.get(selector);
    },
    createElement: () => new Element()
  },
  Option: class { constructor(text, value) { this.text = text; this.value = value; } },
  fetch: () => new Promise(() => {}),
  setInterval: () => {},
  Intl,
  Date,
  console
});

vm.runInContext(readFileSync(new URL("./app.js", import.meta.url), "utf8"), context);
vm.runInContext(`loadRows([
  ["Group Name", "Total Revenue", "Week 11/3 Revenue", "Shopify Sessions", "Shopify Orders", "Shopify Top Traffic Source", "Shopify Conversion Rate", "Social Views", "Social Likes", "Social Comments", "Social Shares"],
  ["Team A", "$125.00", "$25.00", "1,234", "12", "Instagram", "2.5%", "4,000", "100", "8", "3"],
  ["Team B", "$0.00", "", "", "", "", "", "", "", "", ""]
])`, context);

const values = (selector) => elements.get(selector).children.map((item) => item.children[1].textContent);
assert.deepEqual(values("#shopify-metrics"), ["1,234", "12", "Instagram", "$125.00", "2.5%"]);
assert.deepEqual(values("#social-metrics"), ["4,000", "100", "8", "3"]);
vm.runInContext(`state.insightTeam = "Team B"; renderInsights()`, context);
assert.deepEqual(values("#social-metrics"), ["—", "—", "—", "—"]);
