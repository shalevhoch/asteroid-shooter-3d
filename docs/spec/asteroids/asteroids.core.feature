Feature: Asteroids and Earth (SPEC §4)

  Scenario: Steady spawning
    When 600 ticks pass
    Then asteroids 1, 2 and 3 spawned on ticks 200, 400 and 600

  Scenario: Spawn position and size
    When an asteroid spawns
    Then it is at x −800 with y and z in [−500, 500), aimed at Earth, with full HP
    And about one in five is big

  Scenario: Earth impact
    When a big and a small asteroid reach Earth on the same tick
    Then both are removed and Earth loses 12

  Scenario: Photon kill splits a big asteroid
    When a big asteroid is destroyed by photons
    Then four small asteroids appear at the original's offsets with new ids

  Scenario: Rocket kill does not split
    When a big asteroid is destroyed by a rocket
    Then it is gone without pieces

  Scenario: Earth falls
    When Earth's health reaches 0
    Then the run ends as earthDestroyed

  Scenario: Hangar refill
    Given low fuel and hull
    When the ship is in the hangar
    Then fuel and hull are full and shipReloaded fires once

  Scenario: Atmosphere burn and Earth contact
    When the ship is in the atmosphere
    Then the hull drops 1 per tick, and the run ends as shipDestroyed at 0
    And touching Earth destroys the ship at once
