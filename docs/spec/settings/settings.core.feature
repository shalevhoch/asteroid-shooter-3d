Feature: Pause, help and settings (SPEC §8, P13)

  Scenario: Pause stops the game
    Given a run is playing
    When the player presses Esc or P
    Then the pause card shows with the settings panel open, and the sim stops ticking

  Scenario: Settings survive a reload
    Given the pause card
    When the player raises mouse sensitivity, lowers the volume and switches to the classic keys
    And reloads the page
    Then the settings panel shows ×1.25, 90 % and classic

  Scenario: Help follows the keymap
    When the player switches the keys to classic
    Then the controls list shows the classic bindings

  Scenario: Sensitivity
    Given mouse sensitivity ×2
    Then half the usual mouse movement turns the ship at full rate
