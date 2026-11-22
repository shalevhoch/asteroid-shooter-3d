Feature: Weapon edge cases

  Scenario: Earth and the mothership absorb shots
    Then a photon hitting Earth or a mothership box is consumed

  Scenario: Double hit in one tick
    When two photons reach a 1-HP asteroid on the same tick
    Then only the first destroys it and the second flies on

  Scenario: Empty racks and cooldown
    Then no rocket fires with 0 rockets, and letting go of fire does not reset the photon cooldown

  Scenario: Nothing to chase
    Then a rocket with no asteroids flies straight and expires after 400 ticks

  Scenario: Tunnelling
    Then a photon can't skip over a small asteroid between ticks
