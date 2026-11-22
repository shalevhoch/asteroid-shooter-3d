Feature: Touch edge cases (SPEC §8, P15)

  Scenario: Portrait
    Given a touch device held upright
    Then a card asks to turn it sideways

  Scenario: Keyboard with touch
    Given touch controls and a keyboard
    When a key steps the throttle while the slider is set
    Then the key's step wins that tick

  Scenario: Stored difficulty
    Given a stored difficulty of Hard on a touch device
    Then Hard stays selected

  Scenario: Forcing the mode
    Given ?touch=0 on a tablet
    Then the touch controls stay off
