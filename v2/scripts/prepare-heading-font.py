"""Regenerate the self-hosted heading font after adding new Chinese content.

Requires fonttools and brotli. Normal Astro builds use the prepared WOFF2.
"""
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
local_libraries = ROOT / '.tools' / 'font-libs'
if local_libraries.exists():
    sys.path.insert(0, str(local_libraries))

from fontTools import subset
from fontTools.ttLib import TTFont

package = ROOT / 'node_modules' / '@fontsource' / 'lxgw-wenkai'
source = package / 'files' / 'lxgw-wenkai-latin-500-normal.woff2'
destination = ROOT / 'public' / 'fonts'
destination.mkdir(parents=True, exist_ok=True)
text = ''.join(chr(code) for code in range(32, 127))
for file in (ROOT / 'src').rglob('*'):
    if file.suffix in {'.astro', '.md', '.ts'}:
        text += file.read_text(encoding='utf-8')
characters = ''.join(sorted({char for char in text if ord(char) >= 32}))
print(f'Reading heading font; {len(characters)} source characters.', flush=True)
font = TTFont(source, lazy=True)
print('Subsetting outlines.', flush=True)
options = subset.Options()
options.flavor = 'woff2'
options.layout_features = []
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=characters)
subsetter.subset(font)
# OFL reserved family names must not be used by a modified font.
names = {1: 'Xinlei WenKai', 2: 'Medium', 4: 'Xinlei WenKai Medium',
         6: 'XinleiWenKai-Medium', 16: 'Xinlei WenKai', 17: 'Medium'}
for record in font['name'].names:
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding())
font.flavor = 'woff2'
target = destination / 'xinlei-wenkai.woff2'
print('Compressing subset.', flush=True)
font.save(target)
shutil.copyfile(package / 'LICENSE', destination / 'OFL-LXGW-WenKai.txt')
shutil.copyfile(ROOT / 'node_modules' / '@fontsource-variable' / 'noto-sans-sc' / 'LICENSE', destination / 'OFL-Noto-Sans-SC.txt')
print(f'Heading font: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes; {len(characters)} source characters.')
