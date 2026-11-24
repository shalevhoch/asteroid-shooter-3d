Feature: Replays (SPEC §3, P37)

  Scenario: Watch the last run
    Given a finished run
    When the player clicks 'Watch replay'
    Then the run plays back exactly with a REPLAY tag and timer
    And it ends on the game-over card marked 'Replay finished'

  Scenario: Share a replay
    Given a finished run
    When the player clicks 'Export replay'
    Then a JSON file downloads
    And importing it on another browser plays the same run
