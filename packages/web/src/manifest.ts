/** Shape of `public/assets/manifest.json`, written by `scripts/import-assets.mjs`. Paths are relative to `assets/`. */
export interface ModelEntry {
  readonly id: string;
  readonly format: 'obj' | 'glb';
  /** For a GLB: the 3DS / LWO it was baked from, under `packages/web/assets-src/` (P25). */
  readonly source?: string;
  readonly file: string;
  readonly core: boolean;
  readonly textures?: readonly string[];
}
export interface FileEntry {
  readonly file: string;
  readonly core: boolean;
}
export interface AssetManifest {
  readonly models: readonly ModelEntry[];
  readonly textures: readonly FileEntry[];
  readonly sounds: readonly FileEntry[];
  readonly mothershipBoxes: string;
}
