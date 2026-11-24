Feature: Photo mode edge cases (SPEC §8, P38)

  Scenario: Pitch and zoom limits
    Given photo mode is open
    When the player looks straight up or zooms past the limits
    Then pitch and distance stay inside the legal range

  Scenario: Keys do not resume the run
    Given photo mode is open
    When the player presses Enter, P or Esc
    Then Enter saves, and P or Esc returns to the pause card
    And the run does not resume

  Scenario: Touch and gamepad
    Given photo mode is open on a tablet or with a pad
    Then drag (or the left stick) orbits, on-screen buttons (or A / Start) save and exit
