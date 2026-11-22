Feature: Space station (SPEC §3, P18)

  Scenario: Reload at the station
    Given a ship low on fuel with no rockets
    When it flies into the ring at the station's landing dock
    Then fuel, hull and rockets refill

  Scenario: Landmark
    When the player looks toward Earth from the asteroid lane
    Then the station, its docks and the green ring are above the lane

  Scenario: Radar
    Then the radar shows the station as a green diamond
