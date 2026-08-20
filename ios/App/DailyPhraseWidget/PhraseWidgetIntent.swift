import AppIntents

/// Which language the widget shows.
enum WidgetLanguage: String, AppEnum {
    case german = "de"
    case spanish = "es"

    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Language" }

    static var caseDisplayRepresentations: [WidgetLanguage: DisplayRepresentation] {
        [.german: "German 🇩🇪", .spanish: "Spanish 🇪🇸"]
    }
}

/// Which CEFR level's pool the widget draws from.
enum WidgetLevel: String, AppEnum {
    case a1 = "A1"
    case a2 = "A2"
    case b1 = "B1"
    case b2 = "B2"

    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Level" }

    static var caseDisplayRepresentations: [WidgetLevel: DisplayRepresentation] {
        [.a1: "A1", .a2: "A2", .b1: "B1", .b2: "B2"]
    }
}

/// Long-press ▸ Edit Widget settings.
///
/// This exists because of the App Group constraint. Without the paid
/// entitlement the widget cannot read which language and level the learner
/// picked in the app, and silently guessing would show the wrong phrase. So
/// the widget asks — which is the idiomatic iOS answer anyway, and lets one
/// person keep, say, a German A2 widget next to a Spanish A1 one.
///
/// Once an App Group is available the published snapshot wins over these
/// settings (see `PhraseProvider`), so they quietly become a fallback rather
/// than something to keep in sync by hand.
struct PhraseWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Phrase of the Day" }

    static var description: IntentDescription {
        IntentDescription("Choose the language and level to show while the app isn't sharing its own selection.")
    }

    @Parameter(title: "Language", default: .german)
    var language: WidgetLanguage

    @Parameter(title: "Level", default: .a1)
    var level: WidgetLevel
}
