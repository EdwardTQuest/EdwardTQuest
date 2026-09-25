# Plan — The Golden Sayings of Epictetus

*Written by the overseer after skimming the work. Fill every section; the pipeline reads the two
fenced blocks (`art` and `blurb`) with `ath plan hc-02b-epictetus --sync`.*

## The work in five sentences

(what it is, who wrote it, why it lasts, what a reader gets, why Athanasius publishes it)

## Structure decisions

- Divisions: (parts? chapters? numbered points? verse?) — the source's own structure is the default
- Front matter to keep as divisions: (Introductory Note? Preface?) — and what is furniture to drop
- Back matter: (Notes? Glossary? none)
- Apparatus: (footnotes present? how numbered? per chapter?)
- External sequence proof: (e.g. "189 numbered sayings", "12 books", "59 essays") →
  put the number in book.yaml `checks.expected_sections`

## Art brief

Mood and setting in a line: (e.g. "a Roman garden at dusk; stillness; stone and cypress")

```yaml
art:
  movement: landscape        # landscape | romantic | impressionist | marine | genre  (house preference order)
  subjects:                  # phrases matched against painting titles and keywords, best first
    - garden
    - cypress
    - roman ruins
  avoid:                     # extra stop words for this title
    - battle
  cover_note: ""             # anything the picker should know ("no figures", "prefer a river")
```

## Blurb (back cover, 110–150 words)

```blurb
(the back-cover paragraph: plain, confident, no adjectives about the edition, no spoilers;
end with one sentence on why this book belongs on a shelf now)
```

## Edition notes

- Deluxe / Everyman / Scholar: anything edition-specific (an epigraph only in Deluxe? none)
- Signature font: (default La Belle Aurore)

## Rights

- Work first published: 1909. Edition/setting used: The Harvard Classics, volume II (P. F. Collier & Son, 1909). Public-domain basis: published before 1 January 1931; public domain in the United States
- Any modern apparatus in the source to exclude (introductions, translations, notes after 1930): 

## Risks and open questions

- 

---

## Skim (generated)

**Words:** 10,740. **Headings found:** 82.

Headings (first 40): Introductory Note · The Golden Sayings of Epictetus · I · II · III · IV · V · VI · VII · VIII · IX · X · XI · XII · XIII · XIV · XV · XVI · XVII · XVIII · XIX · XX · XXI · XXII · XXIII · XXIV · XXV · XXVI · XXVII · XXVIII · XXIX · XXX · XXXI · XXXII · XXXIII · XXXIV · XXXV · XXXVI · XXXVII · XXXVIII…

**Opening:**

> --- title: The Golden Sayings of Epictetus subtitle: With the Hymn of Cleanthes author: Epictetus translator: Hastings Crossley series: The Athanasius Library language: en date: '1909' --- ::: {.front} ## Introductory Note Epictetus was a Greek, born at Hierapolis in Phrygia, probably about the middle of the first century A.D. His early history is unknown till we find him in Rome, the slave of Epaphroditus, a freedman of Nero’s. The lameness, which is the only physical characteristic of his recorded, was, according to one tradition, due to tortures inflicted by his master. He seems to have become acquainted with the principles of the Stoic philosophy through the lectures of C. Musonius Rufus; and after his emancipation he became a teacher of that system in Rome. When the Emperor Domitian banished all philosophers from Italy about 90 A.D., Epictetus went to Nicopolis in Epirus, where he continued his teaching. He left nothing in writing, and for a knowledge of his utterances we are indebted to his disciple, the Greek philosopher and historian Arrian, who compiled from his master’s lectures and conversations the “Discourses and Encheiridion,” from which the “Golden Sayings” are drawn. The date and circumstances of his death are unknown. Epictetus is a main authority on Stoic morals. The points on which he laid chief stress were the importance of cultivating complete independence of external circumstances, the realization that man must find happiness within himself, and the duty of reverencing the voice of Reason in the soul. Few teachers of morals in any age are so bracing and invigorating; and the tonic quality of his utterances has been recognized ever since his own day by Pagan and Christian alike. ::: ## The Golden Sayings of Epictetus ### I Are these the only works of Providence in us? What words suffice to praise or set them forth? Had we but understanding, should we ever cease hymning and blessing the Divine Power, both openly and in secret, and telling of His gracious gifts? Whether digging or ploughing or eating, should we not sing the hymn to God:—Great is God, for that He

**Closing:**

> one that is within your powers. ### LXXX Fellow, you have come to blows at home with a slave: you have turned the household upside down, and thrown the neighbourhood into confusion; and do you come to me then with airs of assumed modesty—do you sit down like a sage and criticise my explanation of the readings, and whatever idle babble you say has come into my head? Have you come full of envy, and dejected because nothing is sent you from home; and while the discussion is going on, do you sit brooding on nothing but how your father or your brother are disposed towards you:—“What are they saying about me there? at this moment they imagine I am making progress and saying, He will return perfectly omniscient! I wish I could become omniscient before I return; but that would be very troublesome. No one sends me anything—the baths at Nicopolis are dirty; things are wretched at home and wretched here.” And then they say, “Nobody is any the better for the School.”—Who comes to the School with a sincere wish to learn: to submit his principles to correction and himself to treatment? Who, to gain a sense of his wants? Why then be surprised if you carry home from the School exactly what you bring into it? |
