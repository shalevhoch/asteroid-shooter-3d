Feature: Explosions (SPEC §12, P12)

  Scenario: Big asteroid explodes
    When a big asteroid is destroyed
    Then a shockwave of size 30 spreads on the plane facing away from Earth
    And 10 flashes, 40 flames, 50 smoke streaks and 100 sparks burst there

  Scenario: Photon chips a big asteroid
    When a photon hits a big asteroid that survives
    Then 1 small flash, 3 sparks and 5 smoke streaks show on its surface, on the side the photon came from

  Scenario: Rocket trail smoke
    While a rocket flies
    Then each tick it leaves a smoke streak over its last tick of flight that fades and widens

  Scenario: Earth is hit
    When an asteroid hits Earth
    Then the camera shakes and the screen edges flash red, both scaled by the damage

  Scenario: Shake off
    Given shake is off in the settings
    When an asteroid hits Earth
    Then the screen flashes red but the camera does not move
