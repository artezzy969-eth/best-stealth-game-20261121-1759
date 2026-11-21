# best-stealth-game-20261121-1759

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/artezzy969-eth/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/artezzy969-eth/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

## Shadow Courier

**Shadow Courier** is an original top-down stealth game. Night shift at the
old Meridian depot: you are the courier nobody is supposed to see. Cross
three floors, collect every parcel, and slip out the green exit — while
guards sweep their lamps across the floor in visible vision cones.

Each guard patrols a fixed route you can learn. Step into a cone and the
guard grows suspicious, then gives chase; break line of sight, stay quiet,
and the alert fades so you can try again. Crouch to move slower, quieter
and harder to spot. Crates block sight, shadows hide you, and every
footstep makes noise that nearby guards can hear. The HUD shows your time,
score, level, visibility and noise meters, your stance, the alert state and
how many parcels are left — all readable at a glance while you play.

Nothing here is copied from any commercial game: the name, the depot, the
guards, the art and the sounds are all original. All art is drawn on the
canvas and all sound is generated with WebAudio — the game is plain static
files with no network requests.

## How to play

- **Goal:** collect every parcel on the floor, then reach the green exit.
- **Move:** `W` `A` `S` `D` or arrow keys.
- **Crouch:** hold `Shift` — slower, quieter, harder to spot in a vision cone.
- **Pause:** `P` or `Esc`. **Restart level:** `R`. **Mute:** `M`.
- **Mouse:** click the buttons on the title, pause, level-clear, win and
  caught screens.
- **Stay hidden:** vision cones are lit on the floor — never let one touch
  you while you stand in the open. Hide behind crates, wait in shadows,
  and move only when a patrol turns away. Being caught ends the run.
- **Three floors:** each floor adds more guards, tighter patrols and fewer
  shadows. A ghost run — never spotted once — earns the best score.

## Tips

- Watch a patrol all the way around once before you move: guards turn
  at fixed waypoints, and the gap behind a turning guard is your window.
- Crouching through a shadow is slower but almost invisible — use it to
  cross open floor, then stand and sprint only behind crates.
- Noise travels: running past a guard's back still gives you away, so
  walk (or crouch) whenever a guard is close, even outside their cone.

## Run it

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 in desktop Chrome and click
**Start the run**. Any static file server works — the game is plain
`game/index.html` plus `game/style.css` and the modules under `game/src/`.

## Layout

- `game/index.html` — page shell and HUD (title, win, caught,
  level-complete and pause screens).
- `game/style.css` — night-depot theme for the page, HUD and screens.
- `game/src/main.js` — game loop, input, guard AI, detection, win/lose.
- `game/src/levels.js` — the three floors: walls, cover, shadows, guards,
  parcels and exits.
- `game/src/audio.js` — WebAudio footsteps, alert stings and ambience.
- `screenshots/` — real renders of the game running in a browser.
- `main.ts` — builds `game/`, `screenshots/` and `dossier.json` to
  `/output` with `buildDossier` from `vendor/makefun-game.ts`.
- `vendor/makefun-game.ts` — the make.fun kit library, copied unchanged.

## License

MIT — see [LICENSE](LICENSE).

<sub>Entered on [make.fun](https://make.fun/?ref=06fzb26q&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
