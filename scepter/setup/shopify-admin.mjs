// Tiny Shopify Admin GraphQL client for the setup scripts.
// Needs SHOP (your-store.myshopify.com) and TOKEN (an Admin API access token from a custom app:
// Settings → Apps and sales channels → Develop apps → Create an app → Admin API scopes:
// write_metaobject_definitions, write_metaobjects, read_products → Install → reveal token).
import { createRequire } from 'node:module';

export const API_VERSION = '2025-01';
export const E = createRequire(import.meta.url)('../theme/assets/scepter-engine.js');

export function env() {
  const shop = (process.env.SHOP || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const token = process.env.TOKEN || '';
  if (!shop || !token) {
    console.error('Set SHOP=your-store.myshopify.com and TOKEN=shpat_… (see scepter/setup/README.md).');
    process.exit(2);
  }
  return { shop, token };
}

export async function admin(query, variables = {}) {
  const { shop, token } = env();
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`Shopify ${res.status}: ${JSON.stringify(json.errors || json)}`);
  return json.data;
}

// The admin-facing choices, taken from the engine so the two can never drift apart.
export const CHOICES = {
  themes: Object.values(E.THEMES).map((t) => t.label),
  good_for: Object.values(E.AUDIENCES),
  depth: ['Gentle', 'Steady', 'Deep'],
  seasons: Object.values(E.SEASON_LABELS),
  start_when: Object.values(E.START_WHEN)
};
