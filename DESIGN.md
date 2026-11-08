---
name: 讯哨
description: A compact Chinese newsroom desk for monitoring X accounts and reviewing new posts.
colors:
  forest: "#163e3a"
  coral: "#d2684f"
  ink: "#1d2929"
  muted: "#586a60"
  line: "#e1e7e5"
  paper: "#f7f9f7"
  white: "#ffffff"
typography:
  display:
    fontFamily: "DM Sans, Noto Sans SC, Microsoft YaHei, sans-serif"
    fontSize: "31px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "DM Sans, Noto Sans SC, Microsoft YaHei, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "DM Sans, Noto Sans SC, Microsoft YaHei, sans-serif"
    fontSize: "14px"
    letterSpacing: "0"
  label:
    fontFamily: "DM Sans, Noto Sans SC, Microsoft YaHei, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0"
rounded:
  tag: "3px"
  field: "4px"
  control: "5px"
  panel: "6px"
spacing:
  tight: "8px"
  regular: "16px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 15px"
  button-primary-hover:
    backgroundColor: "#25534a"
  navigation-active:
    backgroundColor: "#2e5950"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    height: "41px"
  tag-new:
    backgroundColor: "#fbebe5"
    textColor: "#ac513c"
    rounded: "{rounded.tag}"
    padding: "4px 6px"
  panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
---

# Design System: 讯哨

## Overview

**Creative North Star: "新闻编辑台"**

The interface reads like a working newsroom desk: a fixed dark account rail beside a light, information-dense reporting surface. Its personality comes from editorial hierarchy, a timestamped feed, restrained green surfaces, and small coral signals for fresh or exceptional items. Counts and source details stay easy to scan.

The layout is built for repeated checks. A Chinese digest band with a user-triggered generation command leads the working area, followed by the latest-run overview strip. The feed keeps original posts in chronological rows, and a narrow right rail holds run details and settings. Compact tags distinguish new items.

**Key Characteristics:**

- Compact operational density with a clear reading order.
- Dark green navigation against a pale reporting canvas.
- Thin dividers and tonal surfaces, with very little shadow.
- Coral used sparingly for new-item and error cues.

## Colors

Deep green anchors navigation and the main command; pale neutrals keep long lists readable.

### Primary

- **Newsroom Forest** (`forest`): Sidebar background and primary check button.

### Secondary

- **Signal Coral** (`coral`): Heading punctuation and the timeline's new-item dots.

### Neutral

- **Editorial Ink** (`ink`): Main copy and field text.
- **Muted Slate Green** (`muted`): Supporting labels and descriptions.
- **Divider Mist** (`line`): Panel borders and row separators.
- **Canvas Paper** (`paper`): Main page background.
- **White Sheet** (`white`): Top bar, overview, and right-rail panels.

**The Signal Rule.** Keep coral in small marks and state cues so new activity remains noticeable among neutral rows.

## Typography

**Display Font:** DM Sans and Noto Sans SC, with Microsoft YaHei and sans-serif fallbacks.
**Body Font:** The same stack, with DM Sans especially visible in counts and timestamps.

**Character:** Bold, compact Chinese headings and crisp numeric readouts establish priority without oversized display treatment.

### Hierarchy

- **Display** (800, 31px, 1.2): Page heading; 27px at 700px and 24px at 510px.
- **Title** (700, 16px, 1.3): Feed heading; rail headings are smaller at 13px.
- **Body** (14px base): Interface copy; post summaries use 15px, 600, 1.8 and a 73ch maximum width, falling to 13px on small screens.
- **Label** (600, 11px): Captions, timestamps, statuses, and metadata.

**The Numeric Readout Rule.** Use DM Sans for prominent counts and feed times; keep prose in the shared bilingual stack.

## Layout

Desktop uses a 258px sticky sidebar and flexible main column. The main content caps at 1540px with horizontal padding that grows from 24px to 64px. The full-width digest band comes first, then a four-part overview strip. Below it, the reporting area splits into a fluid feed and 288px insight rail with a 31px gap.

At 1120px the insight rail narrows to 255px and the last overview metric wraps to a full row. At 850px the sidebar becomes a compact top region with account shortcuts. At 700px the feed and insight rail stack; at 510px the rail panels become one column and the check command becomes icon-only. Feed rows retain a time column, narrowed from 77px to 55px on small screens.

## Elevation & Depth

The system is nearly flat. White panels sit on pale paper, separated by thin borders; only the overview has a very faint ambient shadow (`0 5px 20px rgba(30,62,52,.035)`). Status dots have a small halo. There are no large floating surfaces or heavy shadows.

**The Divider Rule.** Use border and background contrast to structure dense information before adding elevation.

## Shapes

Controls and surfaces have modest corners: tags (3px), fields and icon grounds (4px), buttons and sidebar rows (5px), panels (6px). Avatars, status dots, and the toggle track are circular or pill shaped. Feed entries remain open rows divided by rules rather than individual cards.

## Components

### Buttons

- **Primary check:** Solid forest, white icon and label, 40px high with a 5px radius; hover shifts to a lighter green. Disabled controls reduce opacity.
- **Generate summary:** Dark coral with a sparkles icon, enabled when the current list has posts and an API key is configured. One click sends all visible posts in one request and creates one digest; an existing digest can be regenerated with a refresh icon.
- **Quiet actions:** Text and icon controls sit directly on the surface. Feed actions underline on hover; icon controls gain a subtle background in the sidebar.
- **Focus:** Buttons, links, and inputs use a 3px coral visible outline with a 3px offset.

### Chips

- **News tags:** Small 3px-radius labels mark new items with a soft coral fill and warm text.

### Cards / Containers

- **Overview and rail panels:** White, 6px radius, thin mist border. The overview divides metrics internally; rail panels use about 20px internal padding.
- **Chinese digest:** A full-width white band above the overview and feed, bounded by thin rules. One text block contains the generated overview with inline numbered source links. A collapsible list offers every original post. The empty state stays compact.
- **Feed rows:** Unframed, separated by a bottom rule and aligned to the timeline column.

### Inputs / Fields

- **Search:** Underlined, transparent 180px field beside the feed title; narrows to 120px on small screens.
- **Add account:** Light filled 4px field inside a dark sidebar form. The field carries an `@` prefix.

### Navigation

- **Account rail:** Dark forest with quiet labels, 41px primary nav rows, green active fill, and account avatars. On narrow screens it condenses into a top band with wrapping account shortcuts.

### Chronological Feed

Each post starts with a small coral timeline dot and time, followed by author, a new-item tag when relevant, a clamped original-text preview, source link, and an expandable full-text area. The full-text area uses a soft green background and preserves line breaks. The generated Chinese digest lives above the feed and is restored from browser localStorage.

## Do's and Don'ts

### Do:

- **Do** keep account navigation, current-run metrics, and post history visually distinct through position and dividers.
- **Do** reserve warm accent color for the timeline, fresh items, and exceptional status.
- **Do** keep source links and original text accessible from every feed entry.

### Don't:

- **Don't** turn each feed entry into a floating card; the implemented feed is a continuous chronological list.
- **Don't** use large shadows or rounded promotional blocks in the working area.
- **Don't** rely on color alone for new or failed states; retain the explicit labels and counts.
