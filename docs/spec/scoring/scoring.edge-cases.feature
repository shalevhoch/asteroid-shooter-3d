Feature: Scoring edge cases (SPEC §6)

  Scenario: Exactly at the window
    Given my last kill was 75 ticks ago
    When I kill again
    Then the chain extends; at 76 ticks it restarts

  Scenario: Earth impact breaks the chain
    Given a chain of 5
    When an asteroid hits Earth
    Then the next kill starts a new chain at ×1

  Scenario: Multiplier cap
    When the chain is 20 kills long
    Then the multiplier is ×4

  Scenario: Earth bonus at zero health
    Then the Earth bonus is 0

  Scenario: Not placing
    Given a full top-10 whose lowest score is 30
    When I score 30
    Then the run does not enter the table

  Scenario: Zero-point run
    When I score 0
    Then nothing is recorded

  Scenario: Corrupt storage
    Given the stored top-10 is not valid JSON
    Then the table starts empty
