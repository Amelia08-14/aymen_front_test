// Suivi visiteur maison pour le formulaire de devis (env TEST). Inspiré du tracker proposé
// par l'équipe CRM, réécrit pour l'app React : il suit aussi les changements de page
// (React Router), ce qu'un script chargé une seule fois ne voit pas.
//
// Tout est mémorisé dans le navigateur du visiteur, APRÈS consentement : le bandeau
// cookies écrit localStorage 'aymen_cookie_consent' = 'accepted'. Sans consentement, rien
// n'est écrit et getTrackerPayload() ne renvoie que l'URL courante, le referrer et les UTM.
// Non collecté : empreinte numérique, historique du navigateur, géolocalisation, contenu
// des champs saisis. L'IP et le User-Agent restent lus côté serveur.
//
// Les clés de getTrackerPayload() sont celles des colonnes de la table Quotes du backend
// (src/services/quoteTracking.js) : toute modification doit être faite des deux côtés.

const CONSENT_KEY = 'aymen_cookie_consent';
const KEY = {
  visitor: 'aym_visitor',
  firstTouch: 'aym_first_touch',
  state: 'aym_state',
  pages: 'aym_pages',
  clicks: 'aym_clicks',
};

const DAY = 86400000;
const VISITOR_TTL = 365 * DAY;
const FIRST_TOUCH_TTL = 30 * DAY;
const SESSION_TIMEOUT = 30 * 60000;
const MAX_PAGES = 50;
const MAX_CLICKS = 30;

type Campaign = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  gclid: string | null;
  fbclid: string | null;
};
type Touch = Campaign & { referrer_url: string | null; landing_page_url: string | null };
type FirstTouch = Touch & { captured_at: string };
type Visitor = { id: string; created_at: number };
type SessionState = {
  visits: number;
  first_visit_at: string;
  session_id: string;
  last_active: number;
  last_touch: Touch;
  session_pageviews: number;
};
type PageEntry = { url: string; title: string; at: string; session: string; seconds: number; scroll: number };
type ClickEntry = { type: string; page: string; at: string };

// ---------- utilitaires ----------
const now = () => Date.now();
const iso = (t: number = now()) => new Date(t).toISOString();
const cut = (s: string | null | undefined, n: number): string | null => (s ? String(s).slice(0, n) : null);

function read<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') as T | null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage plein ou bloqué : le suivi ne doit jamais casser la page */
  }
}

function uuid(): string {
  if (window.crypto && 'randomUUID' in window.crypto) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accepted';
  } catch {
    return false;
  }
}

function campaignFromUrl(): Campaign {
  const p = new URLSearchParams(window.location.search);
  const get = (k: string) => cut(p.get(k), 255);
  return {
    utm_source: get('utm_source'),
    utm_medium: get('utm_medium'),
    utm_campaign: get('utm_campaign'),
    gclid: get('gclid'),
    fbclid: get('fbclid'),
  };
}

function currentTouch(): Touch {
  return {
    referrer_url: cut(document.referrer, 500),
    landing_page_url: cut(window.location.href, 500),
    ...campaignFromUrl(),
  };
}

// ---------- identité, 1er contact, session ----------
function ensureVisitor(): Visitor {
  const saved = read<Visitor>(KEY.visitor);
  if (saved && now() - saved.created_at < VISITOR_TTL) return saved;
  const fresh = { id: uuid(), created_at: now() };
  write(KEY.visitor, fresh);
  return fresh;
}

function ensureFirstTouch(): FirstTouch {
  const saved = read<FirstTouch>(KEY.firstTouch);
  if (saved && now() - new Date(saved.captured_at).getTime() < FIRST_TOUCH_TTL) return saved;
  const fresh = { ...currentTouch(), captured_at: iso() };
  write(KEY.firstTouch, fresh);
  return fresh;
}

