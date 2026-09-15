/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_USER_ADMIN?: string;
  readonly VITE_USER_INSTRUCTOR?: string;
  readonly VITE_USER_LEARNER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
