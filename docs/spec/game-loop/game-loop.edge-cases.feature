Feature: Run flow edge cases

  Scenario: Actions in the wrong phase
    Then pause on the title, resume when over, and restart mid-run do nothing

  Scenario: Tie with the best
    When a run ends exactly on the best score
    Then it is not a new best

  Scenario: Corrupt stored best
    Given the stored best is "lots" or negative
    Then the best reads as 0

  Scenario: Many explosions in one tick
    When ten asteroids die in one tick
    Then at most four sounds play
