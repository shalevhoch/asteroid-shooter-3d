Feature: Overlay layout on narrow screens (SPEC §8, P21)

  Scenario Outline: No overlap
    Given a <size> window on the title card, with or without a gamepad connected
    Then the controls list and the card do not overlap
    Examples:
      | size      |
      | 1920x1080 |
      | 1280x720  |
      | 1024x768  |
      | 1024x600  |
      | 800x600   |
