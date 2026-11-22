Feature: Wave edge cases

  Scenario: Endless caps
    Then wave 500 spawns every 50 ticks at speed 6 with big chance 0.6

  Scenario: Failing an objective
    When an asteroid hits Earth during a "no Earth hit" wave
    Then the clear reports objectiveMet = false and no bonus is scored

  Scenario: Repair at full health
    Given Earth at full health
    When an objective is met
    Then the repair is 0 and Earth stays at its maximum