function updateSession(): SessionState {
  let st = read<SessionState>(KEY.state);
  const expired = !st || now() - st.last_active > SESSION_TIMEOUT;
  if (!st || expired) {
    st = {
      visits: (st?.visits || 0) + 1,
      first_visit_at: st?.first_visit_at || iso(),
      session_id: uuid(),
      last_active: now(),
      last_touch: currentTouch(),
      session_pageviews: 0,
    };
  }
  st.last_active = now();
  st.session_pageviews += 1;
  write(KEY.state, st);
  return st;
}

function touchActive(): void {
  const st = read<SessionState>(KEY.state);
  if (st) {
    st.last_active = now();
    write(KEY.state, st);
  }
}

// ---------- engagement de la page courante ----------
let listenersAttached = false;
let currentUrl: string | null = null;
let pageIdx = -1;
let baseSeconds = 0;
let accSeconds = 0;
let visibleSince: number | null = null;
let maxScroll = 0;
let formStartedAt: number | null = null;

function resetPageState(): void {
  currentUrl = null;
  pageIdx = -1;
  baseSeconds = 0;
  accSeconds = 0;
  visibleSince = null;
  maxScroll = 0;
  formStartedAt = null;
}

function onScroll(): void {
  const el = document.documentElement;
  const total = el.scrollHeight - el.clientHeight;
  if (total <= 0) {
    maxScroll = 100;
    return;
  }
  const pct = Math.round(((window.pageYOffset || el.scrollTop) / total) * 100);
  if (pct > maxScroll) maxScroll = Math.min(pct, 100);
}

function flushEngagement(): void {
  if (pageIdx < 0 || !hasConsent()) return;
  if (visibleSince !== null) {
    accSeconds += (now() - visibleSince) / 1000;
    visibleSince = now();
  }
  const pages = read<PageEntry[]>(KEY.pages);
  const entry = pages?.[pageIdx];
  if (!pages || !entry || entry.url !== cut(currentUrl, 500)) return;
  entry.seconds = Math.round(baseSeconds + accSeconds);
  entry.scroll = Math.max(entry.scroll || 0, maxScroll);
  entry.title = cut(document.title, 150) || '';
  write(KEY.pages, pages);
}

// ---------- clics clés et formulaire ----------
function onClick(ev: MouseEvent): void {
  if (!hasConsent()) return;
  const target = ev.target as Element | null;
  const el = target?.closest?.('a,button,[data-track]');
  if (!el) return;
  const href = el.getAttribute('href') || '';
  let type: string | null = null;
  if (/^tel:/i.test(href)) type = 'phone';
  else if (/^mailto:/i.test(href)) type = 'email';
  else if (/wa\.me|whatsapp\.com/i.test(href)) type = 'whatsapp';
  else type = el.getAttribute('data-track');
  if (!type) return;
  const clicks = read<ClickEntry[]>(KEY.clicks) || [];
  clicks.push({ type: type.slice(0, 40), page: window.location.pathname.slice(0, 200), at: iso() });
  write(KEY.clicks, clicks.slice(-MAX_CLICKS));
  touchActive();
}

function onFocusIn(ev: FocusEvent): void {
  const t = ev.target as HTMLElement | null;
  if (!hasConsent() || formStartedAt !== null || !t) return;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) && (t as HTMLInputElement).form) formStartedAt = now();
}

function onVisibility(): void {
  if (!hasConsent()) return;
  if (document.hidden) {
    flushEngagement();
    visibleSince = null;
  } else {
    visibleSince = now();
    touchActive();
  }
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('click', onClick, true);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', flushEngagement);
  window.setInterval(flushEngagement, 15000);
}

// ---------- pages vues ----------
function recordPageview(): void {
  const url = cut(window.location.href, 500) as string;
  if (pageIdx >= 0 && currentUrl === url) return; // déjà enregistrée (ex. consentement + changement de route)

  flushEngagement(); // clôt la page précédente avant de changer de page

  const st = updateSession();
  const pages = read<PageEntry[]>(KEY.pages) || [];
  const last = pages[pages.length - 1];
  if (last && last.url === url && last.session === st.session_id) {
    pageIdx = pages.length - 1; // simple rechargement : on reprend le compteur de temps
    baseSeconds = last.seconds || 0;
  } else {
    pages.push({ url, title: cut(document.title, 150) || '', at: iso(), session: st.session_id, seconds: 0, scroll: 0 });
    const kept = pages.slice(-MAX_PAGES);
    write(KEY.pages, kept);
    pageIdx = kept.length - 1;
    baseSeconds = 0;
  }
  currentUrl = url;
  accSeconds = 0;
  maxScroll = 0;
  formStartedAt = null;
  visibleSince = document.hidden ? null : now();
  onScroll();
}

