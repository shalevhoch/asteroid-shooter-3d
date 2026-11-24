Feature: Keyboard rockets (SPEC §8, P27)

  Scenario: Rocket from the keyboard
    Given the modern layout
    When the player presses V
    Then a homing rocket launches, and the controls list shows V / right mouse
