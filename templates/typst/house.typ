// house.typ — the Athanasius house interior (Typst 0.13).
// One template, three editions. Everything visual lives here; the body is
// generated from manuscript.md by pandoc + templates/typst/filter.lua.

#let editions = (
  // trims in inches; margins per KDP minimums for up to ~700 pages (typeset.py raises `inside` if a book runs longer)
  deluxe:   (trim: (5.0in, 7.0in),     inside: 0.75in, outside: 0.55in, top: 0.62in, bottom: 0.70in, size: 10.5pt, leading: 0.68em, recto: true,  word: "deluxe",   note: "hardcover"),
  everyman: (trim: (4.25in, 6.375in),  inside: 0.60in, outside: 0.45in, top: 0.50in, bottom: 0.58in, size: 9.6pt,  leading: 0.64em, recto: false, word: "everyman", note: "paperback, matte"),
  scholar:  (trim: (5.0in, 7.0in),     inside: 0.85in, outside: 1.00in, top: 0.75in, bottom: 0.85in, size: 10.5pt, leading: 0.74em, recto: true,  word: "scholar",  note: "paperback, glossy, wide margins"),
)

#let ink = rgb("#111111")
#let sand = rgb("#8C7648")
#let chlabel = state("chlabel", none)      // "Chapter I", set by the filter before each chapter heading
#let mainstate = state("main", false)      // false in the front matter (roman folios), true in the text
#let pending-reset = state("reset", false) // the first chapter after mainmatter() restarts the folio at 1
#let mainmatter() = { pending-reset.update(true); mainstate.update(true) }
#let folio(pg, main) = if main { str(pg) } else { numbering("i", pg) }

#let orn(name, w) = align(center)[#image("/assets/ornaments/" + name, width: w)]
#let fleuron = orn("orn_div2_diamond.png", 0.9in)
#let rule-orn = orn("orn_swirl_double_rule.png", 1.1in)
#let leaf = orn("orn_bot_leaf_rule.png", 1.6in)

// section break inside a chapter: pandoc's `* * *` arrives as #horizontalrule
#let horizontalrule = block(above: 1.35em, below: 1.35em, width: 100%)[#orn("orn_div2_diamond.png", 0.55in)]

// verse: kept lines, hanging indent for turnovers, ragged right, a touch tighter
#let verse(body) = block(above: 0.9em, below: 0.9em, inset: (left: 1.4em, right: 0.6em))[
  #set par(justify: false, first-line-indent: 0em, hanging-indent: 1.6em, leading: 0.58em)
  #body
]

#let epigraph(body) = block(above: 0.4em, below: 1.6em, inset: (left: 12%, right: 12%))[
  #set par(justify: false, first-line-indent: 0em)
  #set text(style: "italic", size: 0.94em)
  #body
]

// a chapter that must open recto: the verso left blank carries neither running head nor folio.
// The break is emitted by the filter BEFORE the heading (#chapter-break()), never inside the
// heading's show rule: a blank page made inside the show rule becomes the heading's own location,
// and every running head, folio and contents entry that asks "where is this chapter?" gets the
// blank page. (Found on the philosophy batch: Scholar contents said "vi" for chapter I.)
// How it works now, deterministically: the filter emits #chapter-break() where a chapter's text
// ends; that is a marker <chend>. The heading's show rule does pagebreak(to: "odd") (an engine
// operation, no introspection) and leaves a marker <opener> on the opener page. The header and
// footer then know a page is blank when the last <chend> lies on an earlier page and the next
// <opener> is on the very next page; such a page gets neither running head nor folio.
#let edstate = state("edition", none)
#let chapter-break() = [#metadata("chend") <chend>]
#let opener-mark() = [#metadata("opener") <opener>]
#let page-is-blank(here-page) = {
  let end-pages = query(<chend>).map(m => m.location().page())
  let opens = query(<opener>).map(m => m.location().page()).filter(p => p > here-page)
  end-pages.any(p => p < here-page) and not end-pages.any(p => p == here-page) and opens.len() > 0 and calc.min(..opens) == here-page + 1
}
#let page-is-opener(here-page) = query(<opener>).any(m => m.location().page() == here-page)

// a plate: full page, the picture sized to the text block, caption in small italic
#let plate(path, caption) = {
  pagebreak(weak: true)
  set page(header: none, footer: none)
  place(center + horizon, dy: -0.25in)[
    #block(width: 100%)[
      #image(path, width: 100%, fit: "contain")
      #v(0.5em)
      #align(center)[#text(size: 0.82em, style: "italic")[#caption]]
    ]
  ]
  pagebreak()
}

