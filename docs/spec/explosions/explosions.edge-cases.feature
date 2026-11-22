Feature: Explosion edge cases (SPEC §12, P12)

  Scenario: Reduced motion
    Given the browser asks for reduced motion and no shake setting is stored
    Then shake is off by default

  Scenario: Stored setting wins
    Given the browser asks for reduced motion and shake is stored as on
    Then shake is on

  Scenario: Weaker hit during a jolt
    Given a full-strength jolt is running
    When a weak hit lands
    Then the running jolt carries on unchanged

  Scenario: Many explosions at once
    When more than 24 shockwaves would be live
    Then the oldest are dropped

  Scenario: Shockwave normal along the camera up
    When an asteroid explodes with its normal along the camera's up
    Then the shockwave still gets a valid orientation

  Scenario: Degenerate line
    When a spark's head and tail coincide, or the line points at the eye
    Then its quad is degenerate but finite
