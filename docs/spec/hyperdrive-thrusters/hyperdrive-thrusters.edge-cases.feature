Feature: Hyperdrive thrusters edge cases (SPEC §8, P28)

  Scenario: Release fades the burn
    Given the burn level is 1
    When Shift is released
    Then the plume shrinks over about 17 ticks

  Scenario: Low quality
    Given graphics quality is low
    When hyperdrive is on
    Then the plume draws but no trail particles are emitted

  Scenario: Classic camera
    Given the classic camera
    Then no thruster effects are drawn
