# DesignTemplate.png — visual reconstruction specification

This document is the durable design reference for recreating everything visible in
`docs/DesignTemplate.png`. It describes the screenshot as evidence, not as a loose
source of inspiration. Use it whenever the reference image needs to be translated
into components, layout, or visual tokens.

The source image is **1919 × 937 px**. It shows a desktop analytics dashboard at the
top of a vertically scrollable page. Anything below the bottom crop is unknown and
must not be invented from this reference alone.

> Important project note: this visual reference is more decorative and denser than
> the current rules in `docs/DESIGN-SYSTEM.md`. That file remains the implementation
> contract until M1 explicitly adopts this design. In particular, the screenshot uses
> fixed rails, compact typography, custom indigo tones, dense cards, and bespoke
> chart/table treatments that are not presently allowed by the project contract.

## 1. Overall visual character

- Product type: signed-in business intelligence / admin dashboard.
- Mood: clean, operational, data-heavy, calm, and lightly branded.
- Primary visual language: white surfaces, a very pale blue-grey page background,
  indigo navigation, periwinkle actions, hairline borders, and minimal shadows.
- Density: high. Navigation, metrics, chart, table, and activity feed all coexist in
  one viewport without feeling cramped because separators are thin and most text is
  compact.
- Shape language: mostly small-radius rectangles; circular containers are reserved
  for avatars, status dots, and round icon actions.
- Elevation: conveyed primarily by white cards against the pale page canvas and by
  1 px borders. Strong drop shadows are absent.
- Alignment: rigid grid. Left edges, card headers, numeric baselines, table columns,
  and right-side actions align precisely.

## 2. Global frame and geometry

The visible application is divided into four persistent layers:

1. A **92 px dark-indigo icon rail** from `x=0` to approximately `x=92`.
2. A **311 px white navigation drawer** from approximately `x=92` to `x=403`.
3. A **70 px top header** spanning from the drawer's left edge to the right viewport.
4. A pale content canvas beginning at approximately `x=403`, `y=71`.

Key measurements from the screenshot:

| Region | Approximate bounds | Notes |
| --- | --- | --- |
| Viewport | `1919 × 937` | Desktop screenshot |
| Icon rail | `92 × 937` | Fixed to far left |
| Top brand block | `x 92–287`, `y 0–71` | White header area |
| Top tabs | `x 287–655`, `y 0–71` | Overview, Components, Applications |
| Utility cluster | `x 1580–1897`, `y 0–71` | Five evenly spaced actions |
| Navigation drawer | `x 92–403`, `y 71–937+` | Independently tall list |
| Main canvas | `x 403–1898`, `y 71–937+` | Pale blue-grey |
| Main inner gutter | about `24 px` | Around the content grid |
| Browser scrollbar | `x 1900–1918` | Visible at far right |

The main content grid is approximately 1449 px wide inside 24 px side gutters. Its
first major row uses a **roughly 1:1 split**: left metrics region about 709 px, right
chart card about 709 px, separated by about 31 px. The next visible row uses a
**roughly 2:1 split**: transaction card about 955 px and activity card about 463 px,
again separated by about 31 px.

## 3. Color system

The following values are sampled or visually inferred from the source. Slight
anti-aliasing variants occur around text and icons.

| Role | Reference color | Usage |
| --- | --- | --- |
| Deep navigation indigo | `#29347A` | Full icon rail |
| Primary periwinkle | `#6576FF` | Active tabs, buttons, links, selected chart line |
| Secondary periwinkle | `#798BFF` | Logo and lighter active accents |
| Active pale indigo | `#EEF0FF` | Soft buttons and selected floating-tool surfaces |
| Page canvas | `#F5F6FA` | Main workspace background |
| Card surface | `#FFFFFF` | Header, drawer, cards, table, activity list |
| Border | about `#DBDFEA` | Card outlines and row dividers |
| Strong text | about `#364A63` | Titles, primary numbers, key labels |
| Darkest text | about `#0C4C7D` | Some body/table copy due to font rendering |
| Muted text | about `#526484` / lighter variants | Descriptions, metadata, axis labels |
| Chart fill | `#D7DCFF` | Area beneath line chart |
| Success | bright mint/green, about `#05D69B` | Positive deltas and paid state |
| Error | coral/red, about `#FF4D4F` | Negative deltas and canceled state |
| Warning avatar | golden yellow | Initials avatar in activity feed |
| Bright blue avatar | about `#1676FB` | Customer/activity initials avatar |
| Floating cyan | bright aqua | Grid icon and notification dot |
| Floating pink | bright pink | Cart icon/tool strip |

