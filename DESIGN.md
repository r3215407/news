---
name: 讯哨
description: A vivid Chinese news reading desk for monitoring X accounts and tracing each digest claim to its original post.
colors:
  ink: "#1b2927"
  red: "#c9462f"
  teal: "#126a66"
  paper: "#f5f7f5"
  mint: "#eaf2ee"
  line: "#d9e2dd"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Noto Serif SC, Songti SC, SimSun, serif"
    fontWeight: 700
    letterSpacing: "0"
  body:
    fontFamily: "DM Sans, Noto Sans SC, Microsoft YaHei, sans-serif"
    letterSpacing: "0"
rounded:
  control: "4px"
  avatar: "50%"
spacing:
  tight: "8px"
  regular: "16px"
  section: "28px"
---

# Design System: 讯哨

## Direction

**Creative north star: a live editorial reading page.** The page reads like a contemporary Chinese news edition while retaining the speed of an operations tool. Vermilion marks live signals and the digest boundary; deep teal identifies actions and source links. White reading surfaces, a cool paper canvas, and dark ink carry the long-form content. The interface avoids marketing imagery, decorative cards, gradients, and oversized dashboard chrome.

The first viewport puts the monitored accounts, the current news heading, the user-triggered Chinese digest, and the current-run counts in a clear reading order. A six-account default list makes the monitoring scope visible immediately. All source posts remain available below the digest.

## Layout

- Desktop: a 232px white account rail with a fine divider, a compact top status bar, and a content column capped at 1370px. The digest is a full-width editorial band, followed by a flat three-part count strip. The feed and insight rail split below.
- At 900px and narrower: the account rail becomes a short top section. Its account list is one horizontal scrolling row with an explicit All tab; the add-account control stays in the section heading.
- At 720px and narrower: feed and insights stack. At 600px and narrower: the check command becomes a 44px icon button, the feed search moves beneath its heading, and the three statistics remain equal-width tracks.
- The layout must fit 320px, 390px, and wide desktop without document-level horizontal scrolling. Long author names and source text truncate or wrap inside their own tracks.

## Typography And Color

- Noto Serif SC gives the masthead, page title, digest title, and feed title an editorial voice. Noto Sans SC and DM Sans keep controls and numerical readouts crisp.
- Ink `#1b2927` is the primary text; muted `#53635f` supports labels. Vermilion `#c9462f` is reserved for the masthead mark, the digest rule, new-item markers, and error states. Teal `#126a66` denotes links and secondary actions.
- Paper `#f5f7f5` surrounds white reading bands. The count strip uses a cool mint `#eaf2ee`, with thin dividers rather than a floating card.
- Letter spacing is zero. Buttons and framed controls use corners no larger than 4px.

## Components And States

- **Account navigation:** Desktop rows show avatar, name, handle, health dot, and a remove command. Mobile tabs show avatar and handle, use a red underline for selection, and maintain a visible next-tab hint while scrolling.
- **Digest:** One requested NVIDIA call produces one Chinese overview. Inline numbered citations open the corresponding X posts; an expandable source list provides the full set of originals. The existing digest can be regenerated manually.
- **Run strip:** New count, monitored accounts, and duplicates occupy three stable tracks. Mobile numbers and labels stay inside their columns at 320px.
- **Feed:** Continuous chronological rows with time, author, optional new marker, clamped original text, expandable full text, and direct X link. Rows are separated by rules, not cards.
- **Insight rail:** One unframed section shows run results. Failure counts remain textual rather than color-only.
- **Loading, empty, error, disabled:** Each state has explicit copy. The summary command is disabled without a configured key; an API error appears above the digest. Hover, touch, and keyboard focus are all visible.

## Interaction

The mobile account row is the signature interaction: switching sources is a direct horizontal action while the reading column stays fixed. The account list is scrollable rather than wrapping into uneven rows. A source citation in the digest opens the original post in a new tab. Motion is limited to the activity spinner and small control transitions; reduced-motion settings disable them.

## Boundaries

- Preserve the 24-hour recency window and the five-post fetch limit per account. A check runs only when requested by the user.
- Keep account and digest persistence in browser localStorage; the visual redesign does not change data ownership.
- Do not add background email delivery or imply that monitoring continues with the page closed.
