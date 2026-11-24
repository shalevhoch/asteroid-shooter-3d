Feature: Perks (SPEC §15, P26)

  Scenario: A kill drops a pickup
    Given about one kill in 25
    Then a glowing pickup appears where the asteroid was and drifts slowly

  Scenario: Collect a shield
    When the player flies through a blue pickup
    Then "Shield" shows in a banner and the HUD, a bubble surrounds Earth, and impacts do no damage for 10 s

  Scenario: Rapid fire and spread shot
    When the player collects rapid fire or spread shot
    Then photons fire every 2 ticks, or three at a time in a fan, for 10 s

  Scenario: Magnet
    When the player collects a magnet
    Then pickups within 1500 units fly to the ship for 15 s

  Scenario: Smart bomb
    When the player collects a smart bomb
    Then every asteroid within 2500 units explodes at rocket points
