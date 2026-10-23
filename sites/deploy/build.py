#!/usr/bin/env python3
"""Copy the built shops into public/projects/bookshops/ for the Worker.

    python3 build.py      (run ../tools/build.py first if the data changed)

The Worker's policy allows scripts from this origin only, so the hub's inline script is written out
to hub.js. Research data, tools and the single-file dist/ builds stay out of the upload."""
import os, re, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SITES = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'public', 'projects', 'bookshops')
SHOPS = ['scepter-uk', 'sinag-tala', 'scepter-kenya', 'scepter-australia']

shutil.rmtree(os.path.join(HERE, 'public'), ignore_errors=True)
shutil.copytree(os.path.join(SITES, 'engine'), os.path.join(OUT, 'engine'))
for shop in SHOPS:
    shutil.copytree(os.path.join(SITES, shop), os.path.join(OUT, shop))
hub = open(os.path.join(SITES, 'index.html')).read()
m = re.search(r'<script>\n(.*?)</script>', hub, re.S)
open(os.path.join(OUT, 'hub.js'), 'w').write(m.group(1))
hub = hub[:m.start()] + '<script src="hub.js"></script>' + hub[m.end():]
open(os.path.join(OUT, 'index.html'), 'w').write(hub)
inline = [p for p in [os.path.join(OUT, 'index.html')] + [os.path.join(OUT, s, 'index.html') for s in SHOPS]
          if re.search(r'<script>(?!\s*</script>)', open(p).read())]
assert not inline, f'inline scripts left: {inline}'
n = sum(len(f) for _, _, f in os.walk(OUT))
print(f'{n} files in public/projects/bookshops/')
