# Hebrew and tutorial

SPEC.md §3 holds the rules. This file adds the structure and the invariants the tests pin.

```mermaid
flowchart LR
  L[Language: English / עברית] --> T[t(lang, english, vars)]
  T --> U[cards, settings, shop, HUD, banners]
  L --> D[html lang + dir=rtl]
  R[first normal run] --> S[aim → fire → rocket → throttle → reload]
  S --> E[done or K skip → saved]
```

## Invariants (EARS)

- **INV-1**: THE UI language SHALL be English or Hebrew, chosen on the title card or in settings, saved, and Hebrew SHALL set dir=rtl on the page.
- **INV-2**: EVERY Hebrew string SHALL keep exactly the placeholders of its English key, and a missing key SHALL fall back to English.
- **INV-3**: WHEN a normal run starts and the tutorial is not done, THE game SHALL show the five tutorial steps in order, each advancing only on its own action.
- **INV-4**: WHEN the tutorial finishes or the player presses K or Skip, THE game SHALL remember it and not show it again until 'Replay the tutorial' is chosen.
- **INV-5**: THE daily challenge SHALL never show the tutorial.
