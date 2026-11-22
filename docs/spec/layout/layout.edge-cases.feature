Feature: Overlay layout edge cases (SPEC §8, P21)

  Scenario: Phone landscape with a pad
    Given a 740x360 window with a gamepad connected
    Then the card narrows, the list clips at the bottom edge, and they do not overlap
