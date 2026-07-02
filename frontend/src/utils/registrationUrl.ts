const selfRegistrationEnabled = Boolean(import.meta.env.VITE_KEYCLOAK_REGISTRATION_URL);

/**
 * Registration must be initiated through the BFF's own OAuth2 client (registrationId
 * "keycloak-register", see application.yml) rather than a hand-built Keycloak URL.
 * Only Spring Security's authorization-request flow stores the state/nonce needed to
 * validate the OAuth2 callback once the user finishes registering.
 */
export function buildRegistrationUrl(): string | null {
  if (!selfRegistrationEnabled) return null;
  return '/oauth2/authorization/keycloak-register';
}
