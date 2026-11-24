Feature: Two-player split screen (SPEC §8, P40)

  Scenario: Two pads on the title card
    Given two gamepads are connected
    When the player starts a 2-player game
    Then two ships spawn in the hangar
    And the screen splits left for P1 and right for P2

  Scenario: Shared Earth
    Given a co-op run
    Then both ships fight the same asteroids and share the score
    And the run ends only when Earth falls or both ships are destroyed

  Scenario: Single-player unchanged
    Given one pad or the regular start button
    Then the run has one ship and one viewport
