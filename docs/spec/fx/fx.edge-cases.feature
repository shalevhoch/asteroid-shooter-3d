Feature: Effects edge cases (SPEC §12)

  Scenario: Sprite straight above the camera
    Then its quad is still well-formed (no NaN)

  Scenario: Sprite behind the camera
    Then it is culled, not drawn mirrored

  Scenario: Particle cap
    When more than 4000 particles are alive
    Then the oldest are dropped first

  Scenario: Shot hits an asteroid
    Then the shot itself makes no explosion; the asteroid's hit or kill does

  Scenario: Game over
    When the run ends
    Then the effects keep playing behind the game-over card

  Scenario: Pause
    When the game is paused
    Then the effects freeze
