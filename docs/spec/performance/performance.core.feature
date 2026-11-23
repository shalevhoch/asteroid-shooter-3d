Feature: Performance and loading (SPEC §14, P20)

  Scenario: Loading screen
    When the page opens on a slow link
    Then a title card with a filling progress bar shows until the world is built, then the title card replaces it

  Scenario: Touch devices start lighter
    Given a tablet
    Then the game renders at a pixel ratio of at most 1.5 with up to 2000 particles

  Scenario: Slow device steps down
    Given a device averaging 25 fps in play
    Then after the warm-up quality drops to medium, then to low, and stays there

  Scenario: Pinned quality
    When the page opens with ?quality=low
    Then the pixel ratio is 1 and the particle cap is 1000, and they never change

  Scenario: Graphics setting (P23)
    When the player sets Graphics to low in the settings panel
    Then the pixel ratio cap drops to 1 and the particle cap to 1000 at once, and the choice is kept after a reload
