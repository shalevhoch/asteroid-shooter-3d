Feature: Look and feel edge cases (SPEC §12, P30)

  Scenario: Low quality
    Given graphics quality is low
    Then there is no bloom and the game renders directly

  Scenario: Shake off
    Given screen shake is off
    When a big asteroid is destroyed
    Then there is no white flash, but the hit-stop still plays

  Scenario: Bomb kills
    Given a smart bomb destroys asteroids
    Then no hit marker shows
