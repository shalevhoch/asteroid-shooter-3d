Feature: Daily challenge edge cases (SPEC §6, P33)

  Scenario: New day
    Given yesterday's daily best was 900
    Then today's best reads 0

  Scenario: Time zones
    Given local time is 01:30 on the 25th at UTC+2
    Then the daily date is the 24th

  Scenario: Play again
    Given a daily run ended
    When the player plays again
    Then the same daily seed runs again
