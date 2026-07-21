# Changelog

## 0.5.0

- Added a complete English/Chinese runtime internationalization layer.
- Changed the default interface language to English for new installs and v0.4.x migrations.
- Added a top-toolbar `Language` selector with immediate, no-reload switching between English and 中文.
- Persisted the selected language in extension settings and restored it on future page loads.
- Localized controls, routes, diagnostics, profile fields, status messages, HTTP 429 recovery, result tags, detail panels, seasonal fields, and industry-chain tables.
- Added bidirectional translation of cached warnings and calculated detail strings so switching language does not require refetching data.
- Added locale-aware number/date formatting and an updated eight-column responsive toolbar layout.
- Added language persistence, live-switch, dynamic-warning, and full English chain-detail regression tests; total automated coverage is now 64/64 passing.

## 0.4.1

- Fixed first-load `HTTP 429` failures caused by bursty multi-provider startup requests.
- Added per-provider serialized queues, duplicate-request coalescing, structured rate-limit errors, and persistent 429 cooldowns.
- Added `Retry-After` support and a five-minute fallback cooldown when a 429 omits the header; removed rapid retry loops.
- Added a separate five-minute gate for extension-initiated SimCompanies API calls while keeping static game assets independent.
- Added a document-start page-response buffer and corrected listener ordering so auth/ticker responses already loaded by the game are reliably reused.
- Changed optional account modifiers to observation/cache/neutral fallback instead of active startup requests.
- Added clean-install neutral-profile degradation when auth-data itself is rate-limited; affected results are explicitly marked estimated.
- Added stale-cache-on-429 behavior, sequential resource pagination, sequential provider loading, and one-shot UI auto-retry with a visible countdown.
- Added detailed source-aware errors and avoided trying equivalent trailing-slash endpoints after a rate-limit response.
- Added 14 rate-limit, cache, request-ordering, page-buffer, neutral-profile, and UI cooldown regression checks; total automated coverage is now 59/59 passing.

## 0.4.0

- Added recursive multi-stage recipe-graph expansion.
- Added globally optimized make-or-buy industry chains for exchange and retail terminals.
- Added Dinkelbach-style fractional optimization of cash cost plus total building levels.
- Added full-integration strategy for comparison with the global optimum.
- Added balanced per-hour production plans with fractional upstream levels, wages, purchases, and bottlenecks.
- Added chain route filtering, settings, diagnostics, tags, details, and upstream-name search.
- Added cycle detection, maximum-depth protection, bounded per-oracle LRU caching, retail warm starts, and coarse/local price search.
- Added UI yielding before expensive chain recalculation.
- Added exhaustive-policy regression tests, shared-upstream aggregation tests, bounded-cache regression tests, cycle-cutting-by-purchase tests, and multi-stage exchange/retail tests; total automated coverage is now 45/45 passing.

## 0.3.0

- Audited and replaced the incomplete v0.2.2 seasonal handling.
- Added five-minute refresh of current resource production rates.
- Added official per-realm production-event ingestion and active-window filtering.
- Added production-rate reconciliation that avoids double-counting modifiers already embedded in current `producedAnHour`.
- Added an explicit neutral-rate mode that refuses to fabricate a baseline when the modifier cannot be separated.
- Added Pumpkin annual production-season handling using the current source rate.
- Added the verified 2026 Ramadan, Easter, Summer, Halloween, and X-mas retail calendar with 11:00 UTC boundaries.
- Added current-executable vs off-season-planning filters for dedicated seasonal stores.
- Kept ordinary-store seasonal products such as Ramadan sweets available outside the dedicated-store filter.
- Added Summer weather to every evaluated Summer retail route.
- Clarified that current saturation drives the retail calculation; API demand is displayed for audit and is not multiplied again.
- Added 5%/hour compound-decay stress tests for Chocolate icecream and Apple icecream.
- Added Tree Q0-Q12 duration/input scaling and the manual 4%-per-researched-quality speed setting.
- Added detailed seasonal, event, decay, weather, calendar, and Tree audit fields in result details.
- Added seasonal confidence downgrades and current-season profile indicators.
- Added 12 seasonal regression tests; total automated coverage is now 34/34 passing.

## 0.2.2

- Added a lifecycle guard around all content-script extension API calls.
- Added automatic refresh of open SimCompanies tabs after extension install/update.
- Added an in-page recovery banner and reload button when automatic recovery is unavailable.
- Prevented context invalidation from being recorded as a caught `console.error`.
- Added version display, Q0–Q12 selection, and non-toggling market links.
- Added active-service teardown and restoration of the page fetch/XHR bridge after invalidation.
- Fixed the manual-refresh cooldown when reusing a still-fresh cached market snapshot.
- Added platform, background lifecycle, page-bridge, DOM integration, and Chromium smoke tests.

## 0.2.1

- Fixed missing account acceleration in production throughput and real-hour production wages.
- Added production-rate breakdown fields to result details.
- Added regression tests for acceleration scaling and a Steak-like fixture.

## 0.2.0

- Fixed the removed legacy market ticker endpoint.
- Added sequential lowest-price ticker → VWAP fallback.
- Added route coverage diagnostics and exclusion reasons.
- Added route filter and raised the default display limit to 500.
