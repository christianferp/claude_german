import Capacitor
import Foundation
import WidgetKit

/// Publishes the app's current phrase selection where the widget can read it,
/// and nudges WidgetKit to redraw.
///
/// Why this is hand-written rather than `@capacitor/preferences`: that
/// plugin's `group` option is only a key *prefix* on `UserDefaults.standard`
/// (see its `Preferences.swift`), not an App Group suite, so nothing it writes
/// is visible to an extension. Reaching a widget needs
/// `UserDefaults(suiteName:)`, which is what this does — plus the
/// `reloadAllTimelines()` call, which is the part that makes the widget update
/// the moment the learner taps "change phrase" instead of at the next midnight.
///
/// On a free Apple ID there is no App Group entitlement, so the write lands
/// somewhere the widget can't see it. That is harmless and intentional: the
/// widget falls back to computing the phrase itself, and the same code starts
/// working once the entitlement is added.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise)
    ]

    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("json is required")
            return
        }

        guard let defaults = DailyPhraseShared.defaults else {
            // No suite at all — nothing to write to, but not an error worth
            // surfacing in the UI.
            call.resolve(["written": false])
            return
        }

        defaults.set(json, forKey: DailyPhraseShared.snapshotKey)
        WidgetCenter.shared.reloadAllTimelines()

        // Deliberately not claiming the widget can *see* this. Without the
        // entitlement `UserDefaults(suiteName:)` still hands back a usable
        // object backed by the app's own container, so there is no reliable
        // way to detect real sharing from this side — only the widget knows.
        call.resolve(["written": true])
    }
}