// ---------- API publique ----------

/** À appeler à chaque changement de page (React Router). Sans consentement : ne fait rien. */
export function trackPageView(): void {
  if (!hasConsent()) return;
  try {
    ensureVisitor();
    ensureFirstTouch();
    attachListeners();
    recordPageview();
  } catch {
    /* silencieux */
  }
}

/** Appelé par le bandeau cookies après « Accepter tout » (le consentement est déjà écrit). */
export function grantTrackerConsent(): void {
  trackPageView();
}

/** Appelé par le bandeau cookies après « Refuser » : efface tout ce qui a été mémorisé. */
export function revokeTrackerConsent(): void {
  try {
    Object.values(KEY).forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignoré */
  }
  resetPageState();
}

function deviceInfo() {
  const w = window.innerWidth || 0;
  let timezone: string | null = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    /* ignoré */
  }
  return {
    device_type: w < 768 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop',
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    viewport: `${w}x${window.innerHeight || 0}`,
    language: cut(navigator.language, 20),
    timezone,
  };
}

/** Champs de suivi à joindre au formulaire de devis. Ne lève jamais d'erreur. */
export function getTrackerPayload(): Record<string, unknown> {
  try {
    if (!hasConsent()) {
      return {
        referrer_url: cut(document.referrer, 500),
        landing_page_url: cut(window.location.href, 500),
        page_uri: window.location.href,
        ...campaignFromUrl(),
      };
    }
    trackPageView(); // garantit un état à jour même si le formulaire s'ouvre en premier
    flushEngagement();

    const visitor = ensureVisitor();
    const ft = ensureFirstTouch();
    const st = read<SessionState>(KEY.state);
    const lt = st?.last_touch;
    const pages = read<PageEntry[]>(KEY.pages) || [];
    const clicks = read<ClickEntry[]>(KEY.clicks) || [];

    return {
      // 1er contact
      referrer_url: ft.referrer_url,
      landing_page_url: ft.landing_page_url,
      utm_source: ft.utm_source,
      utm_medium: ft.utm_medium,
      utm_campaign: ft.utm_campaign,
      gclid: ft.gclid,
      fbclid: ft.fbclid,
      page_uri: window.location.href,
      // identité, visites, sessions
      visitor_id: visitor.id,
      first_seen_at: st?.first_visit_at || ft.captured_at,
      visits_count: st?.visits || 1,
      session_id: st?.session_id || null,
      session_pageviews: st?.session_pageviews || 0,
      // dernier contact (session en cours)
      last_referrer_url: lt?.referrer_url || null,
      last_landing_page_url: lt?.landing_page_url || null,
      last_utm_source: lt?.utm_source || null,
      last_utm_medium: lt?.utm_medium || null,
      last_utm_campaign: lt?.utm_campaign || null,
      // appareil
      ...deviceInfo(),
      // navigation
      pages_count: pages.length,
      pages_visited: pages.slice(-20).map((p) => p.url),
      total_seconds_on_site: pages.reduce((s, p) => s + (p.seconds || 0), 0),
      max_scroll_percent: pages.reduce((m, p) => Math.max(m, p.scroll || 0), 0),
      // clics clés
      key_clicks: clicks.slice(-10),
      // formulaire
      form_started_at: formStartedAt !== null ? iso(formStartedAt) : null,
      form_fill_seconds: formStartedAt !== null ? Math.round((now() - formStartedAt) / 1000) : null,
    };
  } catch {
    return {};
  }
}
