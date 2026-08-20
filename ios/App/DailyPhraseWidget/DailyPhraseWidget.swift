import SwiftUI
import WidgetKit

/// Tapping anywhere on the widget opens the app.
/// Handled by the `dailyphrase` URL scheme registered in the app's Info.plist.
private let deepLink = URL(string: "dailyphrase://today")

/// The widget's faces, one per size family.
///
/// Layout follows the mockup the web app already ships in
/// `src/screens/WidgetPreviewScreen.tsx`: a small label line, the phrase
/// itself as the prominent element, and the translation smaller underneath.
struct DailyPhraseWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PhraseEntry

    var body: some View {
        switch family {
        case .accessoryRectangular:
            // Lockscreen: monochrome and tight on space, so no flag or level
            // chrome — just the phrase and as much translation as fits.
            VStack(alignment: .leading, spacing: 1) {
                Text("PHRASE OF THE DAY")
                    .font(.system(size: 9, weight: .bold))
                    .widgetAccentable()
                Text(entry.text)
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(2)
                Text(entry.translation)
                    .font(.system(size: 11))
                    .lineLimit(1)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .containerBackground(.clear, for: .widget)
            .widgetURL(deepLink)

        case .systemMedium:
            content(phraseSize: 17, translationSize: 13, phraseLines: 3)
                .containerBackground(.fill.tertiary, for: .widget)
                .widgetURL(deepLink)

        default:
            content(phraseSize: 15, translationSize: 12, phraseLines: 4)
                .containerBackground(.fill.tertiary, for: .widget)
                .widgetURL(deepLink)
        }
    }

    private func content(phraseSize: CGFloat, translationSize: CGFloat, phraseLines: Int) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Text(entry.flag)
                    .font(.system(size: 11))
                Text(entry.level)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.secondary)
                Spacer(minLength: 0)
                // Only meaningful when the app published it; computing a
                // streak here is not possible, so it stays hidden otherwise
                // rather than showing a misleading zero.
                if entry.fromApp && entry.streak > 0 {
                    Text("🔥\(entry.streak)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.secondary)
                }
            }

            Text(entry.text)
                .font(.system(size: phraseSize, weight: .bold))
                .lineLimit(phraseLines)
                .minimumScaleFactor(0.8)
                .fixedSize(horizontal: false, vertical: true)

            Text(entry.translation)
                .font(.system(size: translationSize))
                .foregroundStyle(.secondary)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct DailyPhraseWidget: Widget {
    private let kind = "DailyPhraseWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: PhraseWidgetIntent.self,
            provider: PhraseProvider()
        ) { entry in
            DailyPhraseWidgetView(entry: entry)
        }
        .configurationDisplayName("Phrase of the Day")
        .description("Today's phrase and its translation, on your lockscreen or home screen.")
        .supportedFamilies([.accessoryRectangular, .systemSmall, .systemMedium])
    }
}

@main
struct DailyPhraseWidgetBundle: WidgetBundle {
    var body: some Widget {
        DailyPhraseWidget()
    }
}
