// A deliberately small mock host for browser/UI tests. Not shipped with the plugin.
export const Command = "Command"
export const SettingsPage = "SettingsPage"
export const Slot = "Slot"
export const Style = "Style"
export const Store = { global: (_schema: unknown, initial: unknown) => ({ initial }) }
export const Plugin = { define: <T,>(definition: T) => definition }
