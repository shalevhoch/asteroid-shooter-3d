Feature: Achievements (SPEC §13, P16)

  Scenario: First unlock
    When the player destroys their first asteroid
    Then a "First contact" toast shows, and it is stored with today's date

  Scenario: Chain reaction
    When the player kills 10 asteroids in one combo chain
    Then "Chain reaction" unlocks

  Scenario: Campaign wins
    When the player clears wave 10 on Hard without firing a rocket
    Then "Earth is safe", "Photons only" and "Hardened" unlock

  Scenario: List
    Given unlocked achievements
    When the title card's Achievements panel is opened
    Then all 12 show, unlocked ones with a trophy and their date

  Scenario: Persist
    Given an unlocked achievement
    When the page reloads
    Then it is still unlocked
