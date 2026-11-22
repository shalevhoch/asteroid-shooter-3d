Feature: Scoring v2 (SPEC §6)

  Scenario: Combo chain
    When I destroy three small asteroids within 3 seconds of each other with photons
    Then they score 10, 10 and 20

  Scenario: Wave clear bonus
    Given Earth is at half health
    When I clear wave 1
    Then I get a clear bonus of 20 and an Earth bonus of 15

  Scenario: Run summary
    When the run ends
    Then the card shows kills, combo bonus, objectives, wave clears and the Earth bonus adding up to the score

  Scenario: Top-10
    When my score places in the local top-10
    Then the card shows the table with my run highlighted and its rank
