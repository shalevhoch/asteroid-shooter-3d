Feature: Boss waves edge cases (SPEC §10, P34)

  Scenario: Rockets don't one-shot
    Given a full-health boss
    When a rocket hits it
    Then it loses 15 hp and survives

  Scenario: RNG untouched
    Given waves 4 and 5 start from the same state
    Then the RNG state after the tick is identical

  Scenario: Fragments
    Given a boss is alive
    When 5 s pass
    Then a small asteroid splits off toward Earth
