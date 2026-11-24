Feature: Two-player split screen edge cases (SPEC §8, P40)

  Scenario: A pad disconnects
    Given a co-op run in play
    When a pad is unplugged
    Then the game pauses until two pads are connected again

  Scenario: One ship down
    Given P1's hull is 0 and P2 is alive
    Then P2 can still fly and fire
    And the run does not end

  Scenario: Determinism
    Given the same seed and two input logs
    Then two playbacks end in the same state
