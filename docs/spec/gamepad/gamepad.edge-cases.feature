Feature: Gamepad edge cases (SPEC §8, P19)

  Scenario: Stick drift
    Given a stick resting at 10 % deflection
    Then the ship does not turn

  Scenario: Held button
    While A stays held for many frames
    Then exactly one rocket launches

  Scenario: Pad unplugged mid-turn
    When the pad disconnects while RT and the left stick are held
    Then firing and turning stop and the gamepad section leaves the controls list

  Scenario: Non-standard pad
    Given a pad without the standard mapping or with fewer buttons
    Then missing buttons and axes read as rest
