# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Next.js, as requested.

## Users
The initial user monitors selected X accounts and reviews newly published posts in a web page.

## Product Purpose
Fetch the five newest posts per account, let the user generate a Chinese digest on demand, and avoid reporting previously displayed posts during the running server session. Email notification is a future capability.

## Operating Context
The initial source is `@thsottiaux` via the supplied FxTwitter profile statuses endpoint. The account list can grow through the page. A post counts as reported when it enters the news list; summarization is a separate user action.

## Capabilities and Constraints
- Fetch at most the first five statuses returned for each account on each check, regardless of the API's returned count.
- Show and summarize only statuses published within the previous 24 hours; exclude older statuses and expire already reported entries from the page.
- Save the monitored account list in browser localStorage and restore it when the page opens. Keep seen IDs and digest entries in server memory only; those reset on server restart.
- Generate Chinese summaries through NVIDIA's `nvidia/nemotron-3.5-bolt-e4b` only after the user clicks the button. Store generated summaries by status ID in browser localStorage; news checks never call the model.
- Do not send email in this version.

## Evidence on Hand
- Live FxTwitter response has `results`, status `id`, `text`, `created_at`, `url`, `author`, and optional `quote`. The supplied `count=5` request returned more than five results when checked, so the application must slice the result itself.

## Product Principles
- Distinguish new items from already reported items clearly.
- Keep source links and original text available for verification.
- Make adding another monitored account a short, obvious action.
