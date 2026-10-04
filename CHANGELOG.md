# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions 1.x and 2.x were published in [volumio-artwork-theme](https://github.com/michaltamas/volumio-artwork-theme).

## [Unreleased]

### Added

- **Plugin updates where you see them.** The Plugins entry in Settings carries the number of installed plugins the store has a newer version of; the Installed tab says so too, with *Check for updates*, and each such plugin gets an *Update to x.y.z* button. The player decides what counts as newer (the beta too, in plugin test mode).
- **Keep the screen on while playing** (Settings → Appearance → This screen): a phone or tablet does not lock while music plays and the page is open — for following the lyrics, or a screen that is not the player's own. A choice of each browser. The Screen Wake Lock API only works on https, which the player does not serve, so a tiny silent video looping unseen does the holding, the way NoSleep.js does.

## [3.0.6] - 2026-10-03

### Changed

- **Much lighter to draw.** The blur under the sticky page head was twelve stacked blur layers, and every scroll blurred the band twelve times — on a phone without a strong GPU that alone took most of the drawing time, and the interface felt sluggish. It is one layer with a gradient mask now: the same look, about a quarter of the drawing work while a list scrolls.
- Zones has the same fixed head as the library's lists, with the blur under it.

### Fixed

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

[3.0.6]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.6
[3.0.5]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.5
[3.0.4]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.4
[3.0.3]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.3
[3.0.2]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.2
[3.0.1]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.1
[3.0.0]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.0
