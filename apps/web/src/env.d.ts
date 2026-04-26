/// <reference types="astro/client" />
/// <reference types="@vite-pwa/astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
