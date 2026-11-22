Feature: Flight edge cases

  Scenario: Throttle clamps
    When the throttle goes down at 0, and up 6 times
    Then the throttle is 0 and then 4

  Scenario: Turbo with an empty tank
    Given fuel is 1
    When turbo is held for 3 ticks
    Then fuel is 0 after the first tick, fuelEmpty fires once and turboEnded fires on the next
    And the ship moves at the throttle speed after the tank runs dry

  Scenario: Garbage input
    When an input has NaN, ±Infinity and out-of-range axes
    Then the axes count as 0 or are clamped, and the state stays finite

  Scenario: Many ticks of tumbling
    When 10 000 ticks of mixed turning pass
    Then the orientation is still a unit quaternion
