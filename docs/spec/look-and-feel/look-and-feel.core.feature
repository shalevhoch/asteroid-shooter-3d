Feature: Look and feel (SPEC §12, P30)

  Scenario: Big kill
    Given a big asteroid in the crosshair
    When the player destroys it with photons
    Then the action holds for a beat, the screen flashes white and a rumble plays
    And the crosshair shows an orange ✕

  Scenario: Damaged ship
    Given the ship's hull is at 12 %
    Then grey smoke streams from its tail
