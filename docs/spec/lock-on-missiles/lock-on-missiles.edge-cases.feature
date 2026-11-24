Feature: Lock-on missiles edge cases (SPEC §5, P32)

  Scenario: Nothing to lock
    Given no asteroid in the cone
    When the player presses and releases
    Then one unlocked rocket fires

  Scenario: Target lost
    Given a locked asteroid is destroyed while locking
    Then its lock is dropped

  Scenario: No missiles
    Given missiles level 0
    Then rockets work exactly as before
