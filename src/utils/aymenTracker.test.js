// Champs attendus par le backend (colonnes de la table Quotes, src/services/quoteTracking.js).
const BACKEND_FIELDS = [
  'referrer_url', 'landing_page_url', 'utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid', 'page_uri',
  'visitor_id', 'first_seen_at', 'visits_count', 'session_id', 'session_pageviews',
  'last_referrer_url', 'last_landing_page_url', 'last_utm_source', 'last_utm_medium', 'last_utm_campaign',
  'device_type', 'screen', 'viewport', 'language', 'timezone',
  'pages_count', 'pages_visited', 'total_seconds_on_site', 'max_scroll_percent',
  'key_clicks', 'form_started_at', 'form_fill_seconds',
];

// Chaque test repart d'un module neuf (l'état du suivi est gardé au niveau du module).
function loadTracker() {
  let mod;
  jest.isolateModules(() => {
    mod = require('./aymenTracker');
  });
  return mod;
}

const trackerKeys = () => Object.keys(localStorage).filter((k) => k.startsWith('aym_'));

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/projet/helenite?utm_source=flyer&utm_medium=qr&utm_campaign=jpo');
});

test("sans consentement : rien n'est écrit et le payload reste minimal", () => {
  const t = loadTracker();
  t.trackPageView();
  const payload = t.getTrackerPayload();
  expect(trackerKeys()).toEqual([]);
  expect(payload.utm_source).toBe('flyer');
  expect(payload.page_uri).toContain('/projet/helenite');
  expect(payload.visitor_id).toBeUndefined();
});

test('avec consentement : les 30 champs du backend sont fournis', () => {
  localStorage.setItem('aymen_cookie_consent', 'accepted');
  const t = loadTracker();
  t.trackPageView();
  const payload = t.getTrackerPayload();
  expect(Object.keys(payload).sort()).toEqual([...BACKEND_FIELDS].sort());
  expect(payload.utm_campaign).toBe('jpo');
  expect(payload.visits_count).toBe(1);
  expect(payload.pages_count).toBe(1);
  expect(typeof payload.visitor_id).toBe('string');
});

test('un changement de page est compté, un double appel sur la même page non', () => {
  localStorage.setItem('aymen_cookie_consent', 'accepted');
  const t = loadTracker();
  t.trackPageView();
  t.trackPageView();
  expect(t.getTrackerPayload().pages_count).toBe(1);
  window.history.pushState({}, '', '/projets');
  t.trackPageView();
  const payload = t.getTrackerPayload();
  expect(payload.pages_count).toBe(2);
  expect(payload.session_pageviews).toBe(2);
  expect(payload.visits_count).toBe(1);
  // 1er contact figé sur la page d'arrivée, même après navigation
  expect(String(payload.landing_page_url)).toContain('/projet/helenite');
});

test('le refus efface tout ce qui a été mémorisé', () => {
  localStorage.setItem('aymen_cookie_consent', 'accepted');
  const t = loadTracker();
  t.trackPageView();
  expect(trackerKeys().length).toBeGreaterThan(0);
  localStorage.setItem('aymen_cookie_consent', 'declined');
  t.revokeTrackerConsent();
  expect(trackerKeys()).toEqual([]);
});
