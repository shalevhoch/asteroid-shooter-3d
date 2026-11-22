Feature: Space station edge cases (SPEC §3, P18)

  Scenario: Full ship
    Given a full ship
    When it flies through the dock
    Then no reload event fires

  Scenario: Just outside
    Given a ship one unit outside the dock radius
    Then nothing refills

  Scenario: Flying through the models
    When the ship flies into the station's models
    Then it passes through (no collision)
