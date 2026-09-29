# The Venture Board

A static, dependency-free leaderboard page for GitHub Pages or Cloudflare Pages. The published Google Sheet CSV is the source of truth; the page fetches it on load and when **Refresh** is pressed.

## Publish

Upload `index.html`, `styles.css`, `tokens.css`, and `app.js` together as the site root. On GitHub Pages, push these files to a repository and enable Pages for the branch/folder. On Cloudflare Pages, deploy this folder as a static site; no build command is needed.

The page displays only group names and revenue. The CSV endpoint is public, so keep private student data off the published tab. If the site cannot load the CSV, check the browser console for a cross-origin (CORS) block; a tiny Cloudflare Worker proxy can solve that if Google blocks direct browser requests.
