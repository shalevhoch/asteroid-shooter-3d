Feature: Perk edge cases (SPEC §15, P26)

  Scenario: Missed pickup
    When nobody collects a pickup
    Then it blinks for its last 2 s and fades out at 8 s

  Scenario: Struggling
    Given Earth or the hull is below half
    Then drops come a little more often (6 %)

  Scenario: Repeat pickup
    When the player collects a perk that is already active
    Then its timer resets to full

  Scenario: Smart bomb with nothing nearby
    Then it goes off and destroys nothing