// the chapter opener: label in letterspaced small caps, title below, a fleuron
#let opener-block(label, title, ed) = {
  v(if ed.trim.at(1) < 6.5in { 0.9in } else { 1.25in })
  set par(justify: false)
  align(center)[
    #if label != none [ #text(size: 0.92em, tracking: 0.16em)[#smallcaps(all: true)[#lower(label)]] #v(0.55em) ]
    #if title != [] and title != none [ #text(size: 1.42em)[#smallcaps(all: false)[#title]] ]
    #v(0.4em)
    #image("/assets/ornaments/orn_dec_fleur_center.png", width: 0.95in)
  ]
  v(0.9em)
}

#let book(meta, ed-name: "deluxe", body) = {
  let ed = editions.at(ed-name)
  let title = meta.at("title", default: "")
  let author = meta.at("author", default: "")
  let subtitle = meta.at("subtitle", default: "")
  let translator = meta.at("translator", default: "")
  let series = meta.at("series", default: "The Athanasius Library")
  let year = meta.at("year", default: "2026")
  let pub = meta.at("publication", default: ())      // lines for the publication page
  let signature = meta.at("signature", default: none)  // path to the signature png
  let colophon = meta.at("colophon", default: none)
  let has-parts = meta.at("has_parts", default: false)
  let chap-level = if has-parts { 2 } else { 1 }
  let opening-sc = meta.at("opening_smallcaps", default: true)

  edstate.update(ed)
  set document(title: title, author: author)
  set page(width: ed.trim.at(0), height: ed.trim.at(1),
           margin: (inside: ed.inside, outside: ed.outside, top: ed.top, bottom: ed.bottom))
  set text(font: "EB Garamond", size: ed.size, lang: "en", hyphenate: true, number-type: "old-style",
           costs: (hyphenation: 120%, runt: 160%, widow: 280%, orphan: 280%))
  set par(justify: true, leading: ed.leading, first-line-indent: 1.15em, spacing: ed.leading)
  // (no `show emph: set text(style: "italic")` here: emph toggles the style itself, and a set rule
  //  on top of it toggled it straight back to roman — every italic in the book was lost)
  show quote.where(block: true): it => block(above: 1.0em, below: 1.0em, inset: (left: 1.6em, right: 1.2em))[
    #set text(size: 0.94em)
    #set par(first-line-indent: 0em)
    #it.body
  ]
  set footnote.entry(separator: line(length: 1.2in, stroke: 0.4pt + ink), indent: 0.6em, gap: 0.55em)
  show footnote.entry: set text(size: 0.84em)
  show footnote.entry: set par(leading: 0.5em, first-line-indent: 0em, hanging-indent: 0em)
  set heading(numbering: none)

  // running heads: verso = title, recto = the chapter; folio outside. Openers: centred foot folio only.
  let hdr = context {
    let pg = counter(page).get().first()
    let here-page = here().page()
    if page-is-opener(here-page) or page-is-blank(here-page) { return }
    let hs = query(selector(heading.where(level: chap-level)).before(here()))
    let chap = if hs.len() > 0 { hs.last().body } else { [] }
    let f = folio(pg, mainstate.get())
    set text(size: 0.8em, tracking: 0.08em)
    if calc.even(pg) [
      #f#h(1.6em)#smallcaps(all: true)[#lower(title)]
    ] else [
      #h(1fr)#smallcaps(all: true)[#chap]#h(1.6em)#f
    ]
  }
  let ftr = context {
    let pg = counter(page).get().first()
    let here-page = here().page()
    if page-is-opener(here-page) [ #align(center)[#text(size: 0.8em)[#folio(pg, mainstate.get())]] ]
  }

  // headings
  show heading.where(level: chap-level): it => {
    if ed.recto { pagebreak(to: "odd", weak: true) } else { pagebreak(weak: true) }
    opener-mark()
    context { if pending-reset.get() { counter(page).update(1); [#metadata("main") <mainstart>] } }
    pending-reset.update(false)
    context { opener-block(chlabel.get(), it.body, ed) }
  }
  if has-parts {
    show heading.where(level: 1): it => {
      pagebreak(to: "odd", weak: true)
      opener-mark()
      v(2.2in)
      align(center)[#text(size: 1.15em, tracking: 0.18em)[#smallcaps(all: true)[#lower(it.body)]]]
      pagebreak()
    }
  }
  show heading.where(level: chap-level + 1): it => block(above: 1.5em, below: 0.8em, width: 100%)[
    #align(center)[#text(size: 1.0em, tracking: 0.06em)[#smallcaps(all: true)[#lower(it.body)]]]
  ]
  show heading.where(level: chap-level + 2): it => block(above: 1.2em, below: 0.6em)[#text(style: "italic")[#it.body]]

  // ---------------------------------------------------------------- front matter
  set page(numbering: none)
  counter(page).update(1)
  set par(justify: false)
  // half title
  page(header: none, footer: none)[
    #v(1.6in)
    #align(center)[#text(size: 1.25em, tracking: 0.12em)[#smallcaps(all: true)[#lower(title)]]]
  ]
  // series page (verso of half title)
  page(header: none, footer: none)[
    #v(1fr)
    #align(center)[
      #text(size: 0.78em, tracking: 0.2em)[#smallcaps(all: true)[#lower(series)]]
      #v(0.6em)
      #image("/assets/hawk/athanasius-hawk-mark-one-color.png", width: 0.42in)
    ]
    #v(1fr)
  ]
  // title page
  page(header: none, footer: none)[
    #v(1.05in)
    #align(center)[
      #text(size: 1.9em, tracking: 0.06em)[#smallcaps(all: true)[#lower(title)]]
      #if subtitle != "" [ #v(0.5em) #text(size: 1.05em, font: "Cormorant Garamond", style: "italic")[#subtitle] ]
      #v(0.75in)
      #text(size: 1.05em, tracking: 0.14em)[#smallcaps(all: true)[#lower(author)]]
      #if translator != "" [ #v(0.6em) #text(size: 0.9em, style: "italic")[translated by #translator] ]
      #v(1fr)
      #image("/assets/ornaments/orn_dec_fleur_center.png", width: 1.0in)
      #v(0.35in)
      #text(size: 0.95em, tracking: 0.24em)[#smallcaps(all: true)[athanasius]]
      #v(0.55in)
    ]
  ]
  // publication page: imprint, credits, and the signature in place of an ISBN
  page(header: none, footer: none)[
    #v(1fr)
    #set text(size: 0.8em)
    #set par(justify: false, first-line-indent: 0em, leading: 0.55em, spacing: 0.7em)
    #for line in pub [ #line \ ]
    #v(0.35in)
    #if signature != none [ #align(center)[#image(signature, width: 2.0in)] ]
    #v(0.25in)
    #align(center)[#text(size: 0.85em, tracking: 0.16em)[#smallcaps(all: true)[#lower(ed.word) edition]]]
    #v(0.45in)
  ]
  // contents
  set page(header: none, footer: context { align(center)[#text(size: 0.8em)[#numbering("i", counter(page).get().first())]] })
  page[
    #v(0.7in)
    #align(center)[#text(size: 1.05em, tracking: 0.18em)[#smallcaps(all: true)[contents]]]
    #v(0.5em) #image("/assets/ornaments/orn_swirl_double_rule.png", width: 1.1in) #v(0.6em)
    #set text(size: 0.92em)
    #show outline.entry: it => {
      set text(hyphenate: false)
      let loc = it.element.location()
      let ms = query(<mainstart>)
      let f = if ms.len() > 0 and loc.page() >= ms.first().location().page() {
        str(loc.page() - ms.first().location().page() + 1)
      } else { numbering("i", loc.page()) }
      if it.level == 1 and has-parts [
        #block(width: 100%, above: 1.1em, below: 0.3em)[#text(tracking: 0.1em)[#smallcaps(all: true)[#lower(it.element.body)]]]
      ] else [
        #block(width: 100%, above: 0.65em)[#link(loc)[#grid(columns: (1fr, auto), column-gutter: 0.5em, align: (left + bottom, right + bottom),
          [#it.element.body #box(width: 1fr, repeat[.#h(0.35em)])], [#f])]]
      ]
    }
    #outline(title: none, depth: chap-level)
  ]
  // any front-matter divisions the filter emitted are inside `body` and use the same style as chapters.
  // ---------------------------------------------------------------- the text
  set page(header: hdr, footer: ftr)
  set par(justify: true)
  body
  // ---------------------------------------------------------------- colophon (on a verso; a blank
  // recto before it carries neither running head nor folio)
  chapter-break()
  pagebreak(to: "even", weak: true)
  opener-mark()
  page(header: none, footer: none)[
    #v(1fr)
    #align(center)[
      #image("/assets/ornaments/orn_bot_leaf_rule.png", width: 1.5in)
      #v(0.5em)
      #set text(size: 0.82em, style: "italic")
      #set par(justify: false, first-line-indent: 0em)
      #if colophon != none [ #colophon ] else [
        This edition of #emph[#title] was set in EB Garamond, with Cinzel and Cormorant Garamond for display, and made ready for print by the Athanasius pipeline in #year.
      ]
    ]
    #v(0.6in)
  ]
}
