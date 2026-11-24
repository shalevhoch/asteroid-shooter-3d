Feature: Photo mode (SPEC §8, P38)

  Scenario: Enter from pause
    Given the run is paused
    When the player opens photo mode
    Then the HUD, help, radar and pause card are hidden
    And the sim stays paused
    And the camera orbits the ship from the current view

  Scenario: Orbit, fly and focus
    Given photo mode is open
    When the player drags, zooms, flies with WASD or focuses Earth
    Then the camera stays a legal orbit around the chosen pivot

  Scenario: Save and exit
    Given photo mode is open with a filter on
    When the player saves
    Then a PNG downloads as asteroid-shooter-3d-YYYY-MM-DD-HHMMSS.png
    And leaving photo mode returns to the pause card
