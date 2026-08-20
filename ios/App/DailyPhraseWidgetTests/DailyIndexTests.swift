import XCTest

/// Proves the Swift phrase-selection hash agrees with the JavaScript one.
///
/// This is not a formality. The JS is `h = (h * 31 + charCode) | 0`, and a
/// port that uses a plain `Int` instead of a wrapping `Int32` disagrees with
/// the app on **170 of the 320** generated vectors — the widget would then
/// confidently show a different phrase than the app on most days. The vectors
/// come from `scripts/export-phrases.mjs`, which calls the real
/// `dailyPhraseIndex()`, so this compares against the actual implementation
/// rather than a restatement of it.
final class DailyIndexTests: XCTestCase {
    private struct Vector: Decodable {
        let dateISO: String
        let seedKey: String
        let poolSize: Int
        let expected: Int
    }

    private func loadVectors() throws -> [Vector] {
        let bundle = Bundle(for: Self.self)
        guard let url = bundle.url(forResource: "hash-vectors", withExtension: "json") else {
            XCTFail("hash-vectors.json is missing — add it to the test target's resources and run `npm run export-phrases`")
            return []
        }
        return try JSONDecoder().decode([Vector].self, from: Data(contentsOf: url))
    }

    func testMatchesJavaScriptVectors() throws {
        let vectors = try loadVectors()
        XCTAssertFalse(vectors.isEmpty, "expected generated vectors")

        for vector in vectors {
            let actual = DailyIndex.phraseIndex(
                dateISO: vector.dateISO,
                seedKey: vector.seedKey,
                poolSize: vector.poolSize
            )
            XCTAssertEqual(
                actual,
                vector.expected,
                "\(vector.dateISO) / \(vector.seedKey) / pool \(vector.poolSize)"
            )
        }
    }

    /// The hash must stay inside the pool for every vector — an out-of-range
    /// index would crash the widget on a real subscript.
    func testIndicesAreInRange() throws {
        for vector in try loadVectors() {
            let actual = DailyIndex.phraseIndex(
                dateISO: vector.dateISO,
                seedKey: vector.seedKey,
                poolSize: vector.poolSize
            )
            XCTAssertTrue((0..<vector.poolSize).contains(actual), "\(actual) outside 0..<\(vector.poolSize)")
        }
    }

    /// An empty pool must not divide by zero.
    func testEmptyPoolIsSafe() {
        XCTAssertEqual(DailyIndex.phraseIndex(dateISO: "2026-01-01", seedKey: "de:A1", poolSize: 0), 0)
    }

    /// A seed that drives the accumulator negative still yields a usable index
    /// — this is the `abs(Int32.min)` trap the widened conversion avoids.
    func testLongSeedDoesNotTrap() {
        let long = String(repeating: "phrase-of-the-day-", count: 32)
        let index = DailyIndex.phraseIndex(dateISO: long, seedKey: long, poolSize: 7)
        XCTAssertTrue((0..<7).contains(index))
    }

    /// The date string is the device's local calendar day, not UTC's.
    func testLocalDateISOFormat() {
        let date = Date(timeIntervalSince1970: 1_767_225_600) // 2026-01-01T00:00:00Z
        let utc = DailyIndex.localDateISO(date, timeZone: TimeZone(identifier: "UTC")!)
        XCTAssertEqual(utc, "2026-01-01")
        // Behind UTC, the same instant is still the previous day locally.
        let honolulu = DailyIndex.localDateISO(date, timeZone: TimeZone(identifier: "Pacific/Honolulu")!)
        XCTAssertEqual(honolulu, "2025-12-31")
    }
}
