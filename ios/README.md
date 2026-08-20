# iOS app + lockscreen widget

The iOS app is this exact web app in a Capacitor shell — same `dist/`, same
React code, no second UI. The widget beside it is the only native UI, because
iOS widgets have to be WidgetKit/SwiftUI; no web technology can provide one.

Nothing here changes the web workflow: `npm run dev` and the GitHub Pages
deploy are untouched.

## Day to day

```bash
npm run dev        # browser, unchanged — still the fast loop
npm run ios:sync   # build web + regenerate widget data + copy into ios/
npm run ios:open   # open Xcode, then press Run
npm run ios:dev    # run on device with hot reload from the Vite dev server
```

`ios:dev` points the phone's web view at the dev server over your LAN, so
edits show up on the device without a rebuild.

## One-time Xcode setup

The widget extension target has to be created in Xcode's GUI; the Swift for it
is already written and committed. In `ios/App/App.xcodeproj`:

1. **File ▸ New ▸ Target… ▸ Widget Extension.** Name it `DailyPhraseWidget`.
   Untick "Include Live Activity" and "Include Configuration App Intent" —
   the configuration intent is already written. Let Xcode activate the scheme.
2. **Delete the placeholder files** Xcode generates in the new group
   (`DailyPhraseWidget.swift`, its bundle file, `Assets.xcassets` is fine to
   keep), then **add the real ones** — right-click the group ▸ *Add Files*:
   - everything in `ios/App/DailyPhraseWidget/`
   - `ios/App/Shared/DailyPhraseShared.swift` — **also tick the App target**,
     both processes need it
3. Add `ios/App/DailyPhraseWidget/Generated/phrases.json` to the widget
   target's **Copy Bundle Resources**. Without it the widget renders
   placeholder text instead of phrases.
4. Set **iOS 17.0** as the minimum deployment target on both targets. (17,
   not 16: the widget uses an AppIntents configuration for its language/level
   picker, which is 17+.)
5. Select your Apple ID team on both targets, then Run.

Optional but recommended — the parity test that keeps the widget honest:

6. **File ▸ New ▸ Target… ▸ Unit Testing Bundle**, name it
   `DailyPhraseWidgetTests`, then add `ios/App/DailyPhraseWidgetTests/` to it
   plus `Generated/hash-vectors.json` as a resource, and make
   `DailyIndex.swift` visible to it (add to the test target too, or mark the
   widget target as its host). See "Why that test matters" below.

## Free vs paid Apple account

| | Free Apple ID | Paid Developer Program |
|---|---|---|
| Install the app | yes, expires after 7 days | yes, no expiry |
| Widget renders today's phrase | yes | yes |
| Widget matches the app exactly | no | yes |

The gap is **App Groups** — the only way an extension can read the app's data,
and Apple restricts it to paid members. So the widget is built to work without
it: `PhraseProvider` resolves

```
the app's shared snapshot  ??  compute the phrase locally
```

The local path uses a bundled copy of the phrase list and the app's own
selection hash, so it lands on the right phrase — it just can't know which
phrases you've mastered or whether you tapped "change phrase", so it can
disagree with the app once you've mastered some.

**Upgrading later needs no code change.** Tick **App Groups** on both targets
with the identifier in `DailyPhraseShared.appGroup`, and the snapshot the app
already writes (`WidgetBridgePlugin`) starts being visible — the widget then
shows your exact pinned phrase, mastered ones excluded, plus your streak.

## Why that test matters

The widget picks phrases with a Swift port of `dailyPhraseIndex()` from
`src/lib/dailyIndex.ts`. That function is
`h = (h * 31 + charCodeAt(i)) | 0` — and `| 0` truncates to a signed 32-bit
integer on every character. A port using a plain `Int` was measured to
disagree with the app on **170 of 320** dates, so the widget would confidently
show the wrong phrase most days.

`scripts/export-phrases.mjs` therefore emits golden vectors from the real
JavaScript, and `DailyIndexTests` asserts the Swift reproduces them. If that
test ever goes red, trust it over the widget.

## Generated files

`ios/App/DailyPhraseWidget/Generated/` is written by
`npm run export-phrases` (part of `ios:sync`) from `src/data/phrases.ts`. Don't
hand-edit it — that's the whole point of generating it.

## No Mac?

`.github/workflows/ios.yml` compiles the app and runs the parity tests on a
macOS runner, so native breakage is catchable without one. Getting an
installable build onto a phone from CI needs the paid account plus signing
secrets; the steps are listed at the bottom of that workflow.
