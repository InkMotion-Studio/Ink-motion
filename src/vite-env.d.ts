/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASSET_CDN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
