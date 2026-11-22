Feature: Threat awareness (SPEC §11)

  Scenario: Impact countdown
    Given an asteroid 300 units from Earth's surface at speed 3
    Then the HUD shows "IMPACT 0:04" for it

  Scenario: Urgency colours
    When the most urgent impact is under 30 seconds away
    Then the readout turns amber
    And under 10 seconds it turns red and blinks

  Scenario: Off-screen asteroid
    Given an asteroid to the right of the view
    Then an arrow on the right edge points at it

  Scenario: Radar
    Given an asteroid ahead of the ship
    Then its blip is above the radar centre
