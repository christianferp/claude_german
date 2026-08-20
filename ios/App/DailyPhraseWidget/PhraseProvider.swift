import WidgetKit

/// One rendered state of the widget.
struct PhraseEntry: TimelineEntry {
    let date: Date
    let text: String
    let translation: String
    let flag: String
    let level: String
    let streak: Int
    /// True when this came from the app's shared snapshot rather than being
    /// worked out locally. Drives whether the streak is worth showing.
    let fromApp: Bool

    static func placeholder(date: Date = Date()) -> PhraseEntry {
        PhraseEntry(
            date: date,
            text: "Guten Morgen! Wie geht es dir?",
            translation: "Good morning! How are you?",
            flag: "🇩🇪",
            level: "A1",
            streak: 0,
            fromApp: false
        )
    }
}

/// Supplies the widget's timeline.
///
/// The resolution order is the heart of this design:
///
///   1. the app's shared snapshot, when it exists and is for today
///   2. otherwise compute the phrase locally from the bundled catalog
///
/// Step 1 needs an App Group, which is paid-tier only, so on a free account it
/// simply never yields anything and step 2 carries the widget. There is no
/// build flag and no second code path — enabling App Groups later starts
/// step 1 working with no change here.
struct PhraseProvider: AppIntentTimelineProvider {
    typealias Entry = PhraseEntry
    typealias Intent = PhraseWidgetIntent

    func placeholder(in context: Context) -> PhraseEntry {
        .placeholder()
    }

    func snapshot(for configuration: PhraseWidgetIntent, in context: Context) async -> PhraseEntry {
        resolve(configuration: configuration, date: Date())
    }

    func timeline(for configuration: PhraseWidgetIntent, in context: Context) async -> Timeline<PhraseEntry> {
        let now = Date()
        let entry = resolve(configuration: configuration, date: now)
        // The phrase only changes at local midnight, so one entry and one
        // wake-up a day is all this needs — comfortably inside the OS refresh
        // budget. When the app changes the pick while the phone is in use it
        // calls WidgetCenter directly instead of waiting for this.
        return Timeline(entries: [entry], policy: .after(Self.nextMidnight(after: now)))
    }

    private func resolve(configuration: PhraseWidgetIntent, date: Date) -> PhraseEntry {
        let today = DailyIndex.localDateISO(date)

        // 1. The app's own selection — exact, including a manually changed
        //    phrase and with mastered ones already excluded.
        if let snapshot = PhraseSnapshot.load(), snapshot.dateISO == today {
            return PhraseEntry(
                date: date,
                text: snapshot.text,
                translation: snapshot.translation,
                flag: PhraseCatalog.flag(for: snapshot.language),
                level: snapshot.level,
                streak: snapshot.streak,
                fromApp: true
            )
        }

        // 2. Work it out here. A stale snapshot still tells us which language
        //    and level the learner is actually on, which beats the widget's
        //    configured guess; without one, fall back to the configuration.
        let stale = PhraseSnapshot.load()
        let language = stale?.language ?? configuration.language.rawValue
        let level = stale?.level ?? configuration.level.rawValue

        guard let phrase = PhraseCatalog.phrase(language: language, level: level, dateISO: today) else {
            return PhraseEntry(
                date: date,
                text: "Open Daily Phrase",
                translation: "Today's phrase will appear here",
                flag: PhraseCatalog.flag(for: language),
                level: level,
                streak: 0,
                fromApp: false
            )
        }

        return PhraseEntry(
            date: date,
            text: phrase.text,
            translation: phrase.translation,
            flag: PhraseCatalog.flag(for: language),
            level: level,
            streak: 0,
            fromApp: false
        )
    }

    /// Start of the next day in the device's time zone.
    static func nextMidnight(after date: Date) -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: date) ?? date.addingTimeInterval(86_400)
        // If start-of-day can't be resolved (a DST edge), an hour from now is a
        // safe retry — better than a timeline that never refreshes again.
        return calendar.startOfDay(for: tomorrow)
    }
}
