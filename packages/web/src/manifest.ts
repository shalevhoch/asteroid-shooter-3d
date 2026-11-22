/** Shape of `public/assets/manifest.json`, written by `scripts/import-assets.mjs`. Paths are relative to `assets/`. */
export interface ModelEntry {
  readonly id: string;
  readonly format: 'obj' | '3ds' | 'lwo';
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
