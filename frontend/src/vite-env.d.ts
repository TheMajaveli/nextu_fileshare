/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KEYCLOAK_REGISTRATION_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
