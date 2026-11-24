Feature: Paint colours (SPEC §3, P39)

  Scenario: Title-card picker
    Given the title card
    Then Stock is selected by default
    And achievement and credit colours show as locked or unlocked

  Scenario: Achievement unlock
    Given the player has Earth is safe
    Then Gold is unlocked on every ship

  Scenario: Credit purchase
    Given the player has 200 credits and Crimson is locked
    When they buy Crimson
    Then the wallet is 200 credits lower and Crimson is unlocked
    And it can be chosen on any ship

  Scenario: Saved per ship
    Given Fighter is Gold and Interceptor is Azure
    Then switching craft restores that ship's colour
    And the 3D ship is tinted to match
