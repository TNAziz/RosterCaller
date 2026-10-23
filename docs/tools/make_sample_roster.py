"""Build the sample roster used in the README: cartoon avatars of fictional
students laid out like a "Faculty Class Photo Roster" PDF.

    python docs/tools/make_sample_roster.py

Writes samples/photos/*.png and samples/sample_roster.html. Print the HTML to
samples/Sample_Roster.pdf with headless Chrome (see "Maintaining" in the README).
No real people are involved.
"""
import html
import random
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "samples"

# (name, pronouns, FERPA-restricted)
STUDENTS = [
    ("Avery Chen", "", False), ("Jordan Patel", "he/him/his", False), ("Maya Okafor", "", False),
    ("Liam Rodriguez", "", False), ("Sofia Nguyen", "she/her/hers", False), ("Ethan Brooks", "", False),
    ("Priya Shah", "", False), ("Noah Kim", "", False), ("Zoe Martinez", "they/them/theirs", False),
    ("Caleb Wright", "", False), ("Ava Johnson", "", False), ("Mateo Garcia", "", True),
    ("Lily Thompson", "", False), ("Isaac Lee", "", False), ("Nora Ali", "she/her/hers", False),
    ("Owen Fischer", "", False), ("Grace Mensah", "", False), ("Lucas Silva", "", False),
    ("Hannah Cohen", "", False), ("Elijah Turner", "", False),
]

SKIN = ["#f1c7a5", "#e0ac83", "#c68a62", "#a86b4a", "#7d4b32", "#f6d5bd"]
HAIR = ["#2b1d16", "#4a3123", "#7a4f2a", "#b5833c", "#d9b26a", "#1c1c1c", "#8c3b23"]
SHIRT = ["#3b6ea8", "#c0392b", "#2e8b57", "#7d5ba6", "#d98c1f", "#34495e", "#16a085", "#b03a6b"]
BG = ["#dfe4ea", "#e6e1dc", "#dde6e1", "#e3dfe8"]


def avatar(seed, path):
    rnd = random.Random(seed)
    S = 4  # draw large, then downsample for smooth edges
    W, H = 300 * S, 400 * S
    im = Image.new("RGB", (W, H), rnd.choice(BG))
    d = ImageDraw.Draw(im)
    skin, hair, shirt = rnd.choice(SKIN), rnd.choice(HAIR), rnd.choice(SHIRT)
    cx, head_w, head_h, head_top = W // 2, int(W * 0.50), int(H * 0.42), int(H * 0.13)
    long_hair = rnd.random() < 0.45
    if long_hair:
        d.rounded_rectangle([cx - head_w * 0.62, head_top + head_h * 0.15, cx + head_w * 0.62, head_top + head_h * 1.35],
                            radius=int(head_w * 0.3), fill=hair)
    d.ellipse([cx - W * 0.46, H * 0.72, cx + W * 0.46, H * 1.25], fill=shirt)          # shoulders
    d.rectangle([cx - W * 0.075, head_top + head_h * 0.8, cx + W * 0.075, H * 0.78], fill=skin)  # neck
    d.ellipse([cx - head_w / 2, head_top, cx + head_w / 2, head_top + head_h], fill=skin)  # head
    # hair cap
    d.chord([cx - head_w * 0.56, head_top - head_h * 0.10, cx + head_w * 0.56, head_top + head_h * 0.62],
            180, 360, fill=hair)
    # simple friendly face
    ey = head_top + head_h * 0.52
    for dx in (-1, 1):
        ex = cx + dx * head_w * 0.18
        d.ellipse([ex - S * 7, ey - S * 7, ex + S * 7, ey + S * 7], fill="#2a2a2a")
    d.arc([cx - head_w * 0.17, ey + head_h * 0.06, cx + head_w * 0.17, ey + head_h * 0.26], 20, 160,
          fill="#7a3b2e", width=S * 4)
    im.resize((300, 400), Image.LANCZOS).save(path)


def main():
    (OUT / "photos").mkdir(parents=True, exist_ok=True)
    cells = []
    for i, (name, pron, ferpa) in enumerate(STUDENTS):
        fn = f"photos/student{i + 1:02d}.png"
        avatar(i * 7919 + 13, OUT / fn)
        label = html.escape(name + (f" ({pron})" if pron else "") + (" *" if ferpa else ""))
        cells.append(f'<div class="cell"><img src="{fn}" alt=""><div class="id">{900000101 + i}</div>'
                     f'<div class="nm">{label}</div></div>')
    pages = [cells[i:i + 15] for i in range(0, len(cells), 15)]
    body = "".join(
        f'''<section class="page">
  <div class="head"><div class="logo">SAMPLE UNIVERSITY</div>
    <div class="title"><b>Faculty Class Photo Roster</b><i>Printed: Sample data, fictional students</i></div>
    <div class="meta"><i><b>Class:</b> DEMO 101 (001) - Sample Course</i><i><b>Term:</b> Sample Term</i>
      <i><b>Class Nbr:</b> 1001</i><i>&nbsp;</i><i><b>Roster Count:</b> {len(STUDENTS)} students</i></div></div>
  <div class="grid">{"".join(p)}</div>
  <div class="foot"><span>Sample roster for trying Roster Caller. All names, IDs and pictures are fictional.  * = Additional Ferpa Restrictions Apply</span>
    <b>Page {n + 1} of {len(pages)}</b></div>
</section>''' for n, p in enumerate(pages))
    (OUT / "sample_roster.html").write_text(f'''<!doctype html><html><head><meta charset="utf-8"><title>Sample Roster</title>
<style>
@page {{ size: 11in 8.5in; margin: 0; }}
body {{ margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }}
.page {{ width: 11in; height: 8.5in; box-sizing: border-box; padding: .3in .35in; position: relative; page-break-after: always; }}
.head {{ display: flex; justify-content: space-between; align-items: flex-start; height: .95in; }}
.logo {{ background: #555; color: #fff; font-weight: 700; font-size: 15px; padding: 6px 10px; letter-spacing: .03em; }}
.title {{ text-align: center; display: flex; flex-direction: column; gap: 10px; }}
.title b {{ font-size: 19px; }} .title i {{ font-size: 11px; }}
.meta {{ display: flex; flex-direction: column; font-size: 10px; width: 2.3in; }}
.grid {{ display: grid; grid-template-columns: repeat(5, 1fr); row-gap: .22in; margin-top: .1in; }}
.cell {{ text-align: center; }}
.cell img {{ width: 1.1in; height: 1.466in; display: block; margin: 0 auto; }}
.id {{ font-weight: 700; font-size: 12px; margin-top: 2px; }}
.nm {{ font-style: italic; font-size: 11px; margin-top: 3px; }}
.foot {{ position: absolute; left: .35in; right: .35in; bottom: .3in; display: flex; justify-content: space-between; font-size: 9px; font-style: italic; font-weight: 700; }}
</style></head><body>{body}</body></html>''', encoding="utf-8")
    print("wrote", OUT / "sample_roster.html")


if __name__ == "__main__":
    main()
