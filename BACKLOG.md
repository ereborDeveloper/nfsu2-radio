# Backlog

Each task is a `task/...` branch with its own pull request into `master`.

| # | Branch | Task | Status |
|---|---|---|---|
| 1 | task/setup | Project setup: package.json, tsconfig, license, backlog | review |
| 2 | task/schedule | Station model and on-air position: types, track lists, schedule | todo |
| 3 | task/scan | Folder scan: durations and tags from mp3, ogg, flac, wav, stations.json | todo |
| 4 | task/player | Player and overlay: load, play in the game AudioContext, station switch, mount API | todo |
| 5 | task/test-page | Local test page and test server, README | todo |
| 6 | task/stream-channel | Channel type `stream`: external Icecast/HLS stream with now-playing metadata | todo |
| 7 | task/resilience | Prefetch the next track, retry with backoff on network loss, return to the on-air position | todo |
| 8 | task/level-match | Optional loudness normalisation between tracks | todo |

## Ideas

- Moderator admin (tokens, uploads, approval queue, audit log) as a separate service.
- Per-channel DJs and schedules.
