Feature: Craft edge cases (SPEC §3, P17)

  Scenario: Unknown stored craft
    Given a stored craft that no longer exists
    Then the Fighter is picked

  Scenario: Quick switching
    When the player picks two crafts quickly, and the first model finishes loading last
    Then the last pick is the one shown
