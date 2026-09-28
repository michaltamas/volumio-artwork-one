# Notice

## What the MIT License covers

The [MIT License](LICENSE) in this repository applies to the work of this project: the interface under `src/`, the companion plugin under `plugin/`, the scripts under `scripts/`, the build configuration and the documentation — with the exceptions listed below.

## Files that come from Volumio

Artwork One began as a theme of [Volumio2-UI](https://github.com/volumio/Volumio2-UI), Volumio's AngularJS interface (see [volumio-artwork-theme](https://github.com/michaltamas/volumio-artwork-theme)). Version 3 is a new implementation in React, but it talks to the same player and shows the same pages, so a few pieces come from Volumio. They are © Volumio and its contributors, are not relicensed by this project and remain under the terms of their authors:

| Path | What it is |
|---|---|
| `public/myvolumio-tos.html` | The MyVolumio terms of use, shown when signing up to MyVolumio |
| `public/app/assets-common/` | Icons of Volumio's interface (MyVolumio avatar and badge, checkbox ticks, the collapse indicator) |
| `public/assets/wifi-icons/` | Volumio's Wi-Fi signal icons |
| `src/core/myvolumio/firebase.ts` | The public client configuration of Volumio's MyVolumio service, as Volumio's own interface ships it |

The layout rules for pages whose markup Volumio's backend and plugins define (settings, plugin pages, MyVolumio, the setup wizard) follow Volumio's interface and [Bootstrap 3](https://getbootstrap.com/docs/3.4/) (MIT), which that markup was written for.

## Fonts and icons

The theme bundles these typefaces and icons. Their full license texts are in [`licenses/`](licenses/).

| Asset | Used for | License |
|---|---|---|
| [Figtree](https://github.com/erikdkennedy/figtree) © The Figtree Project Authors | Interface text | SIL Open Font License 1.1 — [text](licenses/Figtree-OFL.txt) |
| [Space Mono](https://github.com/googlefonts/spacemono) © The Space Mono Project Authors | Labels, timecodes, technical details | SIL Open Font License 1.1 — [text](licenses/SpaceMono-OFL.txt) |
| [Lato](https://www.latofonts.com) © Łukasz Dziedzic | The setup wizard, as in Volumio's interface | SIL Open Font License 1.1 — [text](licenses/Lato-OFL.txt) |
| [Material Symbols Rounded](https://github.com/google/material-design-icons) © Google | Icons | Apache License 2.0 — [text](licenses/MaterialSymbols-LICENSE.txt) |

## Trademarks

Volumio is a trademark of its respective owner. This project is independent and not affiliated with Volumio.
