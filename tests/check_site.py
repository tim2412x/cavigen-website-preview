"""Dependency-free structural checks for the static handoff."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re

ROOT = Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(); self.path=path; self.ids=[]; self.links=[]; self.headings=0
        self.feed(path.read_text())
    def handle_starttag(self, tag, pairs):
        attrs=dict(pairs)
        if 'id' in attrs: self.ids.append(attrs['id'])
        if tag=='h1': self.headings+=1
        if tag=='img': assert attrs.get('alt'), f'Missing alt: {self.path}'
        if tag in ('a','link','img','script'):
            value=attrs.get('href') if tag in ('a','link') else attrs.get('src')
            if value: self.links.append(value)

pages={f.name:Page(f) for f in ROOT.glob('*.html')}
assert set(pages)=={'index.html','platform.html','applications.html','brand.html','finder.html','about.html'}
count=0
for name,page in pages.items():
    assert page.headings==1, f'Expected one h1: {name}'
    assert len(page.ids)==len(set(page.ids)), f'Duplicate id: {name}'
    for value in page.links:
        url=urlsplit(value)
        if url.scheme or url.netloc: continue
        target=(ROOT/unquote(url.path)).resolve() if url.path else page.path
        assert target.is_relative_to(ROOT), value
        assert target.is_file(), f'Missing local target: {name}: {value}'
        if url.fragment and target.suffix=='.html':
            assert unquote(url.fragment) in pages[target.name].ids, f'Missing anchor: {value}'
        count+=1
for value in re.findall(r"url\(['\"]?([^)'\"]+)", (ROOT/'style.css').read_text()):
    assert (ROOT/value).is_file(), f'Missing CSS asset: {value}'
assert all((ROOT/'assets'/f).is_file() for f in ('OFL-Raleway.txt',))
print(f'PASS: {len(pages)} pages, {count} local references, images, anchors, heading structure and font files.')

for name in pages:
    source=(ROOT/name).read_text()
    assert 'href="about.html"' in source, f'Missing About navigation: {name}'
    assert 'index.html#about' not in source, f'Old About anchor: {name}'
about=(ROOT/'about.html').read_text()
assert 'ZEISS' not in about.upper()
assert all(name in about for name in ('startup innovativ', 'Pioniergeist', '3rd place', 'GO-Bio initial', 'ZIM cooperation', '5-HT'))
assert 'founder-grid' not in (ROOT/'index.html').read_text()
print('PASS: dedicated About page, navigation, awards and founder relocation.')
