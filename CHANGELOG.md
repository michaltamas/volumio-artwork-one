# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions 1.x and 2.x were published in [volumio-artwork-theme](https://github.com/michaltamas/volumio-artwork-theme).

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

[3.0.3]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.3
[3.0.2]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.2
[3.0.1]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.1
[3.0.0]: https://github.com/michaltamas/volumio-artwork-one/releases/tag/v3.0.0
