Feature: Asteroid edge cases

  Scenario: Unknown id
    When an unknown asteroid id is destroyed
    Then nothing changes and no event fires

  Scenario: Overkill
    When three big asteroids hit Earth at 15 health on one tick
    Then Earth is at 0 and runEnded fires once

  Scenario: Both ends at once
    When Earth falls and the ship is destroyed on the same tick
    Then the run ends as earthDestroyed

  Scenario: Seeds
    Then the same seed gives the same asteroids and different seeds differ
