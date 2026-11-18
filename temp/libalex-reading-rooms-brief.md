# Libalex: the reading rooms become real rooms (brief for the Lenovo)

Status: **not started.** Edward's idea, written down on 2026-11-18 from a chat. Nothing here has been
built or tested. Claude did not make any of it; this file is the whole handoff.
Pick it up on the Lenovo: build the rooms in Blender, move the assets to Cloudflare (R2 for the
heavy files, per the storage handoff of 2026-09-03: R2 for assets, git for code), and put it on
libalex. Where libalex's current code lives was not visible from this session, so find it first.

## The change

Today the "reading rooms" in libalex are portals. They become **rooms you walk into**, each one
modelled and lit in Blender. The rooms connect to each other through **physical doors, stairs and
ladders**, not portals. You move through the whole house on foot.

## The rooms (Edward's list, eight)

1. **English bar room.** A pub.
2. **Japanese tea house.**
3. **Manhattan coffeeshop.**
4. **Dilapidated Mayan temple in the jungle.** You read scrolls in a cave behind a waterfall.
5. **Colorado mountain lodge.** Overlooks an incredible mountain vista while snow falls.
6. **Cozy mountain house in Vancouver.** Overlooks the bay, shrouded in mist.
7. **Medieval castle tower room.** Overlooks a primeval forest; wood thrush birdsong in the background.
8. **Crusader reading room** (the hub of the wall widgets, below).

### Crusader room, in detail
- Real, high-resolution paintings of the Crusades on every wall. Public-domain images only; Wikimedia
  Commons via `commons.wikimedia.org/wiki/Special:FilePath/<file>?width=N`, never `upload.wikimedia.org`
  (house rule from `CLAUDE.md`). Record each painting's title, artist, date and source in a credits file
  (not on screen; see "No words").
- Wood paneling, a fire in the hearth, suits of armour all around, weaponry on the walls.
- **Right wall: a live stocks chat.** Edward said "just link to a good one", so embed or link an
  existing one; do not build one. Check the candidate allows framing before choosing it.
- **Left wall: a live RSS feed showing top influencers worldwide.** Edward's wording was "live rss chat";
  read as a live feed of influencers' posts. If that is wrong, ask him.
- Optional, on the same paneled wall if good ones exist: a **war tracker**, a **pope tracker**, a
  **Santa tracker**. Link existing ones. Santa is seasonal (December); make it look right out of season
  or hide it, and do not put a label on it either way.

## How the rooms connect (real doors)

Edward gave two links and said "etc.":
- **Pub door → castle.** Through the pub door, up a windy stair a bit, and you are in the tower room.
- **Tower room → attic.** Climb the ladder to the attic; the door there leads to the **Vancouver cabin**.

Everything else is open. Proposal, to be confirmed with Edward: the Vancouver cabin's porch leads to
the Colorado lodge; the lodge's cellar door to the tea house; the tea house's garden gate to the
coffeeshop (a street door); the coffeeshop's back stairwell to the Crusader room; the Crusader room's
fireplace-side oak door to the temple cave (behind the waterfall); and the cave's far passage back to
the pub, so the house is a loop and nobody dead-ends. Every room needs at least one way back.

## No words, no people

- **No explanatory text anywhere in the library.** No labels, signs, tooltips, instructions, onboarding,
  room names on screen. The vibe does the work: lighting, sound, the doors themselves. (The live feeds
  on the Crusader walls show their own content; that is the one exception.)
- **No people.** Every room is empty, like a hotel room waiting for its resident. Lamps lit, tea
  steaming, fire burning, a book open: someone was just here and will be back.

## Making it

- Model, light and bake in Blender; export glTF/GLB; render in the browser with three.js or Babylon.js.
  Pre-baked lighting and compressed textures (KTX2/Draco) so it loads on a laptop and a phone.
- Assets (GLB, textures, audio) go to **R2**. Code goes to git.
- Ambient sound per room: snowfall and wind, a pub's room tone with a crackling fire and no voices, tea-house rain,
  waterfall, city street outside the coffeeshop, and **wood thrush** in the tower. Check each recording's
  licence before using it; keep a credits file.
- Doors, stairs and ladders are the navigation: walking or clicking through, with a short transition
  that shows the way through (a stair climbed, a door opened), not a fade to another page.
- Start with two rooms and the door between them (pub and tower room, plus the ladder to the cabin is
  the next step). Prove the feel before modelling all eight.

## Open question from Edward: can it be multiplayer?

He asked whether several people could be on the site at once and interact. **Yes, it is possible.** It is
a real piece of work, not a toggle:

- The Cloudflare stack he already uses fits: a **Durable Object per room** holding the live state, with
  **WebSockets**, so people in the same room see each other move and can chat. Costs scale with
  concurrent connections.
- It collides with "no people, empty rooms." Options for Edward to choose between:
  1. **Keep it empty and quiet:** presence shows only as traces (a page turning, a lamp that is lit, a
     warm cup), no avatars.
  2. **Soft presence:** faint, wordless figures or lights, no names, no text chat.
  3. **Full multiplayer:** avatars and text or voice chat. Needs moderation and a safety plan, and it
     changes the no-words rule.
- Recommendation to raise with him: build the single-player rooms first, then add option 1 or 2 as a
  layer on top. Do not start with option 3.

## Decisions waiting for Edward

- Which repo and Worker libalex lives in, if not obvious from the Lenovo's side.
- The door map beyond the two links he gave.
- Multiplayer: which option, if any, and when.
- The choice of the stocks chat, the influencer feed and the trackers (links to verify first).
