# The Venture Board

A static, dependency-free leaderboard page for GitHub Pages or Cloudflare Pages. The published Google Sheet CSV is the source of truth; the page fetches it on load and when **Refresh** is pressed.

## Publish

Upload `index.html`, `styles.css`, `tokens.css`, and `app.js` together as the site root. On GitHub Pages, push these files to a repository and enable Pages for the branch/folder. On Cloudflare Pages, deploy this folder as a static site; no build command is needed.

The page displays group names, revenue, and cumulative Shopify and social metrics. Add these columns to the **published Leaderboard tab** of the Google Sheet, with one row per team:

| Shopify | Socials |
| --- | --- |
| `Shopify Sessions` | `Social Views` |
| `Shopify Orders` | `Social Likes` |
| `Shopify Top Traffic Source` | `Social Comments` |
| `Shopify Conversion Rate` | `Social Shares` |

The existing `Total Revenue` column supplies Shopify gross revenue. Keep it cumulative from the start of the semester, as with the new metrics. Enter conversion rates in the sheet as displayed percentages (for example, `2.5%`). Social cells can contain a single number or platform breakdowns such as `TikTok: 9300` and `Instagram: 17,734`, on separate lines or the same line. The site displays each entry without calculating a combined total. Empty cells appear as `—` on the site, including when a new column has not yet been added. Team insights are public; the CSV endpoint is public too, so keep student names, phone numbers, emails, and other private data off the published tab. If the site cannot load the CSV, check the browser console for a cross-origin (CORS) block; a tiny Cloudflare Worker proxy can solve that if Google blocks direct browser requests.
