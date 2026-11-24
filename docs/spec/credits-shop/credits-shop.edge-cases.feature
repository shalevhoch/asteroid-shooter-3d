Feature: Credits and station shop edge cases (SPEC §6, P29)

  Scenario: Too dear or capped
    Given an upgrade at level 3 or a price above the credits
    Then its button is greyed out and buying does nothing

  Scenario: Mid-wave
    Given a wave is active
    Then B does not open the shop and buyUpgrade changes nothing

  Scenario: Broken storage
    Given the stored wallet is not valid JSON
    Then the game starts with 0 credits and no upgrades
