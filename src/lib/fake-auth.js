// =============================================================================
// AUTH FACTICE — a remplacer par le vrai SSO Google Workspace en production.
// -----------------------------------------------------------------------------
// Mot de passe en dur, verification cote client uniquement, flag stocke en
// sessionStorage. AUCUNE valeur de securite reelle : sert uniquement a
// materialiser l'existence d'un portail avant que le vrai SSO soit branche.
// Le site etant public sur GitHub Pages pour cette beta (aucune donnee reelle
// dedans), ce n'est pas un probleme, mais ce mecanisme ne doit JAMAIS servir
// de veritable protection en production.
// =============================================================================

export const FAKE_PASSWORD = "ali2025beta";
const SESSION_KEY = "ali_archive_auth";

export function isLoggedIn() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SESSION_KEY) === "true";
}

export function login(password) {
  if (password === FAKE_PASSWORD) {
    window.sessionStorage.setItem(SESSION_KEY, "true");
    return true;
  }
  return false;
}

export function logout() {
  window.sessionStorage.removeItem(SESSION_KEY);
}
