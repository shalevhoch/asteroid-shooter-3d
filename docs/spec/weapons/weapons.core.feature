Feature: Weapons and scoring (SPEC §5–§6)

  Scenario: Photon cadence
    When fire is held for 20 ticks
    Then 4 photons fire, alternating right and left wings

  Scenario: Photon range
    Then a photon flies 36 per tick and expires after 20 ticks

  Scenario: Chipping and killing
    When photons hit a small asteroid 8 times
    Then it is destroyed for 10 points
    And a big asteroid needs 20 hits, splits, and scores 20

  Scenario: Rocket carry
    When the rocket is pressed 5 times
    Then 3 rockets fire

  Scenario: Crosshair lock
    When a rocket fires with two asteroids ahead
    Then it locks the one nearest the crosshair, not the nearest one

  Scenario: Fallback lock
    When a rocket fires with nothing in the cone
    Then it locks the nearest asteroid and destroys it

  Scenario: Rocket kills
    Then a rocket destroys a big asteroid outright for 15 points without splitting, and a small one for 8

  Scenario: Re-targeting
    When a rocket's target is destroyed first
    Then it locks another asteroid and destroys it

  Scenario: Hangar reload
    Then the hangar refills rockets
