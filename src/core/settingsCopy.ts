/**
 * What the theme says differently on Volumio's own settings pages: shorter section names, a hint
 * under each row instead of an ⓘ, a verb on the buttons, and an order by how often a page is
 * visited. Everything is keyed by the page's section and item ids, never by their text — but a
 * new text only replaces the one Volumio sends in English (`from`): in another language the
 * player's own translation stays, and so does a text a later Volumio changes.
 */

export interface ItemCopy { from?: string; label?: string; hint?: string; button?: string }
export interface SectionCopy { from?: string; label?: string; icon?: string; items?: Record<string, ItemCopy> }
export interface PageCopy {
  /** section ids first in this order; the rest follow in the player's order */
  first?: string[];
  /** the page's core sections the theme does not show (the side column says it already) */
  dropCore?: string[];
  /** items moved out of their section into a card of their own, last on the page */
  ownCard?: Record<string, { id: string; label: string; icon: string; danger?: boolean }>;
  sections?: Record<string, SectionCopy>;
}

const PAGES: Record<string, PageCopy> = {
  'miscellanea-appearance': {
    sections: {
      language_selector: { icon: 'translate', items: { language: { from: 'Select Language', label: 'Language', hint: 'Interface language on every device.' } } },
    },
  },
  'system_controller-system': {
    first: ['language_selector', 'section_general_settings', 'section_updates'],
    dropCore: ['system-version'],
    ownCard: { factory: { id: 'aw_reset', label: 'Reset', icon: 'restart_alt', danger: true } },
    sections: {
      language_selector: {
        from: 'Language', label: 'Language and region', icon: 'translate',
        items: {
          language: { from: 'Select Language', label: 'Language', hint: 'Interface language on every device.' },
          timezone: { from: 'Select Timezone', label: 'Time zone', hint: 'Used by the alarm, sleep timer and ambient clock.' },
        },
      },
      section_general_settings: {
        from: 'General Settings', label: 'General', icon: 'build',
        items: {
          player_name: { from: 'Player Name', label: 'Player name', hint: 'How this player appears in zones, AirPlay and Spotify.' },
          startup_sound: { from: 'Startup Sound', label: 'Startup sound', hint: 'Plays a short chime when the player boots.' },
          config_wizard: { from: 'Run first config Wizard', label: 'Setup wizard', hint: 'Walks through output, network and sources again. Nothing is reset.', button: 'Run…' },
        },
      },
      section_updates: {
        from: 'System updates', label: 'Updates', icon: 'system_update',
        items: {
          update: { from: 'Check Updates', label: 'Check for updates', button: 'Check now' },
          factory: { from: 'Factory Reset', label: 'Factory reset', hint: 'Erases settings, plugins and playlists. Music on drives and NAS isn\'t touched.', button: 'Factory reset…' },
        },
      },
    },
  },
};

export function pageCopy(pluginName: string): PageCopy { return PAGES[pluginName] || {}; }

const same = (a: any, b: any) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

/** a section's own name, the theme's when Volumio sends the English one */
export function sectionLabel(c: SectionCopy | undefined, label: string): string { return c && c.label && (!c.from || same(c.from, label)) ? c.label : label; }

/** an item's label, hint and button text after the page's copy (the hint and the button only with the English label they were written for) */
export function itemCopy(c: ItemCopy | undefined, label: string): { label: string; hint?: string; button?: string } {
  if (!c || (c.from && !same(c.from, label))) { return { label }; }
  return { label: c.label || label, hint: c.hint, button: c.button };
}
