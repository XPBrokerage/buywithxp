# buywithXP

Buy-side site for XP M&A — growth-by-acquisition positioning ("grow 5–7x via M&A"),
the acquisition growth modeler, broker comparison, and lead capture.

Sister site: [sellwithXP](https://sellwithxp.com) (sell-side). Same visual system:
light theme on the XP palette, Wasatch ridgeline, navy punctuation sections.

## Stack

Static site — no build step. `index.html` + `assets/`. Deploy anywhere
(GitHub → Vercel, same as sellwithxp).

## Wire-up before launch (the only TODO)

Edit the top of `assets/js/main.js`:

```js
var XP_CONFIG = {
  GHL_WEBHOOK_URL: '',  // GoHighLevel inbound webhook URL
  BOOKING_URL: ''       // GHL calendar/booking page link
};
```

- `GHL_WEBHOOK_URL` — both forms (strategy-call request and "send my plan")
  POST JSON to it. Payloads carry a `form` field (`strategy_call_request` /
  `acquisition_plan_request`) plus the full modeler scenario on plan requests,
  so GHL workflows can branch on it.
- `BOOKING_URL` — the "Book directly on the calendar" button. Until set, it
  scrolls to the contact form instead.
- Until the webhook is set, form submits fall back to a pre-filled email to
  adam@xpbrokerage.com — the site degrades gracefully, nothing breaks.

Also update `https://buywithxp.com` in `index.html` (canonical/OG) and
`sitemap.xml` if the final domain differs.

## Design tokens — do not break

Two gold tokens (same rule as sellwithxp):

| Token | Value | Use |
|---|---|---|
| `--xp-gold` | `#C9A84C` | Fills, rules, bars, text **on navy** |
| `--xp-gold-text` | `#926D10` | Gold **text on light** backgrounds (AA-safe) |

Brand gold on white fails WCAG AA (2.29:1); the darkened token passes (4.75:1).

## Modeler

`assets/js/modeler.js` — pure `computeModel()` (node-testable, CommonJS export
guard). Valuation multiple is piecewise-linear on combined EBITDA across
size-tier anchors (2.75x @ ≤$250K → 7.5x @ ≥$20M), reflecting the SMB size
premium. Debt modeled at 10-yr straight-line amortization. Defaults land at
~6.3x over 5 years — inside the pitched 5–7x band. Labeled illustrative on-page.
