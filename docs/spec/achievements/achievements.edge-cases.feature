Feature: Achievement edge cases (SPEC §13, P16)

  Scenario: Already unlocked
    Given "First contact" is unlocked
    When the player destroys an asteroid in a new run
    Then no toast shows

  Scenario: A miss breaks the streak
    Given 19 photon hits in a row
    When a photon expires without hitting
    Then the Sharpshooter streak restarts

  Scenario: Several at once
    When three achievements unlock on one tick
    Then their toasts show one after another

  Scenario: Corrupt storage
    Given junk in the achievements storage
    Then the list starts empty
