/** ⌘ on Mac, Ctrl elsewhere — for the shortcut hints in menus. */
export const MOD_KEY = /mac/i.test(navigator.platform) ? '⌘' : 'Ctrl+'

/** ⌘. (Ctrl+. elsewhere): Figma's "hide UI" — only the bare chord, so
 *  ⌘⇧. and ⌥-variants stay free for the browser and the OS. */
export function isHideUiShortcut(e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>) {
  return e.key === '.' && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey
}
