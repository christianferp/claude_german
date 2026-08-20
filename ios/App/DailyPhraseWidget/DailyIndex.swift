import Foundation

/// Swift port of `src/lib/dailyIndex.ts`.
///
/// The widget has to be able to pick the same phrase as the app on its own —
/// that is what makes it work without an App Group entitlement. So this must
/// agree with the JavaScript exactly, and `DailyIndexTests` checks it against
/// golden vectors generated from the real implementation
/// (`scripts/export-phrases.mjs`) rather than trusting that it does.
enum DailyIndex {
    /// Local calendar date as `YYYY-MM-DD`.
    ///
    /// The app uses `toLocaleDateString('sv-SE')`, which is that format in the
    /// device's own time zone — so the phrase flips at the user's local
    /// midnight, not UTC's. `en_US_POSIX` keeps the formatter from being
    /// reinterpreted under a non-Gregorian locale calendar.
    static func localDateISO(_ date: Date = Date(), timeZone: TimeZone = .current) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = timeZone
        return formatter.string(from: date)
    }

    /// Deterministic "phrase of the day" index for a date + seed.
    ///
    /// The JavaScript is `h = (h * 31 + seed.charCodeAt(i)) | 0`, and the two
    /// details in that line are the whole reason this function needs a test:
    ///
    /// 1. `| 0` truncates to a **signed 32-bit** integer on every iteration.
    ///    A plain `Int` here would diverge from the app on more than half of
    ///    all dates, because the running value passes 2^31 within a few
    ///    characters of a normal seed. Hence `Int32` with the overflow
    ///    operators `&*` / `&+`, which wrap instead of trapping.
    /// 2. `charCodeAt` yields **UTF-16 code units**, so iterate `utf16` rather
    ///    than `unicodeScalars`. Identical for the ASCII seeds used today, but
    ///    only one of them stays correct if a seed ever holds non-ASCII.
    static func phraseIndex(dateISO: String, seedKey: String, poolSize: Int) -> Int {
        guard poolSize > 0 else { return 0 }
        var hash: Int32 = 0
        for unit in "\(dateISO):\(seedKey)".utf16 {
            hash = hash &* 31 &+ Int32(unit)
        }
        // Widen before taking the magnitude: `abs(Int32.min)` would trap,
        // whereas JavaScript's `Math.abs` just yields 2147483648.
        return Int(abs(Int64(hash)) % Int64(poolSize))
    }
}
