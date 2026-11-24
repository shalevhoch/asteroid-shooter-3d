Feature: Hyperdrive thrusters (SPEC §8, P28)

  Scenario: Hyperdrive lights the engines
    Given the fighter is flying in the chase camera
    When the player holds Shift
    Then a hot plume streams from both nozzles
    And a whoosh plays

  Scenario: Idle glow
    Given the ship is flying without hyperdrive
    Then each nozzle shows a soft blue glow and no plume
