Feature: Hebrew and tutorial edge cases (SPEC §3, P36)

  Scenario: Skip
    Given the tutorial is showing
    When the player presses K
    Then it hides and stays hidden on later runs

  Scenario: Replay
    Given the tutorial is done
    When the player clicks 'Replay the tutorial'
    Then a new run starts with step 1

  Scenario: Untranslated text
    Given a string with no Hebrew entry
    Then it shows in English
