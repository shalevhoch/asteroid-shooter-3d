Feature: Settings edge cases (SPEC §8, P13)

  Scenario: Out-of-range stored values
    Given stored settings with sensitivity 99 and volume -3
    Then sensitivity loads as ×3 and volume as 0 %

  Scenario: Settings from before P13
    Given stored settings without sensitivity or volume
    Then they load with ×1 and 100 %, everything else kept

  Scenario: Difficulty mid-run
    Given the pause card
    When the player changes the difficulty
    Then the row says "next run" and the running wave is unchanged

  Scenario: Volume zero
    Given volume 0 %
    Then nothing plays, and the sound setting still says on

  Scenario: Classic layout pause
    Given the classic layout (no pointer lock)
    When the player presses Esc
    Then the run pauses
