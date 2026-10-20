# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions 1.x and 2.x were published in [volumio-artwork-theme](https://github.com/michaltamas/volumio-artwork-theme).

## [3.2.8] - 2026-10-20

### Fixed

- **Play in this browser:** the switch sits top-right with the volume under it, so the name keeps its line on a narrow phone even at 100; the icon and the texts start at the top.
- **Zones & outputs:** only the content scrolls — the sheet's handle on the phone (the close button on wider screens) stays put.

## [3.2.7] - 2026-10-20

### Changed

- **Volume on the phone.** The cards in Zones & outputs get − and + either side of the slider, and the exact level top-right — a tap mutes. On this device − and + use Volumio's own *Volume steps* and *Max volume level*; holding one repeats. The slider drags from where it is — a tap on the track never jumps the volume — and the number follows at once without jumping back. Arrow keys step, Page Up/Down move by 10.
- **Play in this browser:** while the browser plays, its card carries the volume (the browser's own) and the device card says it is silent.
- **Bit-perfect** outputs (no mixer) show *FIXED* instead of a slider that does nothing.
- The cards' second line takes two lines before it shortens; the DSP card's settings button and preset follow the same sizes.

## [3.2.6] - 2026-10-19

### Added

- **Sources in the menu.** Appearance › Menu lists the library's sources with a *Show in menu* switch each — Randomizer, Tidal, Web Radio, Music Library, Albums… — and they appear in the rail and the phone's menu after Home and Music. Drag a row to change their order. Playlists and Favourites stay on unless switched off. The choice is kept on the player, for every screen.

### Changed

- **Searching a Music Library folder** searches the whole library with Volumio's search, as Manifest does, instead of filtering the folder's own rows. Artists, Albums and Genres still filter.
- **Text size on the display** now applies to the ambient screen too (all three layouts), not only to Now Playing; the large clocks keep their size.
- **The whole mini player track area** opens Now Playing, the empty space before the controls included.
- **Phone settings landing** shows the output on Playback Options again, and the connection on Network (Wired, or the Wi-Fi network's name).
- **The zone name** in the phone's Now Playing top bar sits beside the minimise chevron.

### Fixed

- **A browser's forced dark mode** (Opera's dark web pages, Chrome's auto dark mode) no longer inverts the white controls into dark ones: the theme declares its own colour scheme.
- **Format icons in the Now Playing plugin.** The plugin loads them from the active interface; Artwork One now ships them.
- **Menu logos** of streaming services are drawn in the menu's ink at the icons' size, readable in the light theme.

## [3.2.5] - 2026-10-15

### Changed

- **Settings, redesigned.** Every settings page is built from cards: a header with an icon, title and a line on what the section does, rows with a short hint under the label instead of an ⓘ, and a Save that turns into *Unsaved* with Cancel once something changes. The page head carries the plugin's version and author, Help and the Enabled switch. Volumio's own System and Appearance pages get shorter names, hints and a Reset card of their own (in English; other languages keep the player's translation).
- **Settings open where you left them.** On a wide screen Settings opens straight on the section visited last; on a phone the menu is the landing, with the Wi-Fi network, the version and waiting plugin updates on its rows.
- **Search in Settings.** The field at the top of the menu (⌘K) finds sections and single settings across Volumio's pages and the plugins'; the menu counts the hits per section, and a result opens its page and flashes the row.
- **Network drives** form checks the fields, fills an empty name from the path, and accepts an address typed as `smb://nas/music` or `\\nas\music`. It waits for the player's answer instead of closing at once.
- **Transport bars.** The order is the same everywhere: shuffle, previous, play, next, repeat. The Now Playing footer is three zones — up next on the left, the controls in the middle, volume, output and queue on the right — and the mini player follows the same layout. The heart sits at the end of the Cover / Info / Lyrics row and fills when the track is a favourite.
- **Remaining time on tap.** Tapping the total time under the seek bar switches it to the time remaining, and the choice is kept.
- **Track numbers** that MPD puts before a title (`03 - Title`) are left out of the Now Playing title. The genre moved to the Info face.
- **Queue: drag the whole row.** A track moves by dragging it anywhere (a mouse after a few pixels, a finger after holding it), without the handle.

### Added

- **Transparency switch.** Theme › Transparency turns the frosted glass off in this browser (it follows *Reduce transparency* in the system too), and Ambient › Transparency does the same on the player's own display — for slower screens.
- **Keys wake the ambient screen** can be turned off (Ambient settings), for displays with a remote or keyboard that should not end it.

### Fixed

- **Volumio app for Android:** the interface no longer leaves an empty band under the status bar and above the navigation bar; the app reserves that room itself.
- **The queue follows a move at once** on every screen; Volumio does not report the new position after a move, so the theme asks for it.
- **Plugin pages that never loaded** (Sources among them) open again.
- **I²S DACs** show their own name as the output instead of a stale "HDMI Out".
- **System update** shows that it is waiting for the player, with a Close and a message when nothing comes back in a minute.

## [3.2.4] - 2026-10-14

### Changed

- **Installed and enabled, Artwork One switches on.** The first start after an installation switches the player to Artwork One, once; later starts leave the choice alone, so someone who goes back to another interface stays there, and an update keeps whatever the player showed.
- **Long titles on the ambient screen wrap** instead of ending in an ellipsis after one line: the title takes up to three lines, the artist and the album up to two, in every layout.
- **Bandcamp and other plugins that dress titles as HTML** show plain text, as Nova does, instead of the markup (`<span style='color: …'>`). Entities are decoded (`&amp;` shows as `&`).

### Fixed

- **The ambient screen stays up when its settings change.** Saved from a phone or a computer, new settings used to take the player's display out of ambient for a minute (with Always) before they showed; they now apply in place, and turning the ambient screen off still takes it away.
- **No clock between tracks.** Volumio reports a moment of stop between two tracks (longer with streaming services); the ambient screen showed its idle clock and Now Playing its empty page for that moment. The last track now stays on the screen until a stop has lasted four seconds.
- **The Layout menu in Appearance opens wherever it is tapped**, not only on its text.
- **The Now Playing title no longer cuts the descenders** (g, y, p) of its second line.

## [3.2.3] - 2026-10-13

### Added

- **Pin the queue beside Now Playing.** In a window wider than 1100px the queue has a pin next to its close button. Pinned, the queue becomes a column of the page, edge to edge and full height, and Now Playing moves aside to make room instead of sitting under it. In the narrower column Shuffle, Repeat and Save as playlist become round icons (their tooltips name them) and Clear keeps its label. The queue button and UP NEXT put the pinned queue away and bring it back; it stays pinned, in this browser, until it is unpinned. Elsewhere and on phones the queue floats as before.
- Beside the pinned queue, when the bottom row runs out of room, the UP NEXT covers step aside first, then the Cover / Info / Lyrics switch, which shows Cover until there is room again (the choice is kept).

### Changed

- **The Now Playing title takes two lines at most.** A longer title ends in an ellipsis instead of pushing the page down over the controls; the full title is in its tooltip.

### Fixed

- **Credits and Open Source licenses** (Settings → System) opened an empty page. It now shows Volumio's credits page as Volumio's own interfaces do — contributors, licenses, the legal disclaimer and the GPL source offer, with the license texts — plus an Artwork One section listing the open-source packages the interface uses, in the settings frame with its own head. `node scripts/credits.mjs` rebuilds the page when a dependency changes.

## [3.2.2] - 2026-10-10

### Fixed

- **Check Updates answers again.** Settings → System → Check Updates showed nothing: the theme never listened to Volumio's updater. It now shows "Checking for updates", the answer ("already on the latest version", or a new version with Update now), the download with its progress, and the end with Restart system — as Volumio's own interfaces do.
- **Wi-Fi in the first-run wizard** connects the way Volumio's wizard does: over the player's own hotspot it waits for the end of the wizard before switching networks, so the phone doing the set-up is not cut off halfway, and the step shows "Connecting…" and the result.

### Changed

- **"Add a source" and "Manage" open Settings → Sources** directly, instead of the settings overview.
- **Home and Library tabs.** The tab row on Home and on the library page now reads Home · Library · and your sources, with the page you are on marked, as the rail does. Home used to show "Library" as its current tab, and the library page had no way back to Home in the row.

## [3.2.1] - 2026-10-09

### Changed

- **Folders as covers, the songs inside as rows.** The grid / list choice is now kept separately for lists of folders and albums, and for lists of songs. Browsing by folder with covers on, an album's tracks open as rows (rows by default; switch them to a grid and that is remembered for song lists only), and going back to the folders keeps the covers. Suggested by a user on the forum.

### Fixed

- **Plugin dialogs behave as in Volumio's own interfaces.** Progress dialogs (Storage Manager, Soloist Connect, install to disk) show their bar, follow the player's updates and show their buttons when done. A dialog button can open an address (the Spotify plugin's sign-in page) or a page, not only send a message, and a plugin can close its dialogs again (`closeAllModals`).
- **Plugin settings pages, checked against Volumio's own template.** Two or three choices show as a segment only when one of them is the value; otherwise the select shows the value's label. A button without an action and a section without a save call no longer send an empty call to the player. Field descriptions follow the player's "show descriptions" setting.
- **Plugin settings: a select shows its value instead of "Enter an address…".** A plugin may keep a number in its options and the same number as text in its settings (FusionDsp keeps the attenuation as "0"), or a value no option carries (a convolution filter named with `$samplerate$`). Values now compare as text, and a value without a matching option shows its own label, as Volumio's own interfaces do. Reported on the forum with FusionDsp.
- **Settings: the Playback Options tag on the settings page names the output by its value**, as the page's own select does. The label Volumio sends along with the value can be stale or belong to another card; one user saw "HDMI OUT" there while the right output was selected on the page itself.
- **Settings → Playback options: the DAC Model shows the DAC that is set.** Volumio hands back the I2S DAC's overlay, which several DACs share (R-PI DAC and BassFly-uHAT use the same one), and the select picked the first of them. It now goes by the name Volumio returns with it. Reported by balbuze.

## [3.2.0] - 2026-10-07

### Changed

- **Artwork One is a Volumio plugin** (`user_interface/artwork_one`): the interface under `ui/` and, in the same plugin, the settings the Companion used to keep. On start it registers the interface with Volumio; on stop or uninstall it takes the entry out and, if it was the active interface, switches the player to one of Volumio's own first — nobody is left on a page that no longer exists. Installs with `volumio plugin install`, and is being submitted to Volumio's plugin store. The installer script installs the same plugin and replaces an install made by the older script (`/data/artwork-ui` + the Companion), taking the settings over. After an update from the store, restart Volumio: the core starts an updated plugin only then, and Artwork One comes back as the active interface on its own. The Artwork One Companion plugin is retired.

## [3.1.0] - 2026-10-05

### Added

- **Plugin updates where you see them.** The Plugins entry in Settings carries the number of installed plugins the store has a newer version of; the Installed tab says so too, with *Check for updates*, and each such plugin gets an *Update to x.y.z* button. The player decides what counts as newer (the beta too, in plugin test mode).
- **Tooltips that explain.** Every icon-only control shows its name at once under the mouse — and a line on what it does where the icon is not obvious (*Shuffle: plays the queue in random order*). On a touch screen, a long press shows it.
- **A title cut short slides across** so the whole of it can be read: under the mouse for the row or tile, and on a touch screen after a long press on the text (a tap still opens or plays). In the library's rows and tiles, and in the mini player.
- **Search finds tracks in your playlists.** Volumio's search never looked inside them; the theme now does, and lists the matches as *Playlists* among the results: a playlist whose name matches (opens it), and each song found, with the playlist it is in, playable as any other.
- **A filter on album and playlist pages**, in the head, as the lists have: it narrows the tracks by title, artist or album. The lists' own filter matches artist and album now too, and on the Playlists list it also finds the songs inside the playlists (*Tracks in playlists*).
- **Ambient: Always.** Beside the idle delays, the display can rest in the ambient screen all the time — a touch brings the interface back for a minute. For a player watched from the phone, whose own screen is only ever looked at.
- **The display's own text size and volume**, in the Ambient display section (kept by the companion, as the ambient settings are): the player's own screen takes Now Playing's text size and the hidden volume from there.

## [3.0.6] - 2026-10-03

### Changed

- **Much lighter to draw.** The blur under the sticky page head was twelve stacked blur layers, and every scroll blurred the band twelve times — on a phone without a strong GPU that alone took most of the drawing time, and the interface felt sluggish. It is one layer with a gradient mask now: the same look, about a quarter of the drawing work while a list scrolls.
- Zones has the same fixed head as the library's lists, with the blur under it.

### Fixed

- A plugin's settings page failed ("This screen could not be shown", React error #62) when the plugin put a CSS string in an input's `style` attribute — Now Playing 1.1 does, on the fields that appear once a style is set to *custom*. Such attributes are turned into what React takes (a style object, `readOnly`, `maxLength`…).
- The ambient screen's cover has Now Playing's corners (11px, not 6).

- Now Playing in a short landscape window (a 1920×515 display): the hero's size containment collapsed it to no height, so a larger text column ran under the seek bar.

- A plugin's settings page no longer sits black while the player prepares it, or forever when the player sends nothing: it says *Loading settings…*, and after a few seconds without an answer explains that and offers *Try again*.
- A screen that fails to render no longer takes the whole interface down to a blank page: the rail and the player stay, the screen's place says what went wrong (with the error, to report), and offers Reload and Go back.
- Web Radio: the field at the top of its pages searches the radio directory (Bayern 3, 1LIVE…) instead of filtering the handful of categories on screen, where a station's name never matched. My Web Radios and Favorite Radios are still filtered, as any list of one's own.

## [3.0.5] - 2026-09-29

### Changed

- The library card in Settings → Sources: *Update* and *Rescan* sit side by side under the counts, at every width, instead of beside them; while the library is indexed the status takes their row.
- Home on the phone: *Pick up where you left off* is a line of its own, as *Pinned* and *Recent albums* are; under it the cover and, beside it, the title, the artist and *Resume*, in that order. The label used to wrap beside the cover, and the artist sat beside the button or under it depending on the name's length.

### Fixed


- On a phone or a tablet, a tap in the middle of an album's cover played the album instead of opening it: the play button, which a touch screen never shows, was still there to be hit. A tap on a tile now always opens it; a track or a station plays, as before. Playing a whole album is on its page and in the tile's menu.
- *Rescan* looks like the secondary button it is again; since 3.0.1 it was drawn like *Update*.
- On a tile with a favourite heart (Qobuz albums), the heart covered the whole cover: a click anywhere on it — the play button included — added the album to favourites instead of playing or opening it. The heart is back in its corner.
- Beside a service's *Genres* menu the list's own *Sort* button sat a few pixels higher, and on the phone it dropped to a line of its own. Both are one group on one line now.
- In a window about 730–790 px wide (a tablet upright), where the settings menu leaves the page little room: the functionality cards in Settings → Sources squeezed their names to a few letters, and a form row could run past the page's edge so the page slid sideways. The cards go one to a row there, and the form's controls are narrower, all by the same amount.

## [3.0.4] - 2026-09-29

### Added

- **Genre filter and sort order from the music service**, the way Volumio's own interfaces show them. When a service offers them for a page — Qobuz's *New Releases*, for example — a *Genres* menu (tick one or more) and a *Sort* menu sit beside the page's title. The choice replaces the page instead of stacking another step for Back.

## [3.0.3] - 2026-09-28

### Fixed


- A display connected to the player (HDMI, the Touch Display plugin) showed *Connection lost* and never connected. It opens the interface at `localhost:3000`, and the interface sent its connection to port 80, where nothing listens on the player itself. It now always connects to the address it was loaded from.

## [3.0.2] - 2026-09-28

### Fixed


- Last 100 showed a track twice when Volumio had kept it under two addresses (`music-library/…` and `mnt/…`, depending on where it was started), and both rows lit up as playing. Each file is now one row, where it was played last.

## [3.0.1] - 2026-09-28

### Fixed


- While Volumio indexes the library, the spinning icon its message points to ("the icon on bottom left") is there: at the foot of the side rail, above Zones, and in the phone's menu — *Updating library*, leading to Settings → Sources.
- Settings → Sources says so too: while the library is indexed, *Scanning your library…* takes the place of Update and Rescan, and the counts — in the card and in the Library panel beside it — grow as files are found.
- The library card in Settings → Sources no longer runs past its edge in a mid-sized window or with a big library's counts: the status goes under the counts, and the counts go two by two, when the card is narrow.

## [3.0.0] - 2026-09-28

Artwork One rebuilt from the ground up in React. Same look, same features, a new home — and what the old code base could not carry.

### Added

- **This browser** as an output: with the [browser playback plugin](https://github.com/michaltamas/volumio-browser-playback), the music plays on the phone or computer you hold while the player stays silent, with a spinner while the stream catches up, and the track and its controls on a phone's lock screen where the browser supports it.
- **Zones** in the side rail: this player, the other players on the network, multiroom groups and outputs on one page.
- **A side rail with labels**, opened and closed with one click and remembered; your playlists in the menu.
- **Connection lost**: when the player cannot be reached, a screen says so and how long, offers a reload after a minute, and the interface catches up the moment the player is back.
- **External sources**: AirPlay, the analog input, another app or a multiroom leader driving the player are named on Now Playing and in the mini player, and the transport stays off until they stop.
- **An empty Now Playing** with Browse, Search, Play the queue and the last tracks played.
- **Header summaries**: albums and playlists show their track count and running time.
- **Pull down to close** Now Playing on the phone; it follows the finger.
- One track list for every source — the library, Last 100, Favourites, Tidal, Spotify — with the same columns, quality badges and favourite buttons; the artists list counts albums and tracks.
- Switching the interface in Volumio's settings reloads every open screen into it.

### Changed

- Built with React and Vite instead of AngularJS: the release is a quarter of the size (1.8 MB instead of 7.8 MB), faster to open, with one stylesheet per part instead of layered theme overrides.
- The release archive is now `artwork-one.tar.gz`; the installer puts it in the same place as before, so 1.x and 2.x are replaced in place.

[3.2.8]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.2.8
[3.2.7]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.2.7
[3.2.6]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.2.6
[3.2.5]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.2.5
[3.2.4]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.2.4
[3.2.3]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.2.3
[3.2.2]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.2.2
[3.2.1]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.2.1
[3.2.0]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.2.0
[3.1.0]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.1.0
[3.0.6]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.6
[3.0.5]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.5
[3.0.4]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.4
[3.0.3]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.3
[3.0.2]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.2
[3.0.1]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.1
[3.0.0]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.0
