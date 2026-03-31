#!/usr/bin/env python3
"""Build script for hafez-fal.ir — generates the static site from markdown content."""

import re
import shutil
from pathlib import Path

SITE_URL = "https://hafez-fal.ir"
CONTENT_DIR = Path("content/ghazal")
OUTPUT_DIR = Path("public")
STATIC_SRC = Path("static")
TEMPLATES_DIR = Path("templates")
TOTAL_GHAZALS = 495


def load_template(name):
    return (TEMPLATES_DIR / name).read_text(encoding="utf-8")


def render(template, **kwargs):
    """Replace {key} placeholders in template. Doesn't touch other curly braces."""
    result = template
    for key, value in kwargs.items():
        result = result.replace("{" + key + "}", str(value))
    return result


def parse_md(path):
    """Parse a markdown file with YAML frontmatter. Returns (metadata_dict, body_text)."""
    text = path.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text

    meta = {}
    mesra = []
    in_mesra = False
    for line in parts[1].strip().splitlines():
        if line.strip() == "mesra:":
            in_mesra = True
            continue
        if in_mesra:
            if line.strip().startswith("- "):
                mesra.append(line.strip()[2:])
            else:
                in_mesra = False
        if not in_mesra:
            match = re.match(r"(\w+):\s*(.+)", line)
            if match:
                meta[match.group(1)] = match.group(2).strip()

    meta["mesra"] = mesra
    body = parts[2].strip()
    return meta, body


def md_links_to_html(text):
    """Convert markdown [text](url) links to HTML <a> tags."""
    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)


def wrap_page(title, description, path, content):
    """Wrap content in the base template."""
    base = load_template("base.html")
    return render(base, title=title, description=description, url=f"{SITE_URL}{path}", content=content)


def build_index():
    tpl = render(load_template("index.html"), total=TOTAL_GHAZALS)
    return wrap_page(
        "فال حافظ",
        "فال حافظ آنلاین، ساده، تمیز و بدون تبلیغات. نیت کنید و فال بگیرید.",
        "/",
        tpl,
    )


def build_ghazal(meta, body, index):
    title = meta.get("title", "")
    first_verse = meta["mesra"][0] if meta["mesra"] else ""
    description = body[:150].replace('"', "&quot;") if body else first_verse

    prev_num = int(index) - 1
    next_num = int(index) + 1
    prev_link = f'<a href="/ghazal/{prev_num:03d}/">غزل قبلی</a>' if prev_num >= 1 else ""
    next_link = f'<a href="/ghazal/{next_num:03d}/">غزل بعدی</a>' if next_num <= TOTAL_GHAZALS else ""

    mesra_html = ""
    for i in range(0, len(meta["mesra"]), 2):
        first = meta["mesra"][i]
        second = meta["mesra"][i + 1] if i + 1 < len(meta["mesra"]) else ""
        mesra_html += f'      <div class="beyt"><span class="mesra">{first}</span><span class="mesra">{second}</span></div>\n'

    tpl = render(
        load_template("ghazal.html"),
        ghazal_title=title,
        mesra_html=mesra_html,
        body=body,
        prev_link=prev_link,
        next_link=next_link,
        first_verse=first_verse,
        total=TOTAL_GHAZALS,
    )
    page_title = f"فال حافظ - {title} | {first_verse}"
    return wrap_page(page_title, description, f"/ghazal/{index}/", tpl)


def build_list(all_ghazals):
    items = ""
    for index, meta, _ in sorted(all_ghazals, key=lambda x: x[0]):
        title = meta.get("title", "")
        first = meta["mesra"][0] if meta["mesra"] else ""
        items += f'      <li><a href="/ghazal/{index}/">{title}</a> — {first}</li>\n'

    tpl = render(load_template("list.html"), items=items)
    return wrap_page("فهرست غزلیات حافظ", "فهرست کامل غزلیات حافظ شیرازی", "/list/", tpl)


def build_about():
    _, body = parse_md(CONTENT_DIR / "about" / "about.md")
    paragraphs = []
    for line in body.splitlines():
        line = line.strip()
        if not line:
            continue
        line = md_links_to_html(line)
        if line.startswith("## "):
            paragraphs.append(f"      <h2>{line[3:]}</h2>")
        else:
            paragraphs.append(f"      <p>{line}</p>")

    tpl = render(load_template("about.html"), about_body="\n".join(paragraphs))
    return wrap_page("درباره این سایت - فال حافظ", "درباره سایت فال حافظ", "/about/", tpl)


def build_sitemap(all_ghazals):
    urls = f"  <url><loc>{SITE_URL}/</loc><priority>1.0</priority></url>\n"
    urls += f"  <url><loc>{SITE_URL}/about/</loc><priority>0.5</priority></url>\n"
    urls += f"  <url><loc>{SITE_URL}/list/</loc><priority>0.7</priority></url>\n"
    for index, _, _ in sorted(all_ghazals, key=lambda x: x[0]):
        urls += f"  <url><loc>{SITE_URL}/ghazal/{index}/</loc><priority>0.8</priority></url>\n"
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>'


def main():
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir()

    # Copy static files
    static_out = OUTPUT_DIR / "static"
    shutil.copytree(STATIC_SRC / "img", static_out / "img")
    (static_out / "css").mkdir(parents=True)
    shutil.copy2(STATIC_SRC / "css" / "style.css", static_out / "css" / "style.css")

    # Copy root files
    for f in Path("root").iterdir():
        shutil.copy2(f, OUTPUT_DIR / f.name)
    shutil.copy2("google77e78b686038ff48.html", OUTPUT_DIR / "google77e78b686038ff48.html")

    # Copy PWA files
    shutil.copy2(STATIC_SRC / "manifest.json", OUTPUT_DIR / "manifest.json")
    shutil.copy2(STATIC_SRC / "sw.js", OUTPUT_DIR / "sw.js")

    # Parse all ghazals
    all_ghazals = []
    for md_file in sorted(CONTENT_DIR.glob("[0-9]*.md")):
        index = md_file.stem
        meta, body = parse_md(md_file)
        all_ghazals.append((index, meta, body))

    # Build ghazal pages
    for index, meta, body in all_ghazals:
        out_dir = OUTPUT_DIR / "ghazal" / index
        out_dir.mkdir(parents=True)
        (out_dir / "index.html").write_text(build_ghazal(meta, body, index), encoding="utf-8")

    # Build index
    (OUTPUT_DIR / "index.html").write_text(build_index(), encoding="utf-8")

    # Build list
    list_dir = OUTPUT_DIR / "list"
    list_dir.mkdir()
    list_html = build_list(all_ghazals)
    (list_dir / "index.html").write_text(list_html, encoding="utf-8")

    # Old URL redirect: /list/غزلیات/ -> /list/
    old_list_dir = list_dir / "غزلیات"
    old_list_dir.mkdir()
    (old_list_dir / "index.html").write_text(
        '<meta http-equiv="refresh" content="0;url=/list/">', encoding="utf-8"
    )

    # Build about
    about_dir = OUTPUT_DIR / "about"
    about_dir.mkdir()
    (about_dir / "index.html").write_text(build_about(), encoding="utf-8")

    # Build sitemap + robots
    (OUTPUT_DIR / "sitemap.xml").write_text(build_sitemap(all_ghazals), encoding="utf-8")
    (OUTPUT_DIR / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n",
        encoding="utf-8",
    )

    print(f"Built {len(all_ghazals)} ghazal pages + index, list, about, sitemap, robots.txt")


if __name__ == "__main__":
    main()
