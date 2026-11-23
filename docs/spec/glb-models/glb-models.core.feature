Feature: GLB models (SPEC §14, P25)

  Scenario: Crafts and station look the same
    Given each craft is selected in turn
    When the player flies up to the space station
    Then the frame matches the pre-P25 build

  Scenario: Gallery
    When the gallery shows each former 3DS / LWO model
    Then it loads as GLB with the same triangle count and size
