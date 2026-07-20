# Add Russian UI localization (chrome.i18n) with locale parity CI

> **For maintainers:** copy this file into the GitHub PR description (or open the PR with `gh pr create --body-file PR_RUSSIAN_I18N.md`).  
> Longer-lived developer docs: [`docs/development/i18n.md`](docs/development/i18n.md).

---

## Summary

This PR adds **Russian UI localization** for Yomitan using the standard Chromium/Firefox extension i18n system (`chrome.i18n` / `_locales`), and introduces a **GitHub Action** that keeps non-English locale files in sync with English keys.

UI language follows the **browser UI language** (e.g. Russian browser UI → `ru` catalog). English remains the default locale and the fallback text in HTML.

It also wires **recommended dictionary descriptions** into the same locale system so every pack blurb is a normal `messages.json` key (translatable, CI-checked), instead of English-only JSON content.

---

## Related issues

There was **no prior GitHub issue** specifically tracking full Russian UI localization before this work.

This PR is intended as a **standalone, complete feature**:

- Russian UI via standard extension `_locales` / `chrome.i18n`
- Key-parity CI so future string additions do not silently leave `ru` behind
- Recommended-dictionary descriptions as `rec_dict_desc_*` keys (see below)

If maintainers prefer discussion-first for large features, I am happy to:

- Open a tracking issue and link it here, and/or
- Split the PR (e.g. i18n infrastructure + CI first, string catalog second)

**Out of scope / follow-ups (not blockers for this PR):**

- In-app language switcher (currently browser UI language only)
- Localizing dictionary **entry** content (definitions come from dictionary files)
- Additional languages beyond `en` + `ru` (infrastructure supports more folders)
- Playwright tests with an explicit Russian browser locale (not added in this PR)

---

## Motivation

Yomitan’s settings, popups, and related pages were English-only (hardcoded strings). Russian-speaking users benefit from a native interface for:

- Settings navigation and options
- Action popup / search / welcome / permissions / info
- Modals and templates (Anki markers, audio sources, shortcuts, consent, …)
- Context menu and selected dynamic JS messages
- Recommended dictionary list descriptions

A CI check prevents locale files from drifting when new English keys are added.

---

## What changed

### 1. Locale catalogs

| Path | Role |
|------|------|
| `ext/_locales/en/messages.json` | English message catalog (source of truth for keys) |
| `ext/_locales/ru/messages.json` | Russian translations (same key set as `en`) |

Includes:

- Extension name, description, toolbar title, command descriptions (`__MSG_…__` in the manifest)
- Settings / popup / templates UI strings
- Mixed HTML help text (`html_*` keys)
- Dynamic JS strings (`js_*` keys)
- Recommended dictionary descriptions (`rec_dict_desc_*` keys, ~124)

**Key parity:** `en` and `ru` share the same keys (verified with `npm run test:i18n`). A small set of intentional English-only tokens remain equal by design (product names, technical identifiers, font stacks, etc.).

### 2. Runtime i18n helpers

| File | Purpose |
|------|---------|
| `ext/js/language/i18n-util.js` | `getMessage`, DOM application of `data-i18n*`, `localizeCardFormatName` for default Anki tab names |
| `ext/js/dom/html-template-collection.js` | Localize template content when HTML templates are loaded |
| `ext/js/input/hotkey-help-controller.js` | Resolve `i18n:messageKey` placeholders in `data-hotkey` value templates |
| `ext/js/data/recommended-dictionary-i18n.js` | Resolve recommended dict description via `getMessage` |

**HTML attributes (English left as fallback text):**

- `data-i18n="key"` → `textContent`
- `data-i18n-html="key"` → `innerHTML` (for markup with `<a>`, `<em>`, `<code>`, etc.)
- `data-i18n-title` / `data-i18n-placeholder` / …
- `data-i18n-title-key` on `<html>` for document title

### 3. Manifest

`dev/data/manifest-variants.json`:

- `default_locale: "en"`
- Localized `name`, `description`, `action.default_title`, and command descriptions via `__MSG_*__`
- Dev builds use dedicated keys (`extensionNameDev`, `extensionDescriptionDev`) so the entire string stays a valid `__MSG_…__` replacement

### 4. Page entry points

`applyI18nToDocument()` is called early on:

- Action popup, settings, welcome, info, permissions, support
- Search, definition popup
- Generic pages (issues, legal, quick-start)
- Popup preview frame

### 5. Dynamic JS user-facing strings

Localized examples (non-exhaustive):

- Context menu: “Lookup in Yomitan” via `contextMenuLookup`
- Anki connection status, import steps, backup import/export messages
- Dictionary detail labels, update/delete status
- Recommended-settings change labels
- AnkiConnect generator progress/errors
- Parser source labels, “More info”, “Image”, etc.
- Default Anki card format **display** names (`Expression` / `Reading` / `Kanji` → localized labels via `localizeCardFormatName`; stored options names unchanged for custom formats)

