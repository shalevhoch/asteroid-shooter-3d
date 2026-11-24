Feature: Wave missions edge cases (SPEC §10, P31)

  Scenario: Failed mission
    Given a 'no Earth hits' wave with one Earth hit
    When it clears
    Then no missionComplete is emitted

  Scenario: Fast clear before the last spawn
    Given a fastClear mission
    While asteroids are still spawning
    Then the HUD shows 'Fast clear (15 s)'
    And after the last spawn it counts down

  Scenario: Same seed
    Given two runs with the same seed
    Then every wave draws the same mission
