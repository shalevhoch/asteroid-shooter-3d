Feature: Waves, objectives and difficulty (SPEC §10)

  Scenario: Wave 1 keeps the original pace on Normal
    Then asteroids spawn at ticks 200, 400, 600, 800 and 1000 at speed 3

  Scenario: A cleared wave leads into the next
    When every asteroid of wave 1 is destroyed
    Then waveCleared fires and wave 2 starts BREATHER_TICKS later with 7 asteroids

  Scenario: Objective met
    Given wave 2's objective is "let nothing hit Earth"
    When every asteroid is destroyed before reaching Earth
    Then the score gains 70 and Earth is repaired by 10

  Scenario: Campaign won
    When wave 10 is cleared
    Then campaignWon fires and wave 11 (endless) follows

  Scenario: Kid / Easy
    Then asteroids are slower, spawns are calmer, Earth damage is halved, Earth regenerates 20 per clear,
    the rocket lock cone is 60° and turbo costs no fuel