Rules evident in the image:

- Indigo is the only dominant brand hue.
- Green and red are semantic and appear only in changes/statuses.
- Most copy is blue-grey rather than neutral black.
- The canvas/card contrast is subtle; borders preserve separation.
- Chart axes use extremely low-contrast blue-grey.

## 4. Typography

The typeface is a compact humanist/geometric sans, visually close to common dashboard
fonts such as Roboto or a similar web sans. The exact family cannot be proven from a
raster screenshot; do not claim an exact font without the source template.

| Element | Approximate style |
| --- | --- |
| Page title “Sales Overview” | 29–31 px, semibold, tight line height |
| Page welcome line | 16 px, regular, muted |
| Card titles | 18–19 px, semibold |
| Large revenue value | 32–34 px, regular |
| Metric values | 29–31 px, regular |
| Top navigation | 15–16 px; active tab semibold |
| Drawer parent items | 14–15 px, semibold |
| Drawer child items | 14 px, regular |
| Card descriptions | 13 px, regular |
| Table headers | 13–14 px, regular, muted |
| Table cells | 13–14 px |
| Small timestamps/axis ticks | 11–13 px |

Text uses sentence/title capitalization exactly as shown. Numeric figures are not
bold; scale and whitespace create hierarchy. Links and actionable labels use
periwinkle. Card titles and primary values use the strongest blue-grey.

## 5. Far-left icon rail

The rail is a full-height `#29347A` slab. A thin darker teal/blue line is visible at
the extreme left edge. The upper-left and lower-left outer corners appear softly
rounded because the application shell is inset by a few pixels from the image edge.

### Logo

- Centered around `x=48`, near `y=38`.
- A faceted lavender hexagonal mark containing a white nested spiral/hexagon glyph.
- Overall mark about 40 × 40 px.
- No wordmark appears in the dark rail.

### Primary icon stack

Six outline icons appear in a vertical column, centered at `x≈48`, beginning near
`y=139` with roughly 57–59 px between centers:

1. Inbox/tray.
2. Message rectangle with three dots.
3. Folder.
4. Circular chat bubble with three dots.
5. Calendar.
6. Small dashboard/window layout.

Icons are approximately 22–24 px, 2 px stroke, and muted periwinkle-blue. None of
these visible icons has a filled selection background.

### Rail divider and lower actions

- A horizontal divider crosses the rail at about `y=479`.
- A stacked-layers icon is centered around `y=531` below the divider.
- A gear icon sits near `y=831`.
- A circular lavender user avatar sits near `y=893`, about 44 px diameter, labeled
  `AB` in white uppercase letters.
- The large vertical gap between the layers icon and settings pushes account actions
  to the bottom of the viewport.

## 6. Top header

The header is 70–71 px high, white, and separated from the content/drawer by a 1 px
bottom border.

### Product identity block

- Begins around `x=116`.
- Small pale-lavender circular emblem, roughly 38 px diameter, at `x≈134`, `y≈37`.
- The emblem contains the same nested geometric brand glyph in periwinkle.
- Two-line label to its right:
  - `DashLite`: about 12 px, muted blue-grey.
  - `Dashboard`: about 14–15 px, semibold, dark.

### Header tabs

- `Overview` begins at approximately `x=298` and is active.
- `Components` begins around `x=401`.
- `Applications` begins around `x=530`, followed by a small downward chevron.
- Tabs are vertically centered around `y=37`.
- Active text is periwinkle and semibold.
- Active underline is a 2–3 px periwinkle rule from about `x=298` to `x=364`, aligned
  to the header bottom at `y≈69`.
- Inactive tabs are dark blue-grey with no background.

### Utility actions

Five items are right aligned with generous spacing:

1. Globe outline.
2. Overlapping chat/message bubbles.
3. Bell outline with a small cyan notification dot at its upper-right.
4. Circular United States flag language selector.
5. Circular periwinkle profile button with a white user outline.

The first three are dark blue-grey outline icons without visible containers. The
flag is about 24 px. The profile circle is about 36 px. The right inset before the
scrollbar is about 27 px.

## 7. White navigation drawer

The drawer begins below the header and has a 1 px right border. Content is inset about
34 px from its left edge. Icons occupy a narrow leading column; labels start near
`x=155`. Right-facing chevrons align near `x=362`.

### Expanded dashboard group

- Header row at `y≈91`:
  - Purple outlined brand/dashboard icon.
  - `Dashboards` in periwinkle, semibold.
  - Down chevron on the far right, showing the group is expanded.