English is kept as a **runtime fallback** if `getMessage` returns empty.

### 6. HTML / templates marked up

Localization attributes added across:

- `ext/settings.html`, `ext/action-popup.html`
- `ext/templates-modals.html`, `ext/templates-settings.html`, `ext/templates-display.html`
- `ext/welcome.html`, `ext/permissions.html`, `ext/info.html`, `ext/search.html`, `ext/popup.html`, `ext/popup-preview.html`
- `ext/quick-start-guide.html`, `ext/issues.html`, `ext/support.html`, `ext/legal.html`

Mixed content (text + inline tags) uses `data-i18n-html` so structure and links are preserved.

### 7. Recommended dictionary descriptions (i18n)

Descriptions in the “Recommended dictionaries” modal used to come **only** from English fields in content JSON. They are now normal locale messages so translators can localize them the same way as any other UI string.

| File | Role |
|------|------|
| `ext/data/recommended-dictionaries.json` | Source data (name, URL, English description, homepage) |
| `ext/data/recommended-dictionaries-i18n-keys.json` | Map: dictionary name → key `rec_dict_desc_…` |
| `ext/_locales/en/messages.json` | English texts for each `rec_dict_desc_*` key |
| `ext/_locales/ru/messages.json` | Russian translations (templates + hand-tuned popular packs) |
| `dev/bin/i18n-sync-recommended-dicts.js` | Sync when the recommended list changes |
| `ext/js/data/recommended-dictionary-i18n.js` | Lookup helper used at render time |
| `ext/js/pages/settings/dictionary-import-controller.js` | Loads the key map and applies `getMessage` per row |

**Flow for maintainers:**

1. Edit `recommended-dictionaries.json` if the pack list or English blurb changes.
2. Run `node dev/bin/i18n-sync-recommended-dicts.js`.
3. Translate new `rec_dict_desc_*` keys in non-English locales if needed.
4. Run `npm run test:i18n`.

**Key format:** `rec_dict_desc_<slug>_<8-char-sha1-prefix-of-name>` (stable, collision-safe). Runtime uses the committed name→key map; it does not re-derive hashes in the browser.

**Scale:** on the order of **~95** language codes in the content file and **~124** unique description keys (exact count is the length of the keys map).

Full detail: [`docs/development/i18n.md`](docs/development/i18n.md).

### 8. CI: i18n Check

**Workflow:** `.github/workflows/i18n-check.yml`  
**Script:** `dev/bin/i18n-check.js`  
**npm:** `npm run test:i18n`

| Trigger | Paths |
|---------|--------|
| `pull_request` / `push` to `master` | `ext/_locales/**`, `dev/bin/i18n-check.js`, workflow file |

**Behavior:**

1. Load `en/messages.json` keys
2. For each non-`en` locale under `ext/_locales/`:
   - **Fail** if keys are missing or JSON is invalid
   - Report lag in the job summary (e.g. missing *N* keys)
   - **Warn** when messages still match English (excluding brands/technical tokens)
3. On PRs: post/update a comment (`comment_tag: i18n-check`) with the summary
4. Job fails if any locale is missing keys → visible as a check on the PR

Adding a future locale (e.g. `de/`) only requires a new folder + `messages.json`; the same check applies automatically.

### 9. Maintainer tooling (dev only)

Helpers under `dev/bin/` used while building the catalog (extract / fill / fix mixed HTML). Not required at runtime. Notable scripts:

| Script | Purpose |
|--------|---------|
| `dev/bin/i18n-check.js` | Key parity (CI) |
| `dev/bin/i18n-sync-recommended-dicts.js` | Sync recommended-dict descriptions into locales |
| Other one-off `i18n-fix-*.js` | Historical QA gap fixes (safe to ignore for day-to-day work) |

Optional: `dev/i18n-ru-overrides.json`, `dev/run-i18n-ru.cmd`.

### 10. Developer documentation

| Path | Content |
|------|---------|
| `docs/development/i18n.md` | Architecture, attributes, recommended-dict pipeline, how to add strings, QA checklist |

---

## Manual QA notes (Firefox / Russian UI)

Issues found during manual Firefox testing and fixed on this branch include (non-exhaustive):

- Firefox data-transmission consent modal (paragraphs + Agree/Decline buttons)
- Audio / Anki privacy blurbs; mixed EN+RU hybrids from partial auto-translation
- Anki field-marker table descriptions; storage usage sentence with live size spans
- Native / standard keyboard shortcut help; Manage Extension Shortcuts label
- Empty dictionaries warning; full quick-start guide sections
- MeCab / `nativeMessaging` permission help
- Recommended dictionary descriptions + Wiktionary list blurb
- Syntax fix: block comment in `recommended-dictionary-i18n.js` must not contain raw `*/` sequences (e.g. globs)

---

## Testing

Per project contribution guidelines, changes should be validated with the repository’s continuous integration tests and local checks.

