// Shared Sokoban solver — a small library of interchangeable search
// algorithms operating over the same (player, boxes) state space.
//
// All solve*(params) functions share one contract:
//   params: { grid, targets, player, boxes, maxStates, ...algorithm-specific }
//     grid:    string[][] of 'wall' | 'floor'
//     targets: Set<"r,c">
//     player:  { r, c }
//     boxes:   Set<"r,c">
//   returns: { found, path, statesExplored, timeMs }
//     path: array of { dr, dc } moves from the given start to a win state,
//           or null if not found within the given budget.
//
// "statesExplored" counts states expanded/generated so different algorithms
// can be compared apples-to-apples on search effort, not just wall-clock time.
(function (root, factory) {
  const lib = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = lib;
  } else {
    root.BoxmanSolver = lib;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const now = (typeof performance !== 'undefined' && performance.now)
    ? () => performance.now()
    : () => Date.now();

  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function key(r, c) { return r + ',' + c; }
  function parseKey(k) {
    const i = k.indexOf(',');
    return [Number(k.slice(0, i)), Number(k.slice(i + 1))];
  }
  function boxSetKey(set) { return [...set].sort().join('|'); }

  function makeIsWall(grid) {
    return function isWall(r, c) {
      if (r < 0 || r >= grid.length) return true;
      if (c < 0 || c >= grid[r].length) return true;
      return grid[r][c] === 'wall';
    };
  }

  function isWinBoxes(boxSet, targets) {
    for (const t of targets) if (!boxSet.has(t)) return false;
    return true;
  }

  // Attempts to move the player to (nr, nc), pushing a box if one is there.
  // Returns the resulting box set (same reference if nothing moved), or
  // null if the move is illegal (wall/box blocking the push).
  function tryStep(isWall, boxes, nr, nc, dr, dc) {
    const nk = key(nr, nc);
    if (!boxes.has(nk)) return boxes;
    const br = nr + dr, bc = nc + dc;
    if (isWall(br, bc) || boxes.has(key(br, bc))) return null;
    const nb = new Set(boxes);
    nb.delete(nk);
    nb.add(key(br, bc));
    return nb;
  }

  // Simple corner-deadlock check: a box not already on a target, wedged
  // against two perpendicular walls, can never be pushed again — any
  // state containing one is unsolvable and can be pruned outright.
  function makeDeadlockChecker(grid, targets) {
    const isWall = makeIsWall(grid);
    return function hasDeadlock(boxSet) {
      for (const bk of boxSet) {
        if (targets.has(bk)) continue;
        const [r, c] = parseKey(bk);
        const up = isWall(r - 1, c), down = isWall(r + 1, c);
        const left = isWall(r, c - 1), right = isWall(r, c + 1);
        if ((up && left) || (up && right) || (down && left) || (down && right)) return true;
      }
      return false;
    };
  }

  function manhattanBoxHeuristic(targets) {
    const targetList = [...targets].map(parseKey);
    return function h(boxSet) {
      let total = 0;
      for (const bk of boxSet) {
        if (targets.has(bk)) continue;
        const [br, bc] = parseKey(bk);
        let best = Infinity;
        for (const [tr, tc] of targetList) {
          const d = Math.abs(br - tr) + Math.abs(bc - tc);
          if (d < best) best = d;
        }
        total += best;
      }
      return total;
    };
  }

  function reconstructPath(cameFrom, startState, endState) {
    const path = [];
    let s = endState;
    while (s !== startState) {
      const info = cameFrom.get(s);
      path.push({ dr: info.dr, dc: info.dc });
      s = info.prev;
    }
    path.reverse();
    return path;
  }

  function neighbors(isWall, playerKey, boxes) {
    const [pr, pc] = parseKey(playerKey);
    const out = [];
    for (const [dr, dc] of DIRS) {
      const nr = pr + dr, nc = pc + dc;
      if (isWall(nr, nc)) continue;
      const newBoxes = tryStep(isWall, boxes, nr, nc, dr, dc);
      if (newBoxes === null) continue;
      out.push({ dr, dc, nr, nc, boxes: newBoxes });
    }
    return out;
  }

  // ---------------- Breadth-First Search ----------------
  // Explores states in order of move count, so the first solution found is
  // shortest by move count. Optionally prunes corner deadlocks.
  function solveBFS({ grid, targets, player, boxes, maxStates = 300000, deadlockPruning = false }) {
    const t0 = now();
    const isWall = makeIsWall(grid);
    const hasDeadlock = deadlockPruning ? makeDeadlockChecker(grid, targets) : null;
    const startPlayerKey = key(player.r, player.c);
    const startState = startPlayerKey + '/' + boxSetKey(boxes);
    if (isWinBoxes(boxes, targets)) return { found: true, path: [], statesExplored: 0, timeMs: now() - t0 };

    const cameFrom = new Map();
    const seen = new Set([startState]);
    let frontier = [{ playerKey: startPlayerKey, boxes: new Set(boxes), state: startState }];
    let explored = 0;

    while (frontier.length) {
      const next = [];
      for (const cur of frontier) {
        explored++;
        if (explored > maxStates) return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };
        for (const mv of neighbors(isWall, cur.playerKey, cur.boxes)) {
          if (hasDeadlock && hasDeadlock(mv.boxes)) continue;
          const nk = key(mv.nr, mv.nc);
          const nstate = nk + '/' + boxSetKey(mv.boxes);
          if (seen.has(nstate)) continue;
          seen.add(nstate);
          cameFrom.set(nstate, { prev: cur.state, dr: mv.dr, dc: mv.dc });
          if (isWinBoxes(mv.boxes, targets)) {
            return { found: true, path: reconstructPath(cameFrom, startState, nstate), statesExplored: explored, timeMs: now() - t0 };
          }
          next.push({ playerKey: nk, boxes: mv.boxes, state: nstate });
        }
      }
      frontier = next;
    }
    return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };
  }

  // ---------------- Bidirectional BFS ----------------
  // Grows a forward search from the start and a backward ("pull") search
  // from every valid goal configuration (boxes on targets, player on any
  // free floor cell) at the same time, and stops as soon as the two
  // frontiers meet. Dramatically cuts explored states vs. plain BFS because
  // the two searches only need to cover half the distance each.
  function solveBidirectionalBFS({ grid, targets, player, boxes, maxStates = 300000, deadlockPruning = false }) {
    const t0 = now();
    const isWall = makeIsWall(grid);
    const hasDeadlock = deadlockPruning ? makeDeadlockChecker(grid, targets) : null;
    const startPlayerKey = key(player.r, player.c);
    const startState = startPlayerKey + '/' + boxSetKey(boxes);
    if (isWinBoxes(boxes, targets)) return { found: true, path: [], statesExplored: 0, timeMs: now() - t0 };

    const targetsKey = boxSetKey(targets);

    // Forward search bookkeeping
    const cameFromF = new Map();
    const seenF = new Set([startState]);
    let frontF = [{ playerKey: startPlayerKey, boxes: new Set(boxes), state: startState }];

    // Backward search bookkeeping: any floor cell not covered by a target
    // (since in a goal state every target has a box on it) is a valid place
    // for the player to stand in a goal configuration.
    const cameFromB = new Map();
    const seenB = new Set();
    let frontB = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (isWall(r, c)) continue;
        const k = key(r, c);
        if (targets.has(k)) continue;
        const state = k + '/' + targetsKey;
        if (seenB.has(state)) continue;
        seenB.add(state);
        frontB.push({ playerKey: k, boxes: new Set(targets), state });
      }
    }
    if (seenF.has(...seenB) || seenB.has(startState)) {
      // start already coincides with a goal player position (rare) — handled below generically.
    }

    let explored = 0;

    function meetPath(meetState, boxesAtMeet) {
      const forwardPart = reconstructPath(cameFromF, startState, meetState);
      const backwardPart = [];
      let cur = meetState;
      while (cameFromB.has(cur)) {
        const info = cameFromB.get(cur);
        backwardPart.push({ dr: info.dr, dc: info.dc });
        cur = info.prev;
      }
      return forwardPart.concat(backwardPart);
    }

    // Check the trivial case where the start state is itself a backward root.
    if (seenB.has(startState)) {
      return { found: true, path: [], statesExplored: 0, timeMs: now() - t0 };
    }

    while (frontF.length && frontB.length) {
      // Expand the smaller frontier first — standard bidirectional-search cost saver.
      if (frontF.length <= frontB.length) {
        const next = [];
        for (const cur of frontF) {
          explored++;
          if (explored > maxStates) return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };
          for (const mv of neighbors(isWall, cur.playerKey, cur.boxes)) {
            if (hasDeadlock && hasDeadlock(mv.boxes)) continue;
            const nk = key(mv.nr, mv.nc);
            const nstate = nk + '/' + boxSetKey(mv.boxes);
            if (seenF.has(nstate)) continue;
            seenF.add(nstate);
            cameFromF.set(nstate, { prev: cur.state, dr: mv.dr, dc: mv.dc });
            if (seenB.has(nstate)) {
              return { found: true, path: meetPath(nstate), statesExplored: explored, timeMs: now() - t0 };
            }
            next.push({ playerKey: nk, boxes: mv.boxes, state: nstate });
          }
        }
        frontF = next;
      } else {
        const next = [];
        for (const cur of frontB) {
          explored++;
          if (explored > maxStates) return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };
          const [pr, pc] = parseKey(cur.playerKey);
          for (const [dr, dc] of DIRS) {
            const p2r = pr - dr, p2c = pc - dc;
            if (isWall(p2r, p2c)) continue;
            const p2 = key(p2r, p2c);

            // Case 1: predecessor made a plain (non-pushing) step.
            if (!cur.boxes.has(p2)) {
              const nstate = p2 + '/' + boxSetKey(cur.boxes);
              if (!seenB.has(nstate) && !(hasDeadlock && hasDeadlock(cur.boxes))) {
                seenB.add(nstate);
                cameFromB.set(nstate, { prev: cur.state, dr, dc });
                if (seenF.has(nstate)) {
                  return { found: true, path: meetPath(nstate), statesExplored: explored, timeMs: now() - t0 };
                }
                next.push({ playerKey: p2, boxes: cur.boxes, state: nstate });
              }
            }

            // Case 2: predecessor pulled a box from (player+dir) back to (player).
            const bAfterKey = key(pr + dr, pc + dc);
            if (cur.boxes.has(bAfterKey)) {
              const predBoxes = new Set(cur.boxes);
              predBoxes.delete(bAfterKey);
              predBoxes.add(cur.playerKey);
              if (!predBoxes.has(p2) && !(hasDeadlock && hasDeadlock(predBoxes))) {
                const nstate = p2 + '/' + boxSetKey(predBoxes);
                if (!seenB.has(nstate)) {
                  seenB.add(nstate);
                  cameFromB.set(nstate, { prev: cur.state, dr, dc });
                  if (seenF.has(nstate)) {
                    return { found: true, path: meetPath(nstate), statesExplored: explored, timeMs: now() - t0 };
                  }
                  next.push({ playerKey: p2, boxes: predBoxes, state: nstate });
                }
              }
            }
          }
        }
        frontB = next;
      }
    }
    return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };
  }

  // ---------------- Iterative Deepening DFS ----------------
  // Depth-first with an increasing depth cap; near-zero memory overhead
  // compared to BFS, but re-walks shared sub-paths every iteration, which on
  // Sokoban's highly transposable state space tends to cost far more states
  // explored than BFS/A* for the same level.
  function solveIDDFS({ grid, targets, player, boxes, maxStates = 300000, maxDepth = 200 }) {
    const t0 = now();
    const isWall = makeIsWall(grid);
    const startPlayerKey = key(player.r, player.c);
    if (isWinBoxes(boxes, targets)) return { found: true, path: [], statesExplored: 0, timeMs: now() - t0 };

    let explored = 0;
    let budgetExceeded = false;

    function dfs(playerKey, curBoxes, depth, limit, path, onPath) {
      if (budgetExceeded) return null;
      explored++;
      if (explored > maxStates) { budgetExceeded = true; return null; }
      if (depth > limit) return undefined; // signal: cut off, not a dead end
      let anyCutoff = false;
      for (const mv of neighbors(isWall, playerKey, curBoxes)) {
        const nk = key(mv.nr, mv.nc);
        const nstate = nk + '/' + boxSetKey(mv.boxes);
        if (onPath.has(nstate)) continue;
        if (isWinBoxes(mv.boxes, targets)) {
          path.push({ dr: mv.dr, dc: mv.dc });
          return path;
        }
        onPath.add(nstate);
        path.push({ dr: mv.dr, dc: mv.dc });
        const result = dfs(nk, mv.boxes, depth + 1, limit, path, onPath);
        if (result) return result;
        if (result === undefined) anyCutoff = true;
        path.pop();
        onPath.delete(nstate);
        if (budgetExceeded) return null;
      }
      return anyCutoff ? undefined : null;
    }

    const startState = startPlayerKey + '/' + boxSetKey(boxes);
    for (let limit = 1; limit <= maxDepth; limit++) {
      const onPath = new Set([startState]);
      const result = dfs(startPlayerKey, boxes, 1, limit, [], onPath);
      if (budgetExceeded) return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };
      if (result) return { found: true, path: result, statesExplored: explored, timeMs: now() - t0 };
      if (result === null) break; // exhausted the whole space with no cutoffs and no win — unsolvable
    }
    return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };
  }

  // ---------------- Binary min-heap (for A*) ----------------
  class MinHeap {
    constructor() { this.items = []; }
    get size() { return this.items.length; }
    push(item) {
      const a = this.items;
      a.push(item);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (a[p].f <= a[i].f) break;
        [a[p], a[i]] = [a[i], a[p]];
        i = p;
      }
    }
    pop() {
      const a = this.items;
      const top = a[0];
      const last = a.pop();
      if (a.length) {
        a[0] = last;
        let i = 0;
        while (true) {
          const l = 2 * i + 1, r = 2 * i + 2;
          let smallest = i;
          if (l < a.length && a[l].f < a[smallest].f) smallest = l;
          if (r < a.length && a[r].f < a[smallest].f) smallest = r;
          if (smallest === i) break;
          [a[smallest], a[i]] = [a[i], a[smallest]];
          i = smallest;
        }
      }
      return top;
    }
  }

  // ---------------- A* ----------------
  // Guided by a Manhattan-distance-to-nearest-target heuristic (sum over
  // boxes not yet on a target). This heuristic is not strictly admissible
  // when two boxes share a nearest target, so A* here trades the BFS
  // guarantee of a shortest move-count solution for a much smaller explored
  // state count — the benchmark page reports both states explored and
  // solution length so that trade-off is visible.
  function solveAStar({ grid, targets, player, boxes, maxStates = 300000, deadlockPruning = false }) {
    const t0 = now();
    const isWall = makeIsWall(grid);
    const hasDeadlock = deadlockPruning ? makeDeadlockChecker(grid, targets) : null;
    const h = manhattanBoxHeuristic(targets);
    const startPlayerKey = key(player.r, player.c);
    const startState = startPlayerKey + '/' + boxSetKey(boxes);
    if (isWinBoxes(boxes, targets)) return { found: true, path: [], statesExplored: 0, timeMs: now() - t0 };

    const gScore = new Map([[startState, 0]]);
    const cameFrom = new Map();
    const open = new MinHeap();
    open.push({ f: h(boxes), g: 0, playerKey: startPlayerKey, boxes: new Set(boxes), state: startState });
    let explored = 0;

    while (open.size) {
      const cur = open.pop();
      if (cur.g > (gScore.get(cur.state) ?? Infinity)) continue; // stale heap entry
      explored++;
      if (explored > maxStates) return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };

      for (const mv of neighbors(isWall, cur.playerKey, cur.boxes)) {
        if (hasDeadlock && hasDeadlock(mv.boxes)) continue;
        const nk = key(mv.nr, mv.nc);
        const nstate = nk + '/' + boxSetKey(mv.boxes);
        const ng = cur.g + 1;
        if (isWinBoxes(mv.boxes, targets)) {
          cameFrom.set(nstate, { prev: cur.state, dr: mv.dr, dc: mv.dc });
          return { found: true, path: reconstructPath(cameFrom, startState, nstate), statesExplored: explored, timeMs: now() - t0 };
        }
        if (ng < (gScore.get(nstate) ?? Infinity)) {
          gScore.set(nstate, ng);
          cameFrom.set(nstate, { prev: cur.state, dr: mv.dr, dc: mv.dc });
          open.push({ f: ng + h(mv.boxes), g: ng, playerKey: nk, boxes: mv.boxes, state: nstate });
        }
      }
    }
    return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };
  }

  // ---------------- IDA* ----------------
  // Same heuristic as A* but depth-first with an increasing f-bound instead
  // of a priority queue — near-zero memory overhead, at the cost of
  // re-exploring states across iterations.
  function solveIDAStar({ grid, targets, player, boxes, maxStates = 300000, deadlockPruning = false }) {
    const t0 = now();
    const isWall = makeIsWall(grid);
    const hasDeadlock = deadlockPruning ? makeDeadlockChecker(grid, targets) : null;
    const h = manhattanBoxHeuristic(targets);
    const startPlayerKey = key(player.r, player.c);
    if (isWinBoxes(boxes, targets)) return { found: true, path: [], statesExplored: 0, timeMs: now() - t0 };

    let explored = 0;
    let budgetExceeded = false;

    function search(playerKey, curBoxes, g, bound, path, onPath) {
      if (budgetExceeded) return Infinity;
      const f = g + h(curBoxes);
      if (f > bound) return f;
      explored++;
      if (explored > maxStates) { budgetExceeded = true; return Infinity; }

      let minExceed = Infinity;
      for (const mv of neighbors(isWall, playerKey, curBoxes)) {
        if (hasDeadlock && hasDeadlock(mv.boxes)) continue;
        const nk = key(mv.nr, mv.nc);
        const nstate = nk + '/' + boxSetKey(mv.boxes);
        if (onPath.has(nstate)) continue;
        if (isWinBoxes(mv.boxes, targets)) {
          path.push({ dr: mv.dr, dc: mv.dc });
          return 'FOUND';
        }
        path.push({ dr: mv.dr, dc: mv.dc });
        onPath.add(nstate);
        const result = search(nk, mv.boxes, g + 1, bound, path, onPath);
        if (result === 'FOUND') return 'FOUND';
        if (budgetExceeded) return Infinity;
        if (result < minExceed) minExceed = result;
        path.pop();
        onPath.delete(nstate);
      }
      return minExceed;
    }

    const startState = startPlayerKey + '/' + boxSetKey(boxes);
    let bound = h(boxes);
    const path = [];
    for (let iter = 0; iter < 1000; iter++) {
      const onPath = new Set([startState]);
      const result = search(startPlayerKey, boxes, 0, bound, path, onPath);
      if (result === 'FOUND') return { found: true, path: path.slice(), statesExplored: explored, timeMs: now() - t0 };
      if (budgetExceeded) return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };
      if (result === Infinity) return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };
      bound = result;
    }
    return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };
  }

  // ---------------- Monte Carlo Tree Search ----------------
  // UCB1 tree search with random rollouts, scored by a heuristic (boxes
  // landed on target, minus remaining Manhattan distance) since true wins
  // are sparse in random play. Included as a technique comparison point —
  // MCTS is built for large-branching stochastic domains, not small
  // deterministic combinatorial puzzles, so expect it to lag the informed
  // searches here; that gap is itself a useful benchmark result.
  function solveMCTS({ grid, targets, player, boxes, maxStates = 300000, rolloutDepth = 60, timeLimitMs = 8000 }) {
    const t0 = now();
    const isWall = makeIsWall(grid);
    const startPlayerKey = key(player.r, player.c);
    const startState = startPlayerKey + '/' + boxSetKey(boxes);
    if (isWinBoxes(boxes, targets)) return { found: true, path: [], statesExplored: 0, timeMs: now() - t0 };

    const targetList = [...targets].map(parseKey);
    const rows = grid.length;
    const cols = Math.max(...grid.map(r => r.length));
    const normalizer = Math.max(1, boxes.size * (rows + cols));

    function heuristicReward(boxSet) {
      let onTarget = 0, distSum = 0;
      for (const bk of boxSet) {
        if (targets.has(bk)) { onTarget++; continue; }
        const [br, bc] = parseKey(bk);
        let best = Infinity;
        for (const [tr, tc] of targetList) {
          const d = Math.abs(br - tr) + Math.abs(bc - tc);
          if (d < best) best = d;
        }
        distSum += best;
      }
      return Math.max(0, Math.min(1, (onTarget * (rows + cols) - distSum + normalizer) / (2 * normalizer)));
    }

    let idSeq = 0;
    function makeNode(state, playerObj, boxesSet, parent, moveFromParent) {
      return {
        id: idSeq++, state, player: playerObj, boxes: boxesSet, parent, moveFromParent,
        children: new Map(), untried: null, visits: 0, value: 0
      };
    }

    const root = makeNode(startState, { ...player }, new Set(boxes), null, null);
    let explored = 0;
    const C = 1.41421356; // sqrt(2), standard UCB1 exploration constant

    function uctSelect(node) {
      let best = null, bestScore = -Infinity;
      for (const child of node.children.values()) {
        const exploit = child.value / child.visits;
        const explore = C * Math.sqrt(Math.log(node.visits) / child.visits);
        const score = exploit + explore;
        if (score > bestScore) { bestScore = score; best = child; }
      }
      return best;
    }

    function pathToRoot(node) {
      const moves = [];
      let cur = node;
      while (cur.parent) { moves.push(cur.moveFromParent); cur = cur.parent; }
      moves.reverse();
      return moves;
    }

    function backprop(node, reward) {
      let cur = node;
      while (cur) { cur.visits++; cur.value += reward; cur = cur.parent; }
    }

    let winPath = null;
    const startTime = now();

    while (explored < maxStates) {
      if (now() - startTime > timeLimitMs) break;

      // Selection
      let node = root;
      while (node.untried !== null && node.untried.length === 0 && node.children.size > 0) {
        const nxt = uctSelect(node);
        if (!nxt) break;
        node = nxt;
      }
      if (node.untried === null) node.untried = neighbors(isWall, node.state.split('/')[0], node.boxes);

      // Expansion
      if (node.untried.length > 0) {
        const idx = Math.floor(Math.random() * node.untried.length);
        const mv = node.untried.splice(idx, 1)[0];
        const childState = key(mv.nr, mv.nc) + '/' + boxSetKey(mv.boxes);
        const child = makeNode(childState, { r: mv.nr, c: mv.nc }, mv.boxes, node, { dr: mv.dr, dc: mv.dc });
        node.children.set(mv.dr + ',' + mv.dc, child);
        explored++;
        if (isWinBoxes(mv.boxes, targets)) {
          winPath = pathToRoot(child);
          break;
        }
        node = child;
      }

      // Simulation (random rollout from `node`)
      let simPlayer = { ...node.player };
      let simBoxes = node.boxes;
      const rolloutMoves = [];
      let rolloutWin = false;
      for (let d = 0; d < rolloutDepth && explored < maxStates; d++) {
        const moves = neighbors(isWall, key(simPlayer.r, simPlayer.c), simBoxes);
        if (moves.length === 0) break;
        const mv = moves[Math.floor(Math.random() * moves.length)];
        simPlayer = { r: mv.nr, c: mv.nc };
        simBoxes = mv.boxes;
        rolloutMoves.push({ dr: mv.dr, dc: mv.dc });
        explored++;
        if (isWinBoxes(simBoxes, targets)) { rolloutWin = true; break; }
      }

      if (rolloutWin) {
        winPath = pathToRoot(node).concat(rolloutMoves);
        break;
      }

      backprop(node, heuristicReward(simBoxes));
    }

    if (winPath) return { found: true, path: winPath, statesExplored: explored, timeMs: now() - t0 };
    return { found: false, path: null, statesExplored: explored, timeMs: now() - t0 };
  }

  // ---------------- Registry ----------------
  // Single source of truth for what shows up in algorithm pickers and the
  // benchmark page. `run` always takes the shared params object above.
  const ALGORITHMS = [
    { id: 'bfs', label: 'BFS (breadth-first)', run: (p) => solveBFS(p) },
    { id: 'bfs-deadlock', label: 'BFS + deadlock pruning', run: (p) => solveBFS({ ...p, deadlockPruning: true }) },
    { id: 'bidirectional-bfs', label: 'Bidirectional BFS', run: (p) => solveBidirectionalBFS(p) },
    { id: 'iddfs', label: 'Iterative-deepening DFS', run: (p) => solveIDDFS(p) },
    { id: 'astar', label: 'A* (Manhattan heuristic)', run: (p) => solveAStar(p) },
    { id: 'astar-deadlock', label: 'A* + deadlock pruning', run: (p) => solveAStar({ ...p, deadlockPruning: true }) },
    { id: 'idastar', label: 'IDA*', run: (p) => solveIDAStar(p) },
    { id: 'idastar-deadlock', label: 'IDA* + deadlock pruning', run: (p) => solveIDAStar({ ...p, deadlockPruning: true }) },
    { id: 'mcts', label: 'Monte Carlo Tree Search', run: (p) => solveMCTS(p) }
  ];

  function getAlgorithm(id) {
    return ALGORITHMS.find((a) => a.id === id) || ALGORITHMS[0];
  }

  // Empirically the best all-around performer across the 15 built-in levels —
  // see benchmark.html. Bidirectional BFS solves every level BFS solves using
  // roughly a tenth of the explored states and wall-clock time, because both
  // halves of the search only have to cover half the distance.
  const DEFAULT_ALGORITHM_ID = 'bidirectional-bfs';

  return {
    key, boxSetKey, makeIsWall, isWinBoxes, tryStep, makeDeadlockChecker, manhattanBoxHeuristic,
    solveBFS, solveBidirectionalBFS, solveIDDFS, solveAStar, solveIDAStar, solveMCTS,
    ALGORITHMS, getAlgorithm, DEFAULT_ALGORITHM_ID
  };
});
