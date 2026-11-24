Feature: Replays edge cases (SPEC §3, P37)

  Scenario: Bad file
    When the player imports a file that is not a replay
    Then 'Not a replay file' shows

  Scenario: Watching changes nothing
    Given a replay beats the best score
    Then the best score is unchanged

  Scenario: Long runs
    Given a replay too big for local storage
    Then it is kept for this session and can still be exported
