/**
 * The plugin store names its icons after FontAwesome 4 ("fa-plug"); the theme draws Material
 * Symbols. One table from the one to the other, with a puzzle piece for the names it lacks.
 */
const TABLE: Record<string, string> = {
  plug: 'power', cube: 'deployed_code', cubes: 'view_in_ar', music: 'music_note', headphones: 'headphones', cog: 'settings', cogs: 'settings', gear: 'settings', gears: 'settings',
  sliders: 'tune', television: 'tv', tv: 'tv', wifi: 'wifi', bluetooth: 'bluetooth', 'bluetooth-b': 'bluetooth', spotify: 'music_note', server: 'storage', database: 'database',
  'clock-o': 'schedule', clock: 'schedule', 'moon-o': 'bedtime', cloud: 'cloud', microchip: 'memory', terminal: 'terminal', code: 'code', 'lightbulb-o': 'lightbulb', desktop: 'desktop_windows',
  laptop: 'laptop', 'file-audio-o': 'audio_file', 'file-o': 'description', globe: 'language', key: 'key', lock: 'lock', unlock: 'lock_open', 'external-link': 'open_in_new', usb: 'usb',
  'hdd-o': 'storage', rss: 'rss_feed', podcast: 'podcasts', youtube: 'smart_display', 'youtube-play': 'smart_display', soundcloud: 'cloud', 'bar-chart': 'bar_chart', flask: 'science',
  microphone: 'mic', bell: 'notifications', 'bell-o': 'notifications', 'power-off': 'power_settings_new', 'sun-o': 'light_mode', random: 'shuffle', magic: 'auto_fix_high', 'toggle-on': 'toggle_on',
  android: 'android', apple: 'phone_iphone', camera: 'photo_camera', heart: 'favorite', star: 'star', list: 'list', 'list-ul': 'list', 'list-alt': 'list_alt', book: 'book', 'info-circle': 'info',
  'question-circle': 'help', user: 'person', users: 'group', tag: 'label', tags: 'sell', refresh: 'refresh', download: 'download', upload: 'upload', th: 'grid_view', 'th-large': 'grid_view',
  bars: 'menu', fire: 'local_fire_department', gamepad: 'sports_esports', mobile: 'smartphone', 'volume-up': 'volume_up', 'volume-off': 'volume_off', bolt: 'bolt', flash: 'bolt', signal: 'signal_cellular_alt',
  exchange: 'swap_horiz', arrows: 'open_with', 'arrows-alt': 'open_in_full', 'paint-brush': 'brush', 'picture-o': 'image', image: 'image', film: 'movie', 'video-camera': 'videocam', calendar: 'calendar_month',
  map: 'map', 'map-marker': 'location_on', home: 'home', envelope: 'mail', 'envelope-o': 'mail', comment: 'chat', comments: 'forum', wrench: 'build', tachometer: 'speed', 'line-chart': 'show_chart',
  'puzzle-piece': 'extension', rocket: 'rocket_launch', leaf: 'eco', tint: 'water_drop', thermometer: 'device_thermostat', 'thermometer-half': 'device_thermostat', eye: 'visibility', 'keyboard-o': 'keyboard',
  print: 'print', search: 'search', link: 'link', 'share-alt': 'share', 'sign-in': 'login', 'sign-out': 'logout', shield: 'shield', bug: 'bug_report', github: 'code', google: 'public', amazon: 'shopping_cart',
  windows: 'desktop_windows', linux: 'terminal', play: 'play_arrow', 'play-circle': 'play_circle', pause: 'pause', stop: 'stop', forward: 'fast_forward', backward: 'fast_rewind', 'step-forward': 'skip_next',
  'volume-down': 'volume_down', 'circle-o-notch': 'progress_activity', spinner: 'progress_activity', 'align-left': 'format_align_left', 'align-center': 'format_align_center', font: 'text_fields',
  'text-width': 'format_size', language: 'translate', 'magnet': 'attractions', 'compass': 'explore', 'bullhorn': 'campaign', 'trophy': 'emoji_events', 'gift': 'redeem', 'flag': 'flag', 'inbox': 'inbox',
  'folder': 'folder', 'folder-open': 'folder_open', 'archive': 'inventory_2', 'cloud-download': 'cloud_download', 'cloud-upload': 'cloud_upload', 'sitemap': 'account_tree', 'dot-circle-o': 'radio_button_checked',
  'circle': 'circle', 'square': 'square', 'asterisk': 'emergency', 'cutlery': 'restaurant', 'coffee': 'coffee', 'beer': 'sports_bar', 'car': 'directions_car', 'plane': 'flight', 'bed': 'bed', 'child': 'child_care',
  'paw': 'pets', 'eyedropper': 'colorize', 'adjust': 'contrast', 'crop': 'crop', 'expand': 'open_in_full', 'compress': 'close_fullscreen', 'window-maximize': 'web_asset', 'chrome': 'public', 'firefox': 'public',
  'hashtag': 'tag', 'percent': 'percent', 'calculator': 'calculate', 'id-card': 'badge', 'address-book': 'contacts', 'handshake-o': 'handshake', 'balance-scale': 'balance', 'plug-o': 'power',
};

export function pluginIcon(fa?: string): string {
  const s = String(fa || '').trim();
  const name = s.split(/\s+/).map(c => c.replace(/^fa-/, '')).find(c => c && c !== 'fa' && !/^fa-?(lg|\dx|fw)$/.test(c) && TABLE[c]);
  return name ? TABLE[name] : 'extension';
}
