#!/usr/bin/env python3
"""Self-host Google Fonts (OFL) for one site: latin + latin-ext woff2 and a fonts.css beside them.

    python3 tools/fetchfonts.py scepter-uk 'Libre+Caslon+Text:ital,wght@0,400;0,700;1,400' ...

Uses curl, which honours the container's proxy and CA bundle."""
import os, re, subprocess, sys

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'


def get(url):
    return subprocess.run(['curl', '-sSfL', '--max-time', '40', '-A', UA, url], check=True, capture_output=True).stdout


def fetch(site, families):
    outdir = os.path.join(site, 'fonts')
    os.makedirs(outdir, exist_ok=True)
    faces = []
    for fam in families:
        css = get('https://fonts.googleapis.com/css2?family=' + fam + '&display=swap').decode()
        for subset, block in re.findall(r'/\* ([a-z\-]+) \*/\s*(@font-face \{.*?\})', css, re.S):
            if subset not in ('latin', 'latin-ext'):
                continue
            name = re.search(r"font-family: '([^']+)'", block).group(1)
            style = re.search(r'font-style: (\w+)', block).group(1)
            weight = re.search(r'font-weight: ([\d ]+);', block).group(1).strip()
            url = re.search(r'url\((https://[^)]+\.woff2)\)', block).group(1)
            fn = f"{name.lower().replace(' ', '-')}-{weight.replace(' ', '-')}{'-italic' if style == 'italic' else ''}-{subset}.woff2"
            path = os.path.join(outdir, fn)
            if not os.path.exists(path):
                with open(path, 'wb') as f:
                    f.write(get(url))
            faces.append(block.replace(url, 'fonts/' + fn))
    with open(os.path.join(site, 'fonts.css'), 'w') as f:
        f.write('/* Self-hosted from Google Fonts (SIL Open Font License). Regenerate: sites/tools/fetchfonts.py */\n')
        f.write('\n'.join(faces) + '\n')
    print(site, len(faces), 'faces:', ', '.join(sorted(os.listdir(outdir))))


if __name__ == '__main__':
    fetch(sys.argv[1], sys.argv[2:])