### Automated

| Check | Command / where | Result (author environment) |
|--------|------------------|-----------------------------|
| Locale key parity | `npm run test:i18n` | Pass — `ru` has all `en` keys |
| TypeScript (main) | `npx tsc --noEmit --project jsconfig.json` | Pass (after i18n-related typing fixes) |
| TypeScript (dev) | `npx tsc --noEmit --project dev/jsconfig.json` | Pass (CI failure on `i18n-*.js` fixed in a follow-up commit) |
| HTML validate | `npx html-validate "ext/**/*.html"` | Pass |
| Extension build (all variants, dry-run) | `npm run test:build` / `node dev/bin/build.js --dryRun --all` | Pass |
| ESLint (touched i18n/runtime files) | targeted `npx eslint …` | Pass |
| Full suite | `npm test` | Not fully re-run end-to-end after final polish; **CI on this PR is the source of truth** |
| Playwright | `npx playwright test` | Not completed successfully in the author environment; **please rely on GitHub Actions Playwright / integration jobs** |

CI also runs the new workflow:

- **i18n Check** (`.github/workflows/i18n-check.yml`) — fails if any non-`en` locale is missing keys vs `en/messages.json`; posts a PR summary; warns when messages still match English (excluding brands/technical tokens).

**Note:** Some fork CI jobs (e.g. CodSpeed benchmarks) may fail with **401 Unauthorized** when org secrets are unavailable; that is unrelated to this feature.

### Manual (UI i18n)

1. `npm ci` and load the extension unpacked from `ext/` (or build a target and load the package). Regenerate `ext/manifest.json` via the project build if needed (`ext/manifest.json` is not committed).
2. Set the **browser UI language** to Russian (restart/reload the browser if required).
3. Reload the extension (`chrome://extensions` / `about:debugging`).
4. Verify:
   - Action popup (enable toggle, labels, tooltips)
   - Settings: sidebar labels, main sections, mixed help text with links
   - Context menu item for selected text (Lookup in Yomitan)
   - Welcome / quick-start / permissions / search
   - Recommended dictionaries modal (localized descriptions for the active dictionary language list)
   - Firefox consent modal if applicable
5. Switch browser UI language back to English → UI strings return to English.

### What this does *not* cover

- Visual regression screenshots for Russian specifically
- Full Playwright dictionary-branch setup in the author environment
- Runtime language independent of browser locale

---

## Design notes / limitations

- **No in-app language switcher** — language is driven by browser locale (standard extension i18n).
- **Dictionary content** (definitions, tags from dict files) is unchanged; only extension chrome/UI strings are localized.
- **Recommended dictionary names** (e.g. “Jitendex”) stay as product names; only **descriptions** are translated.
- **Language transformers / dictionary language names** are a separate concern and not the focus of this PR.
- A few catalog entries intentionally remain identical to English (brand names, permission API names, font stacks, etc.).
- Some edge-case JS error strings may still be English; main user-facing surfaces are covered.
- `data-i18n-html` assigns `innerHTML` from **trusted extension locale files** only (not page/user content), with an eslint exception documented in code.
- Nested `data-i18n` inside a parent `data-i18n-html` message is not re-applied after `innerHTML` replace; full markup should live in the locale string.

---

## How to test (quick reference)

```bash
npm ci
npm run test:i18n
node dev/bin/i18n-sync-recommended-dicts.js   # only if recommended-dictionaries.json changed
npm run test:build   # optional dry-run all targets
# Load unpacked: ext/  (Chrome/Edge) after build/manifest generation as needed
# Or: node ./dev/bin/build.js --target firefox-dev  → builds/yomitan-firefox-dev.zip
```

Browser UI language → **Russian** → reload extension → check settings + action popup + recommended dictionaries.

---

## Checklist

- [x] Feature is standalone (Russian UI + locale parity CI + recommended-dict i18n)
- [x] Conventions follow existing extension patterns where practical (`chrome.i18n`, ES modules)
- [x] `npm run test:i18n` passes
- [x] Build dry-run / TypeScript / HTML checks run where possible
- [x] Manual test plan documented (browser UI language Russian)
- [x] Developer docs for i18n (`docs/development/i18n.md`)
- [ ] Full `npm test` / Playwright confirmed green on **this PR’s CI**
- [ ] No prior issue — open a tracking issue if maintainers request discussion-first process

---

## Related

- Extension i18n: [Chrome extension localization](https://developer.chrome.com/docs/extensions/reference/api/i18n)
- Developer guide: [`docs/development/i18n.md`](docs/development/i18n.md)
- Local check: `npm run test:i18n`
- Sync recommended dicts: `node dev/bin/i18n-sync-recommended-dicts.js`
- Workflow: `.github/workflows/i18n-check.yml`

---

## Screenshots (optional)

_Add screenshots of Settings (sidebar), Action popup, and Recommended dictionaries with browser UI language set to Russian if available._
