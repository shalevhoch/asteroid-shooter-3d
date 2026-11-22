Feature: Threat awareness edge cases (SPEC §11)

  Scenario: Asteroid behind the camera
    Given an asteroid behind and to the right of the camera
    Then the arrow sits on the right edge, not the left

  Scenario: Dead behind
    Given an asteroid exactly behind the camera
    Then the arrow points down

  Scenario: Tiny distant asteroid
    Given an on-screen asteroid smaller than 7 pixels
    Then it gets a ring marker

  Scenario: Beyond radar range
    Given an asteroid farther than 4000 units
    Then its blip sits on the radar rim

  Scenario: No asteroids
    Then the impact readout is hidden

  Scenario: Equal times to impact
    Then the asteroid with the lower id is the most urgent
