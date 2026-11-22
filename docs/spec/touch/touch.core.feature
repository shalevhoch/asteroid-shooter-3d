Feature: Touch controls (SPEC §8, P15)

  Scenario: Touch device detected
    Given a tablet (coarse pointer, touch points)
    When the game loads
    Then the title says "Tap to start", Kid / Easy is selected, and the help lists the touch controls

  Scenario: Aim with the stick
    While a finger drags right on the left half of the screen
    Then the ship yaws right, at full rate once the finger is 64 px out

  Scenario: Throttle slider
    When the player drags the slider to the top
    Then the throttle climbs one level per tick to 4

  Scenario: Fire, rocket and turbo
    When the player holds FIRE, taps ROCKET or holds TURBO
    Then photons fire, one rocket launches, or the turbo engages

  Scenario: Pause
    When the player taps Ⅱ
    Then the game pauses and the touch controls hide
