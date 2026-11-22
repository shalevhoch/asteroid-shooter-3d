Feature: Run flow, HUD and audio (SPEC §9)

  Scenario: A full run
    Given the title screen
    When the player clicks start
    Then the run plays
    When Earth's health reaches 0
    Then the game-over card shows the cause, the score, the best and the run's stats
    When the player clicks Play again
    Then a new run starts with a new seed

  Scenario: New best persists
    When a run ends above the stored best
    Then NEW BEST! shows and the best survives a reload

  Scenario: Pause
    When the player presses Esc mid-run
    Then the run pauses and the sim stops until they click resume

  Scenario: Audio
    When the player fires photons and a rocket, and destroys an asteroid
    Then photon, rocket and kaboom play, after the first input unlocked audio

  Scenario: HUD
    Then the HUD shows score, best, Earth, hull and fuel bars, rocket pips, speed and the crosshair
