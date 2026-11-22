# Overlay layout on narrow screens (P21)

SPEC.md §8 holds the rule. CSS media queries in `index.html`; checked in headless Chrome at six viewports.

```mermaid
flowchart LR
  V{viewport} -->|≥ 1240 px wide| C[card centred, list at right: unchanged]
  V -->|< 1240 px| L[card left, max 100vw − 404 px; list 340 px, labels wrap]
  V -->|< 720 px tall| T[list tightens, clips at the bottom edge]
```

## Invariants (EARS)

- **INV-1**: While the title or pause card shows, the controls list shall not intersect the card at any viewport ≥ 740×360.
- **INV-2**: At ≥ 1240 px wide the layout shall be unchanged.
