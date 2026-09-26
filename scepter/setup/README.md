# One-time setup

## The "Formation book" library

The quiz reads curated book entries from a metaobject definition with the type `formation_book`.

### With the script (recommended)

1. In Shopify admin: Settings → Apps and sales channels → Develop apps → Create an app. Under
   *Admin API scopes*, allow `write_metaobject_definitions`, `write_metaobjects` and
   `read_products`. Install it and reveal the Admin API access token (`shpat_…`).
2. From the repository:

   ```sh
   SHOP=scepter-publishers.myshopify.com TOKEN=shpat_xxx node scepter/setup/create-formation-book.mjs
   SHOP=scepter-publishers.myshopify.com TOKEN=shpat_xxx node scepter/setup/import-formation-books.mjs scepter/setup/formation-books.csv
   ```

   Add `--dry-run` to either to see what would be sent. The importer checks every label against
   the definition's choices and reports typos instead of sending them. Rows whose product isn't in
   the store are skipped and listed. Running it again updates entries in place (one per handle).
3. Delete the custom app when done, or keep it for later imports.

### By hand

Settings → Custom data → Metaobject definitions → Add definition. Name it **Formation book**; its
type must be `formation_book`. Turn on **Storefronts access** (the quiz reads it in Liquid). Then
add these fields:

| key | type | choices (exact spelling) |
|---|---|---|
| `label` | Single line text | (used as the entry's display name) |
| `product` | Product, required | |
| `themes` | Single line text, list | Peace & trust · Prayer & interior life · Hope in suffering · Virtue & character · Work & ordinary life · Leadership · Marriage · Family & parenting · Doctrine & apologetics · Scripture · Saints & biography · Our Lady · Priesthood · Religious life · Friendship & apostolate · Fiction & story · Spiritual classic · For newcomers & seekers · Faith & culture |
| `good_for` | Single line text, list | Everyone · Young adults · Singles · Engaged & newlyweds · Married · Parents · Priests · Seminarians · Religious · Professionals · Leaders · Students · Retired · Newcomers & seekers · Other Christians · Men · Women |
| `depth` | Single line text | Gentle · Steady · Deep |
| `seasons` | Single line text, list | Advent · Christmas · Lent · Easter · Pentecost · Marian (May & October) · Sacred Heart (June) · November · Summer · New Year · September |
| `start_when` | Single line text, list | Struggling with God or the world · Faith feels distant · New to the faith · Newly married or engaged · Parents · Priests · Religious · Leaders · Work feels meaningless · Wants to learn · Wants to discover · Wants to grow · Home life is hard · Grieving or widowed · Young adults |
| `why` | Multi-line text | |
| `boost` | Integer, −3 to 3 | |
| `exclude` | True or false | |

The labels are matched without regard to case. A label the engine doesn't know is ignored, so keep
the spellings. `create-formation-book.mjs --dry-run` prints the exact definition.

## Omnisend automations (the store's email platform)

In each of the three sections, set the event name (the defaults are *Completed Formation Quiz*,
*Requested Free E-book* and *Completed Temperament Test*) and tick *Send it to Omnisend*. The
Omnisend app embed must be on in the theme (Customize → App embeds).

1. Take the quiz yourself once, so the event exists in Omnisend. A custom event becomes a trigger
   after it has fired once.
2. Automations → Create workflow → Custom event → pick the event.
3. Add an email and paste the matching file from `omnisend/`: `formation-plan-email.html`,
   `free-ebook-email.html` or `temperament-email.html`. They print the event's fields with
   Omnisend's `[[event.field]]` syntax.
4. Send a test to yourself and check all twelve months print.

What the page sends: `omnisend.identifyContact({ email })`, then a `track` event whose properties
are plain text. The quiz sends:
- `plan_1_month`, `plan_1_title`, `plan_1_author`, `plan_1_url`, `plan_1_image`, `plan_1_why` and
  `plan_1_hidden_gem`, through `plan_12_…`;
- `formation_plan_url`, `formation_archetype`, `archetype_text` and `practice`;
- `first_name` and the quiz answers that are not sensitive.

Subscribing is separate. Omnisend's browser API cannot subscribe anyone. Only a reader who ticks
the marketing box is added through Shopify's newsletter form, and Omnisend syncs that contact as
subscribed, with the tags. So send the plan, e-book and result emails to everyone who asked, and
keep marketing emails to subscribers.

## Klaviyo flows (if you use Klaviyo instead)

In Klaviyo, the quiz and pop-ups create three metrics the first time someone completes them:
*Completed Formation Quiz*, *Requested Free E-book*, *Completed Temperament Test*. For each one:

1. Flows → Create flow → Build your own → trigger: *Metric* → the metric above.
2. Add an email and switch its editor to HTML. Paste the matching file from `klaviyo/`:
   `formation-plan-email.html`, `free-ebook-email.html` or `temperament-email.html`.
3. Keep "Skip recently emailed profiles" off for the plan and e-book emails. Readers asked for
   them.

Marketing consent: the box starts unticked, and the reader is added to your list (and to Shopify's
newsletter) only if they tick it. The event, and so the flow, happens either way, because the reader
asked for the plan, the e-book or the result. Klaviyo sends flow emails only to profiles that can receive email,
unless the message is marked transactional, which the plan and e-book emails reasonably are (ask
Klaviyo to enable transactional flows).

The Klaviyo **public** key (the six-character site ID) is safe in the theme. Never paste a private
key (`pk_…`) anywhere in the theme.

## Webhook payload

Form-encoded POST fields: `email`, `first_name`, `source`, `tags` (comma-separated),
`accepts_marketing`, every property as its own field, and `payload`, the whole thing as JSON,
including `event_properties.plan`, the twelve months.
