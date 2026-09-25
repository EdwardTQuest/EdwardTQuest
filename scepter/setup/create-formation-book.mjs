// Create the "Formation book" metaobject definition the quizzes read (once per store).
//   SHOP=your-store.myshopify.com TOKEN=shpat_… node scepter/setup/create-formation-book.mjs [--dry-run]
// Afterwards: Content → Metaobjects → Formation book → Add entry.
import { admin, CHOICES } from './shopify-admin.mjs';

const choices = (list) => [{ name: 'choices', value: JSON.stringify(list) }];
const definition = {
  type: 'formation_book',
  name: 'Formation book',
  description: 'Books the Scepter formation quizzes may recommend, and to whom. Anything left blank is worked out from the book itself.',
  displayNameKey: 'label',
  access: { storefront: 'PUBLIC_READ' },
  fieldDefinitions: [
    { key: 'label', name: 'Label', type: 'single_line_text_field', description: 'Only for this list, e.g. the book title.' },
    { key: 'product', name: 'Book', type: 'product_reference', required: true },
    { key: 'themes', name: 'Themes', type: 'list.single_line_text_field', description: 'What the book is about.', validations: choices(CHOICES.themes) },
    { key: 'good_for', name: 'Good for', type: 'list.single_line_text_field', description: 'Without “Everyone”, only these readers get it. With “Everyone”, these readers get it more often.', validations: choices(CHOICES.good_for) },
    { key: 'depth', name: 'Depth', type: 'single_line_text_field', description: 'Gentle books come early in a plan, deep ones later.', validations: choices(CHOICES.depth) },
    { key: 'seasons', name: 'Seasons', type: 'list.single_line_text_field', description: 'Months the book belongs to. A book tied to Advent or Lent is kept for its season.', validations: choices(CHOICES.seasons) },
    { key: 'start_when', name: 'Start with this book when the reader…', type: 'list.single_line_text_field', description: 'Pulls the book into the first three months for these readers.', validations: choices(CHOICES.start_when) },
    { key: 'why', name: 'Why this book (shown to readers)', type: 'multi_line_text_field' },
    { key: 'boost', name: 'Editorial boost', type: 'number_integer', description: '−3 (rarely) to +3 (often). 0 is neutral.', validations: [{ name: 'min', value: '-3' }, { name: 'max', value: '3' }] },
    { key: 'exclude', name: 'Never recommend', type: 'boolean' }
  ]
};

if (process.argv.includes('--dry-run')) { console.log(JSON.stringify(definition, null, 2)); process.exit(0); }
const data = await admin(`mutation($definition: MetaobjectDefinitionCreateInput!) {
  metaobjectDefinitionCreate(definition: $definition) { metaobjectDefinition { id type name } userErrors { field message code } }
}`, { definition });
const r = data.metaobjectDefinitionCreate;
if (r.userErrors.length) { console.error(r.userErrors); process.exit(1); }
console.log('Created', r.metaobjectDefinition.type, r.metaobjectDefinition.id);
