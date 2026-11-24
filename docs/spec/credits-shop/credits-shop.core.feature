Feature: Credits and station shop (SPEC §6, P29)

  Scenario: Earn and spend
    Given the player has 640 credits in a wave lead-in
    When they press B and then 1, 3 and 1
    Then photon damage is level 2 and hull plating level 1
    And 190 credits remain, saved to the wallet

  Scenario: Credits carry over
    Given a run ends with 190 credits
    When the page reloads
    Then the title card shows 190 credits
