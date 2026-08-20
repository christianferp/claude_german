import Foundation

/// Contract between the app and the widget extension.
///
/// **Add this file to BOTH targets** (app and widget) — they are separate
/// processes with separate containers, and this is the only thing they agree
/// on.
///
/// The App Group is how an extension reads the app's data, and Apple only
/// grants that entitlement to paid Developer Program members. Everything here
/// is written so that a *missing* entitlement is an ordinary empty result
/// rather than an error: on a free account `shared` simply never has a
/// snapshot, and the widget falls back to computing the phrase itself
/// (see `PhraseProvider`). Turning on App Groups later needs no code change.
enum DailyPhraseShared {
    /// Must match the App Group identifier ticked on both targets in Xcode.
    static let appGroup = "group.com.christianferp.dailyphrase"

    /// Key holding the JSON-encoded `PhraseSnapshot`.
    static let snapshotKey = "widget.phraseSnapshot"

    static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }
}

/// What the app publishes for the widget to draw.
///
/// This mirrors the state the web app already keeps: the pinned daily phrase
/// (`dailyPick` in the zustand store) resolved to its text, plus the language
/// and level it was chosen for. `dateISO` is the app's own local-date string,
/// used to tell "today's pick" from a stale one left over from a day the app
/// wasn't opened.
struct PhraseSnapshot: Codable {
    let phraseId: String
    let text: String
    let translation: String
    /// "de" / "es" — also selects the flag shown on the widget.
    let language: String
    /// "A1" … "B2".
    let level: String
    /// Local calendar date (YYYY-MM-DD) the pick belongs to.
    let dateISO: String
    /// Current streak, or 0. Shown only where there is room for it.
    let streak: Int

    static func load(from defaults: UserDefaults? = DailyPhraseShared.defaults) -> PhraseSnapshot? {
        guard
            let raw = defaults?.string(forKey: DailyPhraseShared.snapshotKey),
            let data = raw.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(PhraseSnapshot.self, from: data)
    }
}
