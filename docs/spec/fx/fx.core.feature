Feature: Effects (SPEC §12)

  Scenario: Big asteroid explodes
    When a big asteroid is destroyed
    Then 10 flashes and 40 flames burst at its position, flames swelling to about 6× the flash size

  Scenario: Rocket trail
    While a rocket flies
    Then it sheds 8 flares per tick that fade behind it

  Scenario: Burning in the atmosphere
    While a big asteroid is inside the atmosphere
    Then it trails a tail of flares and flames away from Earth

  Scenario: Shot hits Earth or the mothership
    When a photon hits the mothership
    Then a small explosion bursts there

  Scenario: Visual test page
    Given fx.html
    Then each effect can be triggered next to a big asteroid, and a stress mode holds 2000 particles with an fps readout
