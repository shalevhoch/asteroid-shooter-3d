Feature: Lock-on missiles (SPEC §5, P32)

  Scenario: Lock three and fire
    Given missiles level 2 and three asteroids ahead
    When the player holds V for about 1 s and releases
    Then three numbered red brackets appear
    And three rockets launch, one per target, for one rocket of ammo
