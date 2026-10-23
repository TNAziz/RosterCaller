"""Build docs/Roster_Caller_Guide.pdf, a printable handout made from README.md.

    python docs/tools/make_guide_pdf.py [path-to-chrome]

Needs the Python "markdown" package and Google Chrome (or Edge). The
developer-only "Maintaining the app" section is left out.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "Roster_Caller_Guide.pdf"
CHROME = sys.argv[1] if len(sys.argv) > 1 else r"C:\Program Files\Google\Chrome\Application\chrome.exe"

md = (ROOT / "README.md").read_text(encoding="utf-8")
md = md.split("\n## Maintaining the app", 1)[0]
md = md.replace(" · [Maintaining the app](#maintaining-the-app)", "")
md = md.replace(" · **Printable guide:** [Roster_Caller_Guide.pdf](docs/Roster_Caller_Guide.pdf)", "")
body = markdown.markdown(md, extensions=["tables", "toc", "md_in_html", "sane_lists"])

html = f"""<!doctype html><html><head><meta charset="utf-8">
<base href="{ROOT.as_uri()}/">
<title>Roster Caller: Instructor Guide</title>
<style>
@page {{ size: letter; margin: 0.65in 0.7in 0.7in;
  @bottom-left {{ content: "Roster Caller · Instructor guide"; font: 9px Arial, sans-serif; color: #777; }}
  @bottom-right {{ content: "Page " counter(page) " of " counter(pages); font: 9px Arial, sans-serif; color: #777; }} }}
body {{ font: 11pt/1.45 "Segoe UI", Arial, sans-serif; color: #1c1c1e; }}
h1 {{ font-size: 26pt; margin: 0 0 4px; color: #c8102e; letter-spacing: -.01em; }}
h1 + p {{ font-size: 13pt; margin-top: 0; }}
h2 {{ font-size: 16pt; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #c8102e; break-after: avoid; }}
h3 {{ font-size: 12.5pt; break-after: avoid; }}
p:has(> strong:only-child) {{ break-after: avoid; }}
h2#1-set-up-once-per-phone {{ break-before: page; }}
hr {{ display: none; }}
a {{ color: #0a63d6; text-decoration: none; }}
code {{ font: 10pt Consolas, monospace; background: #f2f2f5; padding: 1px 4px; border-radius: 3px; }}
table {{ border-collapse: collapse; width: 100%; margin: 8px 0 12px; break-inside: avoid; font-size: 10.5pt; }}
th, td {{ border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; text-align: left; }}
th {{ background: #f6f6f8; }}
table[align=center], table[align=center] td {{ border: 0; width: auto; margin: 8px auto; text-align: center; }}
img {{ max-width: 100%; border-radius: 8px; border: 1px solid #ddd; break-inside: avoid; }}
/* Phone screenshots: size by height so rows of them fit the page. */
img[src*="screenshots/0"], img[src*="screenshots/1"] {{ width: auto; height: 3.5in; margin: 0 4px; }}
p[align=center] img[src*="screenshots/"] {{ height: 3.1in; }}
p[align=center] img:only-child {{ height: 2.7in; }}
td img[src*="screenshots/"] {{ height: 3.6in; }}
table[align=center] tr td:nth-last-child(4) img, table[align=center] tr td:nth-last-child(4) ~ td img {{ height: 2.75in; }}
img[src*="mypack-"] {{ width: 4.7in; height: auto; }}
p[align=center] {{ text-align: center; break-inside: avoid; }}
li img {{ display: block; margin: 8px 0 4px; }}
blockquote {{ margin: 10px 0; padding: 8px 12px; background: #fdf0d8; border-left: 4px solid #e0a030; border-radius: 4px; break-inside: avoid; }}
blockquote p {{ margin: 0; }}
sub {{ font-size: 9pt; color: #666; vertical-align: baseline; }}
li {{ margin: 3px 0; }}
</style></head><body>{body}</body></html>"""

with tempfile.TemporaryDirectory() as tmp:
    page = Path(tmp) / "guide.html"
    page.write_text(html, encoding="utf-8")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    "--allow-file-access-from-files", f"--print-to-pdf={OUT}", page.as_uri()],
                   check=True, capture_output=True, timeout=120)
print("wrote", OUT)
