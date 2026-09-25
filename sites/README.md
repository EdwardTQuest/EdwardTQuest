# Four bookshops

Concept shops for four publishing houses. Every title is offered as a book, an eBook and an
audiobook at one price: the price Amazon lists.

| shop | where | titles | look |
|---|---|---|---|
| [`scepter-uk/`](scepter-uk/) | London | 23 | Caslon on chalk paper; royal ink and gold; contour lines to a summit |
| [`sinag-tala/`](sinag-tala/) | Makati, Philippines | 35 | Fraunces; night indigo and star gold; eight-ray starlight |
| [`scepter-kenya/`](scepter-kenya/) | Nairobi | 22 | Bricolage Grotesque; highland green, ochre, red earth; twin peaks |
| [`scepter-australia/`](scepter-australia/) | Australia | 45 | Instrument Serif italic; night sky, wattle gold; the Southern Cross |

`index.html` is the hub: the four houses on one screen.

## Open it

- **On a laptop, no network:** open `dist/scepter-uk.html` (or any of the four). Each is one
  self-contained file: fonts, styles, scripts and catalogue inlined. AirDrop or email it to a phone.
- **As a site:** serve this folder (`npx http-server sites` or any static host) and open `/`.
  Every page also works straight from `file://`. `vercel.json` deploys the folder as it stands
  (`vercel --cwd sites`), with `noindex` so the previews stay out of search engines.

## What's where

| path | what |
|---|---|
| `engine/shop.js`, `engine/shop.css` | the one shop: shelves, search, format switch, book page, basket |
| `engine/covers.js` | typographic covers and the four marks (no images; each cover is drawn from its title) |
| `<shop>/site.js`, `<shop>/theme.css` | a house: name, words, palette, type, motif, mark |
| `<shop>/catalog.js` | generated — do not edit |
| `data/<shop>.json` | the catalogue, every entry with its research verdict, reason and sources |
| `data/<shop>.edits.json` | hand corrections, applied on every import |
| `data/prices/<shop>.csv` | the prices — one row per title |
| `tools/build.py` | data → `catalog.js`, `dist/*.html`, the hub |
| `tools/import_research.py` | a research run → `data/<shop>.json` |
| `tools/fetchfonts.py` | self-hosts the Google Fonts (OFL) each house uses |
| `RESEARCH.md` | how the catalogues were found, what is confirmed, what is held back |

## Prices

The rule is one price per title, Amazon's, for all three formats. Put it in the `book` column of
`data/prices/<shop>.csv` (and the Amazon URL in `source`), then `python3 tools/build.py`. Leave
`ebook` and `audiobook` empty to use the same price, or fill them to override. Until a title has a
price the shop says "Price to follow" and still lets it into the basket. `seen_elsewhere` keeps the
few prices the research saw at other sellers, for reference only.

## Logos

The marks are drawn in `engine/covers.js`: one sceptre, four finials (orb and cross for London, twin
peaks for Nairobi, the Southern Cross for Australia, eight rays for Sinag-Tala). To use a house's
own logo, drop the file into its folder and set `logo: 'logo.png'` in its `site.js`. Sinag-Tala
keeps its existing logo this way.

## Rebuild

```
python3 tools/build.py              # all four + hub
python3 tools/build.py scepter-uk   # one
python3 tools/build.py --all        # also show titles the research marked doubtful
```
