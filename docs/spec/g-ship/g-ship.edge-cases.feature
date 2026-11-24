Feature: G-Ship craft edge cases (SPEC §3, P35)

  Scenario: Default
    Given no saved craft
    Then the Fighter is selected

  Scenario: Upgrades per ship
    Given the G-Ship has its own shop upgrades
    Then they don't apply to the other crafts
