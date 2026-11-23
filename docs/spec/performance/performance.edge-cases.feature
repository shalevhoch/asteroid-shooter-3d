Feature: Performance and loading edge cases (SPEC §14, P20)

  Scenario: Tab switch
    When the tab is hidden for a while and shown again
    Then the long frame is ignored and quality does not drop

  Scenario: Loaders queue more files
    When the total file count grows mid-load
    Then the bar holds instead of moving back

  Scenario: Load failure
    When a required asset fails to load
    Then the card says the assets couldn't load and asks for a reload

  Scenario: Fast desktop
    Given a device holding 60 fps
    Then quality stays high for the whole run

  Scenario: URL beats the setting (P23)
    Given Graphics is set to low
    When the page opens with ?quality=high
    Then high is used and the Graphics row says "set by URL"
