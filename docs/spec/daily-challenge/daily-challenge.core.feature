Feature: Daily challenge (SPEC §6, P33)

  Scenario: Play the daily
    Given it is 2026-11-24 UTC
    When the player clicks 'Daily challenge'
    Then the run starts with the day's seed on Normal with the Fighter and no upgrades

  Scenario: Daily best
    Given no daily best today
    When a daily run ends with 420
    Then the card shows 'NEW DAILY BEST!'
    And the title button shows 'best 420'
