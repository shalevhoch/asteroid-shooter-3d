Feature: Controls edge cases

  Scenario: Opposing keys cancel
    When roll left and roll right are both held
    Then roll is 0

  Scenario: Garbage stored settings
    Given stored settings that are not JSON, or have unknown values
    Then each bad field falls back to its default

  Scenario: Huge mouse flick
    When the mouse moves 600 px in one tick
    Then at most MOUSE_BUFFER_TICKS ticks of full-rate turn follow

  Scenario: Window loses focus
    When the window blurs with keys held
    Then no key stays held