- Nine visible child routes, roughly 38 px apart:
  1. `Default Dashboard` — active/periwinkle.
  2. `Crypto Dashboard`.
  3. `Analytics Dashboard`.
  4. `Invest Dashboard`.
  5. `eCommerce Dashboard`.
  6. `CRM Dashboard`.
  7. `Hotel Dashboard`.
  8. `LMS Dashboard`.
  9. `Hospital Dashboard`.
  10. `Pharmacy Dashboard` is also visible before the next section, making ten
      visible dashboard children in total.
- Child items have no leading icons, no background highlight, and no indicator bar;
  active state is text color alone.

### Collapsed module rows

Below the expanded group, compact parent rows continue at about 38 px intervals.
Each has a muted blue-grey outline icon, semibold label, and right chevron:

1. Content Management — newspaper/card icon.
2. Subscription Panel — calendar icon.
3. Crypto Buy/Sell — stacked coins/database icon.
4. Ai Copywriter — microchip icon (capitalization exactly as shown).
5. Investment Panel — circular arrows/finance icon.
6. Customer Management — user/list icon.
7. Ecommerce Platform — shopping bag icon.
8. Hotel Management — building icon.
9. Learning Management — open book icon.
10. Loan Management — tray/calendar-like icon.
11. Hospital Management — medical plus icon.
12. Pharmacy Management — pill/capsule icon, partially cut off at the bottom.

The drawer itself shows no visible scrollbar in this crop, even though content
continues below the viewport.

## 8. Main page header and actions

The content canvas begins with a heading block at approximately `x=427`, `y=110`.

- Title: `Sales Overview`.
- Description below: `Welcome to DashLite Dashboard Template.`
- About 34 px vertical separation exists between the title area's bottom and the
  first card row.

Two actions are aligned to the upper right, both around 40 px high:

### Date range button

- White surface, 1 px border, small radius.
- Approximately 196 px wide.
- Calendar outline icon at left.
- Label `Last 30 Days`, semibold.
- Right chevron at far right.

### Reports button

- Solid periwinkle, approximately 130 px wide.
- White report/document icon.
- White semibold label `Reports`.
- Same height/radius as date button.
- About 18 px gap after the date button.

## 9. Card construction

All major content surfaces share these properties:

- White fill.
- 1 px cool-grey border.
- Radius approximately 5–6 px.
- No obvious drop shadow.
- Internal padding approximately 26–28 px.
- Title aligned top left.
- Small circular `?` help affordance may appear at top right of metric cards. It has a
  very pale grey-blue fill and white question mark.

## 10. Sales Revenue card

Bounds: approximately `x=427–1136`, `y=208–401`.

- Header: `Sales Revenue` at `x≈455`, `y≈246`.
- Help icon near `x≈1100`, `y≈247`.
- Description: `In last 30 days revenue from subscription.`
- Two large metrics share the lower area:
  - `14,299.59`, followed inline by red `↓ 16.93%`; caption `This Month` below.
  - `7,299.59`, followed inline by green `↑ 4.26%`; caption `This Week` below.
- Metrics are aligned to the same numeric baseline.
- The decline and growth indicators are smaller and use both icon/direction and
  color.
- At far right is a 12-bar minimalist sparkline. Bars are thin vertical strokes of
  varied height, spaced evenly, and rise from a common baseline.
- Most bars are very pale periwinkle; the final bar is saturated periwinkle. Some
  intermediate bars use slightly stronger lavender.
- There are no sparkline axes, labels, gridlines, or enclosing plot box.

## 11. Small metric cards

Two equal cards sit side by side below Sales Revenue with about 31 px between them.
They occupy approximately `y=432–603`.

### Active Subscriptions

- Bounds: approximately `x=427–766`.
- Title: `Active Subscriptions`.
- Help icon at upper-right.
- Main value: `9.69K`.
- Footer delta: red `↓ 1.93%`, followed by muted `since last month`.
- Six thin spark bars at the right, varied heights; five pale indigo and the last
  saturated periwinkle.

### Avg Subscriptions

- Bounds: approximately `x=797–1136`.
- Title: `Avg Subscriptions`.
- Help icon at upper-right.
- Main value: `346.2`.
- Footer delta: green `↑ 2.45%`, followed by muted `since last week`.
- Six right-aligned spark bars; the last is stronger lavender rather than the deeper
  blue used in the first card.

## 12. Sales Overview chart card

Bounds: approximately `x=1167–1876`, `y=208–603`.

### Header

