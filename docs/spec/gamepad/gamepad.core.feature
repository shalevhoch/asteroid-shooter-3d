Feature: Gamepad (SPEC §8, P19)

  Scenario: Start with a pad
    Given a standard gamepad is connected on the title card
    When the player presses Start
    Then the run starts and the controls list shows the gamepad section

  Scenario: Aim and fly
    While the left stick is pushed up and RT is held
    Then the ship pitches nose up and fires photons

  Scenario: Rocket and throttle
    When the player presses A, then Y twice
    Then one rocket launches and the throttle rises two levels

  Scenario: Pause and resume
    When the player presses Start during play
    Then the game pauses; pressing Start again resumes it
