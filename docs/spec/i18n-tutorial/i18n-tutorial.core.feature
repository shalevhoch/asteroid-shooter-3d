Feature: Hebrew and tutorial (SPEC §3, P36)

  Scenario: Switch to Hebrew
    Given the title card
    When the player clicks 'עברית'
    Then the cards, settings, shop and HUD labels are in Hebrew
    And the page is right to left

  Scenario: First-run tutorial
    Given a new player starts a run
    Then the hint box shows 'Tutorial 1/5' about aiming
    When they turn the ship, then fire, launch a rocket, throttle up and reload
    Then each hint advances and the tutorial ends with 'Tutorial done'
