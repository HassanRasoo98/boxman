# Boxman

A small browser-based Sokoban (box-pushing puzzle) game. No build step, no dependencies — just open the HTML files in a browser.

▶️ **[Play the game](index.html)**
🛠️ **[Build your own levels](level-editor.html)**

## How to play

Push every crate onto a glowing target to clear the level.

| Action | Keys |
|---|---|
| Move | Arrow keys or `WASD` |
| Undo | `U` or `Backspace` |
| Reset level | `R` |
| Auto-solve | **Solve** button — searches for a solution from wherever you are and plays it out |
| Watch the AI play everything | **🏁 Speed Run** button — solves and plays every level back to back |

Your cleared-level progress is saved in the browser's local storage.

## Level editor

`level-editor.html` is a standalone visual tool for building new levels:

- Paint walls, trees, floor, targets, boxes, and the player onto a resizable grid
- Live box/target/player count validation
- **Test Play** mode with the same solver used in the game, so you can confirm a level is actually solvable before shipping it
- Export as ready-to-paste JS (matching the `LEVELS` array format in `index.html`) or download as `levels.json`
- Auto-saves your work-in-progress to local storage

To add levels built in the editor to the game, paste the exported array into the `LEVELS` constant near the top of the `<script>` block in `index.html`.

## Running locally

These are static files — no server required. Either:

- Open `index.html` directly in a browser, or
- Serve the folder so you can reach it from another device (phone/tablet) on your network:

  ```sh
  python3 -m http.server 8000
  ```

  Then visit `http://<your-computer's-LAN-IP>:8000/index.html` from any device on the same network.

## Project structure

```
index.html          the game
level-editor.html    the level editor
```

Levels are plain ASCII grids: `#` wall, ` ` floor, `.` target, `$` box, `@` player, `*` box already on a target, `+` player standing on a target.

## License

MIT — see [LICENSE](LICENSE).
