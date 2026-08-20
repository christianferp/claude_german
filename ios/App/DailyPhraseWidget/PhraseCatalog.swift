import Foundation

/// One phrase as the widget needs it.
struct CatalogPhrase: Codable {
    let id: String
    let text: String
    let translation: String
}

/// The bundled phrase list, so the widget can pick a phrase with no help from
/// the app.
///
/// `Generated/phrases.json` is emitted from `src/data/phrases.ts` by
/// `scripts/export-phrases.mjs` (wired into `npm run ios:sync`), so there is
/// one source of truth and the two cannot drift apart by hand-editing.
enum PhraseCatalog {
    /// language → level → phrases, matching the app's `PHRASES` shape.
    private static let pools: [String: [String: [CatalogPhrase]]] = {
        guard
            let url = Bundle.main.url(forResource: "phrases", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let decoded = try? JSONDecoder().decode([String: [String: [CatalogPhrase]]].self, from: data)
        else {
            // A missing or unreadable bundle resource means the file wasn't
            // added to the widget target's Copy Bundle Resources. The widget
            // still renders (placeholder copy) rather than crashing.
            return [:]
        }
        return decoded
    }()

    static func pool(language: String, level: String) -> [CatalogPhrase] {
        pools[language]?[level] ?? []
    }

    /// The phrase this date resolves to, using the app's own selection hash.
    ///
    /// Deliberately simpler than `usePhraseOfTheDay`: it cannot know which
    /// phrases have been mastered or whether the learner tapped "change
    /// phrase", because that state lives in the app and reaching it needs the
    /// App Group. On a fresh pool the two agree; once phrases are mastered
    /// they can differ, which is the accepted cost of running without the
    /// paid entitlement.
    static func phrase(language: String, level: String, dateISO: String) -> CatalogPhrase? {
        let pool = pool(language: language, level: level)
        guard !pool.isEmpty else { return nil }
        let index = DailyIndex.phraseIndex(
            dateISO: dateISO,
            seedKey: "\(language):\(level)",
            poolSize: pool.count
        )
        return pool[index]
    }

    static func flag(for language: String) -> String {
        switch language {
        case "de": return "🇩🇪"
        case "es": return "🇪🇸"
        default: return "🗣️"
        }
    }
}
