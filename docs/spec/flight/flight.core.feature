Feature: Ship flight
  SPEC.md §3. Each scenario starts from initialState(seed) at SHIP_START, facing +Z, throttle 0, fuel FUEL_MAX.

  Scenario: Standing still
    When 10 ticks pass with no input
    Then the ship is still at SHIP_START

  Scenario: Throttle moves the ship forward
    When the throttle goes up 4 times and 10 more ticks pass
    Then the throttle is 4
    And the ship has moved forward (+Z) by 1 + 2 + 3 + 4 + 10 × 4 units

  Scenario: Turbo burns fuel and overrides the throttle
    Given the throttle is 2
    When turbo is held for 5 ticks
    Then the ship moved 5 × TURBO_STEP forward
    And fuel is FUEL_MAX − 5
    And turboStarted fired once

  Scenario: Pitching up turns the nose up
    When pitch +1 is held for 45 ticks
    Then forward has turned 90° up to +Y

  Scenario: Yaw right turns the nose right
    When yaw +1 is held for 45 ticks
    Then forward points along the start's right (−X)

  Scenario: Roll right drops the right wing
    When roll +1 is held for 45 ticks
    Then up points along the start's right (−X)

  Scenario: Strafing and reverse
    When strafe right, strafe up and reverse are each held for 10 ticks
    Then the ship moved 10 right, 10 up and 10 back

  Scenario: The mothership is solid
    When the ship holds full throttle into the hangar's −X wall
    Then it never passes through the wall
    And mothershipBump fires
    And the throttle drops