- Title `Sales Overview` at about `x=1195`, `y=246`.
- Description: `In 30 days sales of product subscription.`
- Inline link `See Details` in periwinkle immediately after the description.
- Soft-indigo `Download Report` button aligned top-right:
  - Pale lavender background.
  - Indigo cloud-download outline icon.
  - Indigo semibold text.
  - Roughly 190 × 41 px.

### Summary line

- Large value `$82,944.60` at left.
- `1,937 Subscribers` aligned at the same horizontal band on the right.
- Subscriber number and label use muted blue-grey and a smaller size.

### Area chart

- Plot begins around `x=1260`, ends around `x=1831`.
- Y-axis labels: `$ 12000`, `$ 9000`, `$ 6000`, `$ 3000`.
- Four horizontal gridlines, 1 px, pale blue-grey.
- X-axis labels show every day `01` through `30`.
- X ticks are tiny blue-grey with no visible vertical gridlines.
- Line is saturated periwinkle, about 2 px, with angular/straight segments rather
  than a heavily smoothed spline.
- The line repeats a saw-tooth sales pattern: frequent peaks near 9–9.7K and deep
  troughs around days 04, 09, 16, 22, and 28 near 5.5K.
- Area below the line is filled translucent pale periwinkle down to the baseline.
- There are no point markers, legend, tooltips, or axis titles in the static image.

## 13. Transaction card

Bounds: approximately `x=427–1382`, beginning `y=634` and continuing below the crop.

### Header row

- Height about 72 px with bottom divider.
- Title `Transaction` at left.
- Link `See History` immediately to its right in periwinkle.
- Filter tabs aligned right: `Paid`, `Pending`, `All`.
- `All` is active, with dark text and a short periwinkle underline.

### Table header

Header labels, from left to right:

1. `Order No.`
2. `Customer`
3. `Date`
4. `Ref`
5. `Amount`
6. `Status`
7. Unlabeled overflow-action column.

The table header is about 41 px high. It uses muted text, white fill, and a bottom
divider. Columns have generous fixed spacing rather than dense spreadsheet borders;
there are no vertical rules.

### Visible transaction row 1

- Order: `#95954`, periwinkle link.
- Customer avatar: circular lavender, initials `AB` in white.
- Customer: `Abu Bin Ishtiyak`.
- Date: `02/11/2020`, muted.
- Ref: `SUB-2309232`, periwinkle link.
- Amount: `4,596.75 USD`, with numeric portion semibold/dark.
- Status: small green dot plus green `Paid`.
- Action: horizontal ellipsis at far right.

### Visible transaction row 2

- Order: `#95850`, periwinkle link.
- Customer avatar: bright blue, initials `DE` in white.
- Customer: `Desiree Edwards`.
- Date: `02/02/2020`.
- Ref: `SUB-2309154`, periwinkle link.
- Amount: `596.75 USD`.
- Status: small red dot plus red `Canceled`.
- Horizontal ellipsis action.

A third row begins below the screenshot crop; only the top of its avatar is visible.
Do not infer its content.

Rows are approximately 81 px tall, separated by 1 px horizontal dividers. Avatars
are about 44 px diameter. Customer name and avatar are horizontally aligned.

## 14. Recent Activities card

Bounds: approximately `x=1413–1876`, beginning `y=634` and continuing below crop.

### Header

- About 72 px high with bottom divider.
- Title `Recent Activities` at left.
- Right controls: `Cancel` and `All`.
- `All` is active with a short periwinkle underline.

### Activity rows

Each row is about 80–81 px tall with a bottom divider. A 44 px circular avatar sits
at left. Copy is two lines: event description in medium blue-grey and timestamp in a
smaller muted tone.

Visible entries:

1. Photo avatar of a woman; `Keith Jensen requested to Withdrawl.`; `2 hours ago`.
   The misspelling “Withdrawl” is part of the screenshot and should be preserved only
   when reproducing the source verbatim, not in new product copy.
2. Golden yellow initials avatar `HS`; `Harry Simpson placed a Order.`; `2 hours ago`.
3. Bright blue initials avatar `SM`; `Stephanie Marshall got a huge bonus.`;
   `2 hours ago`.

The third row continues below the crop. No status icons or row-level action menus are
visible.

## 15. Floating right-side tool strip

A floating vertical palette overlaps the chart/activity area at approximately
`x=1847–1898`, beginning around `y=283`.

- Width about 51 px.
- White base, small left-side shadow, slight corner radius.
- Four stacked square cells, each about 51 px high, separated by faint rules:
  1. Brand/nested-hexagon icon in periwinkle on a very pale blue surface.
  2. 3×3 dot/grid icon in aqua on a pale mint surface.
  3. Gear outline in periwinkle on pale lavender.
  4. Shopping cart outline in pink on pale pink.
