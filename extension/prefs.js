// SPDX-License-Identifier: MIT
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { buildPreferences } from "./preferences.js";
export default class LiltPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    buildPreferences(window, this.getSettings());
  }
}
