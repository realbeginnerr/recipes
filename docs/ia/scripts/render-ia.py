"""Render a reading copy of the YAML hierarchy (not a Mermaid engine render)."""
import json
import os
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
font_path = os.environ.get('IA_FONT', str(Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts/malgun.ttf'))
font = ImageFont.truetype(font_path, 23)
small = ImageFont.truetype(font_path, 17)
title = ImageFont.truetype(font_path, 34)
colors = ['#E2E8F0', '#DBEAFE', '#DCFCE7', '#FEF3C7', '#FCE7F3', '#EDE9FE']

for version in ['as-is', 'to-be']:
    code = "import {readIA,validateStructure} from './docs/ia/scripts/ia-core.mjs'; const d=await readIA('docs/ia/ia-%s.yaml'); if(validateStructure(d).some(x=>x.level==='Error')) throw Error('Invalid IA'); console.log(JSON.stringify(d));" % version
    doc = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', code], cwd=ROOT).decode('utf-8'))
    children = {}
    for n in doc['nodes']:
        children.setdefault(n['parent'], []).append(n)
    ordered = []
    def walk(parent):
        for n in sorted(children.get(parent, []), key=lambda n: n['order']):
            ordered.append(n)
            walk(n['id'])
    walk(None)
    assert len(ordered) == len(doc['nodes'])
    image = Image.new('RGB', (1400, 190 + 94 * len(ordered)), 'white')
    draw = ImageDraw.Draw(image)
    draw.text((48, 26), "T's Recipe / " + ('As-Is' if version == 'as-is' else 'To-Be'), font=title, fill='#122B22')
    draw.text((48, 82), 'v1.1 | 2026-10-19 | %d nodes | Hierarchy, not a user flow' % len(ordered), font=small, fill='#475569')
    draw.text((48, 112), 'YAML reading copy / To-Be = proposed structure / planned = proposal', font=small, fill='#475569')
    positions = {}
    for i, n in enumerate(ordered):
        x, y = 48 + n['depth'] * 64, 166 + i * 94
        positions[n['id']] = (x, y)
        if n['parent'] is not None:
            px, py = positions[n['parent']]
            draw.line([(x - 18, py + 78), (x - 18, y + 39), (x, y + 39)], fill='#94A3B8', width=2)
        draw.rounded_rectangle((x, y, 1352, y + 78), radius=9, fill=colors[min(n['depth'], 5)], outline='#94A3B8')
        label = n['name']
        # Measure every card to prevent clipping in exported images.
        assert draw.textbbox((0, 0), label, font=font)[2] < 1352 - x - 30, label
        draw.text((x + 15, y + 8), label, font=font, fill='#0F172A')
        detail = ' | '.join(filter(None, [n['id'], n['type'], n['implementation'], n.get('path')]))
        assert draw.textbbox((0, 0), detail, font=small)[2] < 1352 - x - 30, detail
        draw.text((x + 15, y + 44), detail, font=small, fill='#334155')
    target = ROOT / 'docs/ia/diagrams' / ('ia-' + version + '.png')
    image.save(target)
    print('Rendered %s (%d nodes)' % (target.name, len(ordered)))
