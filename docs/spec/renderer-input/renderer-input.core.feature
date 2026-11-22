Feature: Controls and camera (SPEC §8)

  Scenario: Modern is the default
    Given no stored settings
    Then the layout is modern, the camera is chase, invert-Y is off and help is shown

  Scenario: Mouse aim
    When the mouse moves 3 px right within one tick
    Then the ship yaws right at half the turn rate for that tick

  Scenario: A flick spreads over ticks
    When the mouse moves 15 px right within one tick
    Then the next ticks yaw at 1, 1 and 0.5

  Scenario: Throttle presses
    When W is pressed three times within one tick
    Then the throttle rises by one level on each of the next three ticks

  Scenario: Classic keys
    Given the classic layout
    Then I pitches up, L yaws right, O rolls right, W is turbo and 0 raises the throttle

  Scenario: Switching camera
    When C is pressed
    Then the camera switches between chase and classic and the choice is kept
