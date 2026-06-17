/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_IMAGE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
