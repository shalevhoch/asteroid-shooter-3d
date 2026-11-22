import { describe, expect, it } from 'vitest';
import { assetUrl } from '../src/assetUrl.js';

describe('assetUrl', () => {
  it('resolves against the Pages base', () => {
    expect(assetUrl('/asteroid-shooter-3d/', 'models/asteroids/astro01.obj')).toBe(
      '/asteroid-shooter-3d/assets/models/asteroids/astro01.obj',
    );
  });

  it('tolerates a base without a trailing slash and a path with a leading one', () => {
    expect(assetUrl('/x', '/textures/a.png')).toBe('/x/assets/textures/a.png');
    expect(assetUrl('/', 'a.png')).toBe('/assets/a.png');
  });
});