- This strip floats above content and is not part of the main card grid.

## 16. Scrolling and viewport clues

- A native-looking vertical scrollbar is visible at the far right.
- The thumb begins around `y=95` and extends to roughly `y=510`, suggesting a page
  taller than the viewport and currently near its top.
- Small arrow areas are visible at the top and bottom of the scrollbar track.
- The left icon rail and top header visually behave like persistent application
  chrome, but a still image cannot prove `fixed` versus `sticky` positioning.
- The drawer and main content both extend below the crop.

## 17. Component inventory for later implementation

Recreate the design through reusable parts rather than one monolithic page:

| Component | Responsibility |
| --- | --- |
| Application shell | Icon rail, header, drawer, content canvas |
| Brand mark | Shared geometric logo in rail and product identity |
| Icon rail | Primary shortcuts, separator, settings, account avatar |
| Product header | Identity, tabs, utilities, language, profile |
| Navigation drawer | Expandable groups and nested routes |
| Page heading | Title, supporting copy, page-level actions |
| Date range control | Icon, selected period, chevron |
| Primary report action | Report icon and label |
| Metric card | Title, help, value, delta, caption, optional spark bars |
| Chart card | Title, description link, download action, summary, area chart |
| Spark bars | Minimal vertical bar sequence with highlighted final bar |
| Filter tabs | Text-only tabs with active underline |
| Transaction table | Header, linked values, customer cell, status, overflow |
| Activity list | Avatar, event message, relative timestamp |
| Floating tool palette | Four theme/demo shortcut cells |

## 18. Interaction states implied but not visible

These are implementation requirements inferred from the controls, not details
directly shown in the screenshot:

- Header and drawer links need hover, keyboard-focus, active, and disabled states.
- Expandable drawer groups need open/closed chevrons and accessible disclosure state.
- Date range opens a date/range picker.
- Reports and Download Report need loading, success, and failure feedback.
- Chart needs an accessible text/table alternative and, if interactive, focusable
  data points or a keyboard-operable tooltip model.
- Filter tabs must update visible rows and expose selected state programmatically.
- Overflow ellipses need a menu with keyboard navigation.
- The account, notifications, language selector, and floating tools need tooltips or
  accessible labels because several are icon-only.
- Red/green meaning must retain arrows, dots, and text so color is never the only
  status signal.

## 19. Responsive translation

The screenshot supplies only a desktop state. The following is a safe translation,
not observed evidence:

- Large desktop: preserve both left rails and the two-column main grid.
- Medium desktop/tablet: collapse the white drawer, leaving the icon rail or a single
  menu trigger; stack the revenue and chart regions if they no longer fit legibly.
- Mobile: replace both rails with a compact top app bar and navigation drawer; stack
  every card; allow the transaction table to scroll horizontally or convert rows to
  labeled records; move the floating tool strip into a menu.
- Never compress the chart until all 30 day labels collide. Reduce tick frequency at
  narrower widths while preserving the data.

## 20. Fidelity checklist

Before calling a reconstruction faithful, compare it against the source at the same
1919 × 937 viewport and verify all of the following:

- [ ] 92 px indigo icon rail and approximately 311 px white drawer.
- [ ] 70 px header with active Overview underline.
- [ ] Correct logo placements and utility icon order.
- [ ] Drawer contains every visible label in the same order.
- [ ] Pale canvas begins beneath header and to the right of drawer.
- [ ] Main title/actions align with the card grid.
- [ ] First content row has matching left/right widths and 31 px inter-column gap.
- [ ] Revenue card contains two metrics and a 12-bar sparkline.
- [ ] Both small metric cards match values, deltas, captions, and six-bar sparklines.
- [ ] Sales chart matches labels, 30 ticks, saw-tooth rhythm, line, and filled area.
- [ ] Transaction header, filters, columns, and two complete visible rows match.
- [ ] Recent activity header, filters, and three visible entries match.
- [ ] Floating four-cell tool strip overlaps the right edge correctly.
- [ ] Borders are hairlines; cards do not acquire heavy shadows.
- [ ] Typography hierarchy relies on size/weight, not black or excessive bold.
- [ ] Semantic green/red includes a second non-color cue.
- [ ] The bottom crop does not lead to invented unseen content.

## 21. Known unknowns

The image alone cannot establish the exact font files, CSS breakpoints, component
library, icon package, hover/focus states, animation, chart data values, below-fold
content, or whether shell regions are fixed or sticky. Those details require the
original template source or explicit product decisions. All such points above are
labeled as inference rather than fact.
