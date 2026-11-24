Feature: G-Ship craft (SPEC §3, P35)

  Scenario: Pick the G-Ship
    Given the title card
    When the player picks 'G-Ship'
    Then the stats line shows turn 110 %, fuel 690, hull 80, rockets 4
    And the run flies the G-Ship model nose-first
