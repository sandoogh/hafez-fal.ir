# hafez-fal.ir

A simple, clean, ad-free Hafez fortune-telling (fal) website.

- Live: https://hafez-fal.ir
- 495 ghazals with interpretations
- Dark mode, PWA (installable, works offline)
- No frameworks, no dependencies

## Building

```bash
git clone https://github.com/sandoogh/hafez-fal.ir.git
cd hafez-fal.ir
python3 build.py
```

Output goes to `public/`. Serve it with any static file server or deploy to GitHub Pages.

## Project structure

```
build.py              # generates the site
templates/            # HTML templates
static/               # CSS, icon, PWA files
content/ghazal/       # 495 poem markdown files
```

## Deploying

```bash
./deploy.sh
```

This builds the site and pushes `public/` to the `gh-pages` branch. GitHub Pages serves from that branch.

After deploying, clear Cloudflare cache from the dashboard.

## Updating content

1. Edit `.md` files in `content/ghazal/`
2. Run `python3 build.py`
3. Bump the version in `static/sw.js` (e.g. `hafez-fal-v1` to `hafez-fal-v2`)
4. Run `./deploy.sh`
