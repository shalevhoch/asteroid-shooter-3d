Feature: Wave missions (SPEC §10, P31)

  Scenario: Seeded mission on wave 1
    Given a run whose seed draws the combo mission for wave 1
    When wave 1 starts
    Then the banner reads 'Mission: Chain a 3-kill combo'
    And the HUD shows 'Best chain 0/3'

  Scenario: Mission complete
    Given the mission is met
    When the wave clears
    Then the banner leads with 'Mission complete: +◆ 30'
    And the credits are banked
