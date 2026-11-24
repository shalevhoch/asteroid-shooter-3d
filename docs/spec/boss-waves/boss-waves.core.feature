Feature: Boss waves (SPEC §10, P34)

  Scenario: Boss arrives
    Given wave 5 is about to start
    When it starts
    Then a giant red-brown asteroid appears with a BOSS health bar
    And the banner reads '⚠ Boss incoming'

  Scenario: Boss defeated
    Given the boss has 1 hp
    When a photon hits it
    Then it explodes for 300 points and +◆ 100 bonus credits
