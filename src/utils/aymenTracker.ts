// Passerelle vers window.AymenTracker (public/js/aymen_tracker.js, chargé par index.html).
// Si le script est absent ou plante, on renvoie simplement un objet vide : le
// formulaire ne doit jamais échouer à cause du suivi.
type TrackerApi = {
  getPayload?: () => Record<string, unknown>;
  grantConsent?: () => void;
  revokeConsent?: () => void;
};

const tracker = (): TrackerApi | undefined =>
  (window as unknown as { AymenTracker?: TrackerApi }).AymenTracker;

export function getTrackerPayload(): Record<string, unknown> {
  try {
    return tracker()?.getPayload?.() ?? {};
  } catch {
    return {};
  }
}

export function grantTrackerConsent(): void {
  try {
    tracker()?.grantConsent?.();
  } catch {
    /* ignoré */
  }
}

export function revokeTrackerConsent(): void {
  try {
    tracker()?.revokeConsent?.();
  } catch {
    /* ignoré */
  }
}
