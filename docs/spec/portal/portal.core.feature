Feature: Portal look and entry (SPEC §9, P14)

  Scenario: Back to the portal
    Given the title, pause or game-over card
    Then it has a "← all games" link to games.hochgi.com

  Scenario: Matching look
    When the game loads
    Then its cards, buttons and text use the portal's font and colours, and the tab shows the game's icon

  Scenario: Listed on the portal
    Given Shalev merged the portal tile
    Then games.hochgi.com shows Asteroid Shooter 3D next to Ninja Grip and Conquarrow
