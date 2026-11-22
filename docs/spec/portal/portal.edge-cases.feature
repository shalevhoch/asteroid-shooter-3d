Feature: Portal edge cases (SPEC §9, P14)

  Scenario: Favicon under the base path
    Given the Pages build with base /asteroid-shooter-3d/
    Then the favicon link points at /asteroid-shooter-3d/icon.svg

  Scenario: Leaving mid-run
    Given the pause card
    When the player follows the portal link
    Then the browser goes to the portal (the run is not saved)
