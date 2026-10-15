/* Where the quiz sends sign-ups. This file is yours to edit; the quiz code is not.
 * It is in TEST MODE: nothing leaves the page. To go live, change provider and fill its block
 * (see funnels/README.md, "Where the email goes"). Public keys only; never a secret. */
window.SCEPTER_QUIZ_SETTINGS = {
  capture: {
    provider: 'demo',                 // 'demo' | 'klaviyo' | 'webhook' | 'custom'  ('shopify' only on the store's own domain)
    // klaviyo: { companyId: 'XXXXXX', listId: 'YYYYYY' },
    // webhook: { url: 'https://hooks.example.com/...' },
    consent: { mode: 'checkbox' }     // 'checkbox' (unticked box) is the safe default; 'notice' for the US
  }
};
