// Shared level data for Boxman — used by index.html, benchmark.html, and
// anything else that needs the canonical level set. Extracted so it's not
// duplicated between the game and the benchmark harness.
(function (root, factory) {
  const data = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = data;
  } else {
    root.BOXMAN_LEVELS = data.LEVELS;
    root.BOXMAN_SOLUTIONS = data.SOLUTIONS;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const LEVELS = [
    // Level 1 - built and verified in the level editor
    [
      "###########",
      "###########",
      "####.######",
      "#### ######",
      "####$ $.###",
      "##. $@#####",
      "#####$#####",
      "#####.#####",
      "###########",
      "###########",
      "###########"
    ],
    // Level 2 - built and verified in the level editor
    [
      "###########",
      "###########",
      "##  @######",
      "## $$######",
      "## $ ###.##",
      "#### ###.##",
      "####    .##",
      "###   #  ##",
      "###   #####",
      "###########",
      "###########"
    ],
    // Level 3 - built and verified in the level editor
    [
      "###########",
      "######    #",
      "###  #    #",
      "## @$#    #",
      "###$ ##   #",
      "### $ #   #",
      "##.$  #   #",
      "##..*.#   #",
      "#######   #",
      "###########",
      "###########"
    ],
    // Level 4 - built and verified in the level editor
    [
      "###########",
      "###########",
      "###@ ######",
      "### $  ####",
      "#### # ####",
      "##.# #  ###",
      "##.$  # ###",
      "##.   $ ###",
      "###########",
      "###########",
      "###########"
    ],
    // Level 5 - built and verified in the level editor
    [
      "###########",
      "###########",
      "####    ###",
      "####$$$ ###",
      "##@ $.. ###",
      "## $...####",
      "#####  ####",
      "###########",
      "###########",
      "###########",
      "###########"
    ],
    // Level 6 - built and verified in the level editor
    [
      "###########",
      "###########",
      "####  @####",
      "##  $. ####",
      "##  .$. ###",
      "#### *$ ###",
      "####   ####",
      "###########",
      "###########",
      "###########",
      "###########"
    ],
    // Level 7 - built and verified in the level editor
    [
      "###########",
      "###########",
      "####..#####",
      "#### .#####",
      "###  $.####",
      "### $  ####",
      "##  #$$ ###",
      "##  @   ###",
      "###########",
      "###########",
      "###########"
    ],
    // Level 8 - built and verified in the level editor
    [
      "###########",
      "###########",
      "##  #   ###",
      "## $..$ ###",
      "##@$.* ####",
      "## $..$ ###",
      "##  #   ###",
      "###########",
      "###########",
      "###########",
      "###########"
    ],
    // Level 9 - built and verified in the level editor
    [
      "###########",
      "###########",
      "##    #####",
      "## $$$#####",
      "##  #..####",
      "###  ..$ ##",
      "### @    ##",
      "###########",
      "###########",
      "###########",
      "###########"
    ],
    // Level 10 - built and verified in the level editor
    [
      "###########",
      "###########",
      "##..$..####",
      "##..#..####",
      "## $$$ ####",
      "##  $  ####",
      "## $$$ ####",
      "##  #@ ####",
      "###########",
      "###########",
      "###########"
    ],
    // Level 11 - built and verified in the level editor
    [
      "###########",
      "###########",
      "### @ #####",
      "### #$  ###",
      "## *. . ###",
      "##  $$ ####",
      "#### #.####",
      "####   ####",
      "###########",
      "###########",
      "###########"
    ],
    // Level 12 - built and verified in the level editor
    [
      "###########",
      "###########",
      "##    #####",
      "## $ @#####",
      "###*  #####",
      "## * ######",
      "## * ######",
      "## * ######",
      "## . ######",
      "###########",
      "###########"
    ],
    // Level 13 - built and verified in the level editor
    [
      "###########",
      "###########",
      "####  #####",
      "####$ #####",
      "##  * @####",
      "##  *  ####",
      "##  * #####",
      "####* #####",
      "####.######",
      "###########",
      "###########"
    ],
    // Level 14 - built and verified in the level editor
    [
      "###########",
      "###########",
      "##   ######",
      "## # #   ##",
      "## $   $ ##",
      "##..#$#$###",
      "##.@$   ###",
      "##..  #####",
      "###########",
      "###########",
      "###########"
    ],
    // Level 15 - built and verified in the level editor
    [
      "###########",
      "###########",
      "###    ####",
      "###.##$ ###",
      "## ..$  ###",
      "##  #$  ###",
      "##  @ #####",
      "###########",
      "###########",
      "###########"
    ]
  ];

  // Precomputed winning move-sequences (U/D/L/R) for each level's initial state,
  // generated offline since a couple of these need a search far too deep for
  // plain BFS to run live in-browser. Speed Run's BFS fallback replays these
  // directly instead of solving from scratch.
  const SOLUTIONS = [
    "DULLRUUDRR",
    "DDDDRDDLLURDRULUUUUULLDRURDDDDRRRDRUUDLLLDDLLURDRULUUUULLDRURDDDRRRDRULLLDDLLURDRULURRR",
    "DRDRDDLLRRUULDLDRUUULDDUUUURDDDD",
    "RDRRDDRDDLLULLDLURRRDLLRRRRUULUULLDDUURRDDRDDLLULL",
    "DRRRURRUULLDDLDLLURRRUURRDLULDULDD",
    "DLLDLLURRDDDRRUULLULLDRURURRD",
    "LUURRUUDDLLDDRRUUDDRRULDLLLUURRURDLLLDDRRUURULDDDRUULLUU",
    "URLDDRURRDLRDRRULLUUURRDLDLDDRRULULLLLUURDLDRRLLDDRULUR",
    "ULULUURRRDDRDLUUULLDRURDDRDDRRULDLUDLUDLLURRLLULURURRDDUULLDRURD",
    "RUULURUULLLDLDDRUUDDLDDRUUURRUDDRUUDDDDLUUUDDLUDLDLUUURRRDRU",
    "RDRDDDDLLUULUDRDDRRUULRUULDLDLLURRRURRDLDLLURDRULLLLDRRURRDDDLLUURUUULLDDLDRRLUUURRDDRRULDLLDDDRRUUDDLLUURLLLURUURRDDLDLURRURRDLLLDDDRRUUDDLLUURUURRDLDLLURDLLLURDRRUUULLD",
    "DLDDDDLLUUURLDDDRRUUULLDRDUURURUULDULLDRDDUUURRDLRDLDLLDDRRUULDURURUULDULLDRDDUUURRDLULDDURRDL",
    "DLDLDURUULDLLURRDRDDLURULULLDDRLUURRDDURRULLRUULDDRDDLLLUURDLDR",
    "DRRULDLULUUUURRDDLDDLDRUUURRRURRDLLLLUULLDDDRDRRRRUDLLLLULUUURRDDRDURURRDLDDLLUURURDLLLUULLDDDRDDLUUURRRDDLRUULLDLDDRURRUURURRDLLLLUULLDDDDRRRDLURRRUDLLUULLRUULLDDDURRRRURRDLLLLLRUULLDD",
    "LUUUURRRDDLLRRUULLLDDLDDRRRUDLLLUURRRLLUURRRDRDDLULLLLDDRRRURULDDLLLUURUURRRDRDDLLDLLUUDDRRUULRDRRULL"
  ];

  return { LEVELS, SOLUTIONS };
});
