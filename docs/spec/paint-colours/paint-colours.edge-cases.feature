Feature: Paint colours edge cases (SPEC §3, P39)

  Scenario: Broken storage
    Given a corrupt or unknown paint record
    Then every ship is Stock and no credit colour is bought

  Scenario: Cannot afford or double-buy
    Given the player has 50 credits
    When they try to buy Azure
    Then the wallet and unlocks are unchanged
    And a bought colour cannot be bought again

  Scenario: Render only
    Given a painted ship
    Then the sim's craft, upgrades and scores do not mention the paint
