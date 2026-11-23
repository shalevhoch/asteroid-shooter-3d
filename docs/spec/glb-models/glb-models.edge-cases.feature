Feature: GLB models edge cases (SPEC §14, P25)

  Scenario: Re-bake
    When scripts/bake-glb.mjs runs again
    Then it reads the sources from assets-src/ and rewrites the same GLBs and manifest entries

  Scenario: A texture never loads at bake time
    Then that material is baked without its map instead of failing the bake
