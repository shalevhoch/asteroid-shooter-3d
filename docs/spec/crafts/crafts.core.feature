Feature: Craft select (SPEC §3, P17)

  Scenario: Pick a craft and fly it
    Given the title card
    When the player picks the Shuttle and starts
    Then the ship model is the shuttle, and the HUD shows 5 rockets

  Scenario: Stats
    Given the Interceptor
    Then it turns 25 % faster than the Fighter, with 450 fuel, 75 hull and 2 rockets

  Scenario: Hangar
    Given a damaged Shuttle
    When it enters the hangar
    Then fuel, hull and rockets refill to 900, 140 and 5

  Scenario: Remembered
    Given the player picked the Interceptor
    When the page reloads
    Then the Interceptor is still picked
