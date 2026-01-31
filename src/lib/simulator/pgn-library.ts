/**
 * Pool of 30 famous chess games stored as pre-parsed SAN move arrays.
 * These are replayed by the simulator to create realistic fake live games.
 */

export interface FamousGame {
  moves: string[];
  result: "white" | "black" | "draw";
}

export const FAMOUS_GAMES: FamousGame[] = [
  // 1. Kasparov vs Topalov, Wijk aan Zee 1999 ("Kasparov's Immortal")
  {
    moves: [
      "e4", "d6", "d4", "Nf6", "Nc3", "g6", "Be3", "Bg7", "Qd2", "c6",
      "f3", "b5", "Nge2", "Nbd7", "Bh6", "Bxh6", "Qxh6", "Bb7", "a3", "e5",
      "O-O-O", "Qe7", "Kb1", "a6", "Nd5", "Nxd5", "exd5", "c5", "dxc5", "Nxc5",
      "Nd4", "Nb3", "Qf4", "exf4", "Re7+", "Kf8", "Nxb3", "Qd8", "Qd2", "Kg7",
      "Qxf4", "Rf8", "Re4", "Qd7", "Rhe1", "Rae8",
    ],
    result: "white",
  },
  // 2. Morphy vs Duke of Brunswick & Count Isouard, Paris 1858 ("The Opera Game")
  {
    moves: [
      "e4", "e5", "Nf3", "d6", "d4", "Bg4", "dxe5", "Bxf3", "Qxf3", "dxe5",
      "Bc4", "Nf6", "Qb3", "Qe7", "Nc3", "c6", "Bg5", "b5", "Nxb5", "cxb5",
      "Bxb5+", "Nbd7", "O-O-O", "Rd8", "Rxd7", "Rxd7", "Rd1", "Qe6", "Bxd7+",
      "Nxd7", "Qb8+", "Nxb8", "Rd8#",
    ],
    result: "white",
  },
  // 3. Byrne vs Fischer, New York 1956 ("The Game of the Century")
  {
    moves: [
      "Nf3", "Nf6", "c4", "g6", "Nc3", "Bg7", "d4", "O-O", "Bf4", "d5",
      "Qb3", "dxc4", "Qxc4", "c6", "e4", "Nbd7", "Rd1", "Nb6", "Qc5", "Bg4",
      "Bg5", "Na4", "Qa3", "Nxc3", "bxc3", "Nxe4", "Bxe7", "Qb6", "Bc4", "Nxc3",
      "Bc5", "Rfe8+", "Kf1", "Be6", "Bxb6", "Bxc4+", "Kg1", "Ne2+", "Kf1", "Nxd4+",
      "Kg1", "Ne2+", "Kf1", "Nc3+", "Kg1", "axb6", "Qb4", "Ra4", "Qxb6", "Nxd1",
      "h3", "Rxa2", "Kh2", "Nxf2", "Re1", "Rxe1", "Qd8+", "Bf8", "Nxe1", "Bd5",
      "Nf3", "Ne4", "Qb8", "b5", "h4", "h5", "Ne5", "Kg7", "Kg1", "Bc5+",
      "Kf1", "Ng3+", "Ke1", "Bb4+", "Kd1", "Bb3+", "Kc1", "Ne2+", "Kb1", "Nc3+",
      "Kc1", "Rc2#",
    ],
    result: "black",
  },
  // 4. Anderssen vs Kieseritzky, London 1851 ("The Immortal Game")
  {
    moves: [
      "e4", "e5", "f4", "exf4", "Bc4", "Qh4+", "Kf1", "b5", "Bxb5", "Nf6",
      "Nf3", "Qh6", "d3", "Nh5", "Nh4", "Qg5", "Nf5", "c6", "g4", "Nf6",
      "Rg1", "cxb5", "h4", "Qg6", "h5", "Qg5", "Qf3", "Ng8", "Bxf4", "Qf6",
      "Nc3", "Bc5", "Nd5", "Qxb2", "Bd6", "Bxg1", "e5", "Qxa1+", "Ke2", "Na6",
      "Nxg7+", "Kd8", "Qf6+", "Nxf6", "Be7#",
    ],
    result: "white",
  },
  // 5. Anderssen vs Dufresne, Berlin 1852 ("The Evergreen Game")
  {
    moves: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4", "Bxb4", "c3", "Ba5",
      "d4", "exd4", "O-O", "d3", "Qb3", "Qf6", "e5", "Qg6", "Re1", "Nge7",
      "Ba3", "b5", "Qxb5", "Rb8", "Qa4", "Bb6", "Nbd2", "Bb7", "Ne4", "Qf5",
      "Bxd3", "Qh5", "Nf6+", "gxf6", "exf6", "Rg8", "Rad1", "Qxf3", "Rxe7+",
      "Nxe7", "Qxd7+", "Kxd7", "Bf5+", "Ke8", "Bd7+", "Kf8", "Bxe7#",
    ],
    result: "white",
  },
  // 6. Kasparov vs Deep Blue, Game 1 1996
  {
    moves: [
      "e4", "c5", "c3", "d5", "exd5", "Qxd5", "d4", "Nf6", "Nf3", "Bg4",
      "Be2", "e6", "h3", "Bh5", "O-O", "Nc6", "Be3", "cxd4", "cxd4", "Bb4",
      "a3", "Ba5", "Nc3", "Qd6", "Nb5", "Qe7", "Ne5", "Bxe2", "Qxe2", "O-O",
      "Rac1", "Rac8", "Bg5", "Bb6", "Bxf6", "gxf6", "Nc4", "Rfd8", "Nxb6", "axb6",
      "Rfd1", "f5", "Qe3", "Qf6", "d5", "Rxd5", "Rxd5", "exd5", "b3", "Kh8",
      "Qxb6", "Rg8", "Qc5", "d4", "Nd6", "f4", "Nxb7", "Ne5", "Qd5", "f3",
      "g3", "Nd3", "Rc7", "Re8", "Nd6", "Re1+", "Kh2", "Nxf2", "Nxf7+", "Kg7",
      "Ng5+", "Kh6", "Rxh7+",
    ],
    result: "white",
  },
  // 7. Ivanchuk vs Yusupov, Brussels 1991 (Candidates Match)
  {
    moves: [
      "c4", "e5", "g3", "d6", "Bg2", "g6", "d4", "Nd7", "Nc3", "Bg7",
      "Nf3", "Ngf6", "O-O", "O-O", "Qc2", "Re8", "Rd1", "c6", "b3", "Qe7",
      "Ba3", "e4", "Ng5", "e3", "f4", "Nf8", "b4", "Bf5", "Qb3", "h6",
      "Nf3", "Ng4", "b5", "g5", "bxc6", "bxc6", "Ne5", "gxf4", "Nxc6", "Qg5",
      "Bxd6", "Ng6", "Nd5", "Bc2", "Qxc2", "fxg3", "hxg3", "Qxg3", "Nde7+", "Kh8",
    ],
    result: "white",
  },
  // 8. Carlsen vs Anand, World Championship 2013 Game 6
  {
    moves: [
      "e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6", "d3", "Bc5", "c3", "O-O",
      "O-O", "Re8", "Re1", "a6", "Ba4", "b5", "Bb3", "d6", "Bg5", "Be6",
      "Nbd2", "h6", "Bh4", "Bxb3", "axb3", "Nb8", "h3", "Nbd7", "Nh2", "Qe7",
      "Ndf1", "Bb6", "Ne3", "Qe6", "Nhf1", "a5", "g4", "d5", "Bg3", "dxe4",
      "dxe4", "Nc5", "Qxd8", "Rexd8", "Ng2", "a4", "bxa4", "Nxa4", "f3", "Nc5",
      "Bf2", "Rd3", "Kf1", "Ne6", "Rea1", "h5", "g5", "Nh7", "Ne3", "Nhg5",
      "Kg2", "Bc5", "Nf5", "Nf4+", "Kg3", "g6", "Nh6+", "Kg7", "Nf5+", "gxf5",
      "exf5", "Rd2", "f6+", "Kg6", "Ra4", "Nd3", "Rxa8", "Nxf2", "Rg8+", "Kh7",
      "Kxf2", "Bxe3+", "Kxe3", "Rd1", "Ke4", "Re1+", "Kf5", "Rf1", "Ra3",
    ],
    result: "white",
  },
  // 9. Short game: Scholar's Mate variation
  {
    moves: [
      "e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#",
    ],
    result: "white",
  },
  // 10. Tal vs Larsen, Candidates 1965 (Tal's brilliant attack)
  {
    moves: [
      "e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4", "e6", "Nc3", "d6",
      "Be3", "Nf6", "f4", "Be7", "Qf3", "O-O", "O-O-O", "Qc7", "Bd3", "a6",
      "Rhe1", "Nxd4", "Bxd4", "b5", "Qg3", "b4", "Na4", "Bd7", "e5", "dxe5",
      "fxe5", "Bc6", "Nb6", "Rad8", "exf6", "Bxf6", "Bxf6", "gxf6", "Bxh7+",
      "Kxh7", "Rxd8", "Rxd8", "Qh4+", "Kg7", "Qg4+", "Kf8", "Qxe6", "Re8",
      "Qd6+", "Kg7", "Nc4", "Rxe1+", "Kd2", "Re6", "Qf4", "Qe7",
    ],
    result: "white",
  },
  // 11. Capablanca vs Marshall, New York 1918 (Marshall Attack)
  {
    moves: [
      "e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7",
      "Re1", "b5", "Bb3", "O-O", "c3", "d5", "exd5", "Nxd5", "Nxe5", "Nxe5",
      "Rxe5", "Nf6", "Re1", "Bd6", "h3", "Ng4", "Qf3", "Qh4", "d4", "Nxf2",
      "Re2", "Bg4", "hxg4", "Bh2+", "Kf1", "Bg3", "Rxf2", "Qh1+", "Ke2", "Bxf2",
      "Bd2", "Bh4", "Qh3", "Rae8+", "Kd3", "Qf1+", "Kc2", "Bf2", "Qf3", "Qg1",
      "Bd5", "c5", "dxc5", "Qc1+", "Kb3", "Qd1+", "Kc4", "Re2", "Bc6", "Qd3+",
      "Kb4", "b4+", "a4", "Qd4+", "Ka5", "Qxc5+", "Ka6", "Qb5#",
    ],
    result: "black",
  },
  // 12. Karpov vs Kasparov, World Championship 1985 Game 16
  {
    moves: [
      "e4", "c5", "Nf3", "e6", "d4", "cxd4", "Nxd4", "Nc6", "Nb5", "d6",
      "c4", "Nf6", "N1c3", "a6", "Na3", "d5", "cxd5", "exd5", "exd5", "Nb4",
      "Be2", "Bc5", "O-O", "O-O", "Bf3", "Bf5", "Bg5", "Re8", "Qd2", "b5",
      "Rad1", "Nd3", "Nab1", "h6", "Bh4", "b4", "Na4", "Bd6", "Bg3", "Rc8",
      "b3", "g5", "Bxd6", "Qxd6", "g3", "Nd7", "Bg2", "Qf6", "a3", "a5",
      "axb4", "axb4", "Qa2", "Bg6", "d6", "g4", "Qd2", "Kg7", "f3", "Qxd6",
      "fxg4", "Qd4+", "Kh1", "Nf6", "Rf4", "Ne4", "Qxd3", "Nf2+", "Rxf2", "Bxd3",
      "Rfd2", "Qe3", "Rxd3", "Rc1", "Nb2", "Qf2", "Nd2", "Rxd1+", "Nxd1", "Re1+",
    ],
    result: "black",
  },
  // 13. Fischer vs Spassky, World Championship 1972 Game 6
  {
    moves: [
      "c4", "e6", "Nf3", "d5", "d4", "Nf6", "Nc3", "Be7", "Bg5", "O-O",
      "e3", "h6", "Bh4", "b6", "cxd5", "Nxd5", "Bxe7", "Qxe7", "Nxd5", "exd5",
      "Rc1", "Be6", "Qa4", "c5", "Qa3", "Rc8", "Bb5", "a6", "dxc5", "bxc5",
      "O-O", "Ra7", "Be2", "Nd7", "Nd4", "Qf8", "Nxe6", "fxe6", "e4", "d4",
      "f4", "Qe7", "e5", "Rb8", "Bc4", "Kh8", "Qh3", "Nf8", "b3", "a5",
      "f5", "exf5", "Rxf5", "Nh7", "Rcf1", "Qd8", "Qg3", "Re7", "h4", "Rbb7",
      "e6", "Rbc7", "Qe5", "Qe8", "a4", "Qd8", "R1f2", "Qe8", "R2f3", "Qd8",
      "Bd3", "Qe8", "Qe4", "Nf6", "Rxf6", "gxf6", "Rxf6", "Kg8", "Bc4", "Kh8",
      "Qf4",
    ],
    result: "white",
  },
  // 14. Botvinnik vs Capablanca, AVRO 1938
  {
    moves: [
      "d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "e3", "d5", "a3", "Bxc3+",
      "bxc3", "c5", "cxd5", "exd5", "Bd3", "O-O", "Ne2", "b6", "O-O", "Ba6",
      "Bxa6", "Nxa6", "Bb2", "Qd7", "a4", "Rfe8", "Qd3", "c4", "Qc2", "Nb8",
      "Rae1", "Nc6", "Ng3", "Na5", "f3", "Nb3", "e4", "Qxa4", "e5", "Nd7",
      "Qf2", "g6", "f4", "f5", "exf6", "Nxf6", "f5", "Rxe1", "Rxe1", "Re8",
      "Re6", "Rxe6", "fxe6", "Kg7", "Qf4", "Qe8", "Qe5", "Qe7", "Ba3", "Qxa3",
      "Nh5+", "gxh5", "Qg5+", "Kf8", "Qxf6+", "Kg8", "e7", "Qc1+", "Kf2", "Qc2+",
      "Kg3", "Qd3+", "Kh4", "Qe4+", "Kxh5", "Qe2+", "Kh4", "Qe4+", "g4", "Qe1+",
      "Kh5",
    ],
    result: "white",
  },
  // 15. Aronian vs Anand, Wijk aan Zee 2013
  {
    moves: [
      "d4", "d5", "c4", "c6", "Nf3", "Nf6", "Nc3", "e6", "e3", "Nbd7",
      "Qc2", "Bd6", "Bd3", "O-O", "O-O", "dxc4", "Bxc4", "b5", "Be2", "Bb7",
      "Rd1", "Qc7", "e4", "e5", "dxe5", "Nxe5", "Nd4", "Neg4", "g3", "Bc5",
      "Bf4", "Qe7", "h3", "Nh2", "Bg2", "Nhf3+", "Nxf3", "Nxe4", "Nxe4", "Bxf3",
      "Kh1", "Bxg2+", "Kxg2", "Qf3+", "Kg1", "Rad8",
    ],
    result: "black",
  },
  // 16. Kramnik vs Kasparov, London 2000 Game 2
  {
    moves: [
      "d4", "Nf6", "c4", "g6", "Nc3", "d5", "cxd5", "Nxd5", "e4", "Nxc3",
      "bxc3", "Bg7", "Nf3", "c5", "Rb1", "O-O", "Be2", "cxd4", "cxd4", "Qa5+",
      "Bd2", "Qxa2", "O-O", "Bg4", "Bg5", "h6", "Bh4", "Nc6", "d5", "Nd4",
      "Nxd4", "Bxe2", "Qxe2", "Bxd4", "Bg3", "Qa6", "Qxa6", "bxa6", "e5", "Rfc8",
      "Rfd1", "Bg7", "f4", "a5", "Kf2", "Rc2+", "Ke3", "Rac8", "Bd6", "a4",
      "Rb7", "a6", "Rxa7", "R8c3+", "Kd4", "Rc1", "Rxd1", "Rc4+", "Ke3", "a3",
    ],
    result: "draw",
  },
  // 17. Petrosian vs Spassky, Moscow 1966 Game 10
  {
    moves: [
      "d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "f3", "O-O",
      "Be3", "e5", "d5", "Nh5", "Qd2", "Qh4+", "g3", "Qe7", "O-O-O", "f5",
      "exf5", "gxf5", "Bd3", "Nd7", "Nge2", "Ndf6", "Ng1", "e4", "fxe4", "fxe4",
      "Bc2", "Ng4", "Nxe4", "Bf5", "Bd3", "Nxe3", "Qxe3", "Bxe4", "Bxe4", "Qxe4",
      "Qxe4", "Nxe4",
    ],
    result: "draw",
  },
  // 18. Alekhine vs Reti, Baden-Baden 1925
  {
    moves: [
      "e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Nxe4",
      "d4", "b5", "Bb3", "d5", "dxe5", "Be6", "c3", "Bc5", "Nbd2", "O-O",
      "Bc2", "Nxf2", "Rxf2", "f6", "exf6", "Bxf2+", "Kxf2", "Qxf6", "Nf1", "Ne5",
      "Be3", "Nxf3", "gxf3", "Qh4+", "Kg2", "Bh3+", "Kxh3", "Qxf2",
    ],
    result: "black",
  },
  // 19. Topalov vs Shirov, Linares 1998 (Shirov's famous Bh3!!)
  {
    moves: [
      "d4", "Nf6", "c4", "c5", "d5", "e6", "Nc3", "exd5", "cxd5", "d6",
      "e4", "g6", "f4", "Bg7", "Bb5+", "Nfd7", "a4", "O-O", "Nf3", "Na6",
      "O-O", "Nc7", "Bd3", "a6", "Bc4", "Rb8", "f5", "b5", "axb5", "axb5",
      "Bxb5", "Nxb5", "Nxb5", "Ba6", "fxg6", "hxg6", "Nc3", "Nb6", "Bg5", "Qd7",
      "Qd3", "Bxe2", "Nxe2", "Qg4", "h3", "Qe6", "Nc3", "Bxc3", "bxc3", "Nc4",
      "Nd2", "Nxd2", "Qxd2", "Qxe4", "Bf6", "Rb2", "Qd3", "Qxd3",
    ],
    result: "black",
  },
  // 20. Nezhmetdinov vs Chernikov, Rostov 1962
  {
    moves: [
      "e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4", "g6", "Nc3", "Bg7",
      "Be3", "Nf6", "Bc4", "O-O", "Bb3", "d6", "f3", "Bd7", "Qd2", "Qa5",
      "O-O-O", "Rfc8", "g4", "Ne5", "h4", "Nc4", "Bxc4", "Rxc4", "h5", "Nxh5",
      "g5", "Nf4", "Nd5", "Nxd5", "exd5", "Re4", "Bh6", "Bf8", "fxe4", "Bxh6",
      "gxh6", "Qxd5", "Qg2", "Qxe4", "Qxe4", "Bxe4", "Rhe1",
    ],
    result: "white",
  },
  // 21. Spassky vs Fischer, Mar del Plata 1960
  {
    moves: [
      "d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "f3", "O-O",
      "Be3", "e5", "Nge2", "c6", "Qd2", "Nbd7", "O-O-O", "a6", "Kb1", "b5",
      "Nc1", "bxc4", "Bxc4", "d5", "Be2", "dxe4", "fxe4", "Bb7", "Bg5", "h6",
      "Bh4", "Qb6", "Nd3", "g5", "Bf2", "Qc7", "dxe5", "Nxe5", "Nxe5", "Qxe5",
      "Bd4", "Qe6", "Bxf6", "Qxf6", "Qxd8", "Rxd8", "Rxd8+", "Kh7",
    ],
    result: "draw",
  },
  // 22. Anand vs Topalov, Sofia 2010 Game 4 (World Championship)
  {
    moves: [
      "d4", "Nf6", "c4", "e6", "Nf3", "d5", "g3", "dxc4", "Bg2", "a6",
      "Ne5", "c5", "Na3", "cxd4", "Naxc4", "Bc5", "O-O", "O-O", "Nd3", "Be7",
      "Nce5", "Nd5", "Bd2", "Nd7", "Nxd7", "Bxd7", "Rc1", "Bc6", "Bxd5", "Bxd5",
      "e4", "Bc4", "Nf4", "Bd6", "Rxc4", "Bxf4", "Bxf4", "e5", "Rc5", "Qb6",
      "Bd2", "exd4", "Ba5", "Qb5", "Rxb5", "axb5", "a3", "Rfe8", "Qxd4", "Ra6",
    ],
    result: "white",
  },
  // 23. Steinitz vs Von Bardeleben, Hastings 1895
  {
    moves: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4",
      "cxd4", "Bb4+", "Nc3", "d5", "exd5", "Nxd5", "O-O", "Be6", "Bg5", "Be7",
      "Bxd5", "Bxd5", "Nxd5", "Qxd5", "Bxe7", "Nxe7", "Re1", "f6", "Qe2", "Qd7",
      "Rac1", "c6", "d5", "cxd5", "Nd4", "Kf7", "Ne6", "Rhc8", "Qg4", "g6",
      "Ng5+", "Ke8", "Rxe7+", "Kf8", "Rf7+", "Kg8", "Rg7+", "Kh8", "Rxh7+",
    ],
    result: "white",
  },
  // 24. Smyslov vs Reshevsky, USSR vs USA 1945
  {
    moves: [
      "d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Nbd7", "e3", "Be7",
      "Nf3", "O-O", "Rc1", "c6", "Bd3", "dxc4", "Bxc4", "Nd5", "Bxe7", "Qxe7",
      "Ne4", "N5f6", "Ng3", "e5", "O-O", "exd4", "Nxd4", "Ne5", "Bb3", "Qb4",
      "Qc2", "Bh3", "Ndf5", "Bxg2", "Kxg2", "Ng6", "Rg1", "Qxb3", "Qxb3",
    ],
    result: "draw",
  },
  // 25. Lasker vs Thomas, London 1912 (King walk)
  {
    moves: [
      "d4", "e6", "Nf3", "f5", "Nc3", "Nf6", "Bg5", "Be7", "Bxf6", "Bxf6",
      "e4", "fxe4", "Nxe4", "b6", "Ne5", "O-O", "Bd3", "Bb7", "Qh5", "Qe7",
      "Qxh7+", "Kxh7", "Nxf6+", "Kh6", "Neg4+", "Kg5", "h4+", "Kf4", "g3+",
      "Kf3", "Be2+", "Kg2", "Rh2+", "Kg1", "Kd2#",
    ],
    result: "white",
  },
  // 26. Carlsen vs Karjakin, World Championship 2016 Game 16 (Tiebreak)
  {
    moves: [
      "e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6", "d3", "Bc5", "O-O", "d6",
      "Re1", "O-O", "Bxc6", "bxc6", "h3", "Re8", "Nbd2", "Be6", "b3", "d5",
      "Bb2", "Bd6", "Nf1", "Nxe4", "dxe4", "dxe4", "Rxe4", "Bf5", "Re1", "Qf6",
      "Bc1", "Qd8", "Ng3", "Bg6", "Qxd6", "cxd6", "Ne4", "Bxe4", "Rxe4", "f5",
      "Re2", "e4", "Nd2", "d5", "f3", "Qf6", "fxe4", "fxe4", "Kh1", "Qg5",
      "Rf2", "Re7", "Nf1", "Rae8", "Be3", "Qh5", "Ng3", "Qg6", "Re1", "h5",
      "Bf4", "h4", "Nh1", "Rf7", "Be5", "Qb1", "Ref1", "Rxf2", "Rxf2", "Qe4",
      "Rf4", "Qe2", "Rf2", "Qe4", "Rf4", "Qe2", "Rf2", "Qe4",
    ],
    result: "draw",
  },
  // 27. Euwe vs Alekhine, World Championship 1935 Game 26
  {
    moves: [
      "d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Nbd7", "e3", "c6",
      "Nf3", "Qa5", "Nd2", "Bb4", "Qc2", "O-O", "Be2", "e5", "O-O", "Re8",
      "a3", "Bd6", "c5", "Bc7", "b4", "Qd8", "f3", "Nf8", "e4", "dxe4",
      "fxe4", "Ne6", "Bh4", "Nf4", "Bf3", "Be6", "b5", "Bd7", "a4", "Qe7",
      "bxc6", "Bxc6", "Nb5", "Bxb5", "axb5", "Rad8", "Rxa7", "Bb8", "Ra4", "Nd3",
      "Nc4", "Nxe4", "Bxe7", "Rxe7",
    ],
    result: "black",
  },
  // 28. Korchnoi vs Karpov, World Championship 1978 Game 17
  {
    moves: [
      "c4", "e6", "Nc3", "d5", "d4", "Be7", "Nf3", "Nf6", "Bf4", "O-O",
      "e3", "c5", "dxc5", "Bxc5", "Qc2", "Nc6", "a3", "Qa5", "Rd1", "Be7",
      "Nd2", "dxc4", "Bxc4", "e5", "Bg3", "Rd8", "O-O", "Nd4", "exd4", "Rxd4",
      "Nb3", "Rxc4", "Qxc4", "Be6", "Qe2", "Bxa3", "bxa3", "Qxa3", "Nc5", "Bc4",
      "Qf3", "Bxf1", "Rxf1", "Nd7", "Ne4", "Qa2", "h3", "b6", "Nd6", "Rf8",
      "Nf5", "g6", "Nh6+", "Kg7", "Nf5+", "gxf5", "Qxf5", "Nf6", "Bxe5", "Qa1",
    ],
    result: "draw",
  },
  // 29. Nakamura vs Caruana, Sinquefield Cup 2014
  {
    moves: [
      "e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6", "d3", "Bc5", "Bxc6", "dxc6",
      "Nbd2", "Be6", "O-O", "Bd6", "b3", "O-O", "Bb2", "Re8", "Nc4", "Bxc4",
      "bxc4", "Nd7", "Rb1", "b6", "Kh1", "f6", "Ne1", "Nc5", "f4", "exf4",
      "Rxf4", "Ne6", "Rf3", "Nc5", "d4", "Nd3", "c3", "Nxb2", "Rxb2", "Qd7",
      "e5", "fxe5", "dxe5", "Bxe5", "Rb1", "Qf5", "Rg3", "Bd4", "cxd4", "Re2",
      "Qg4", "Qxc2", "Nd3", "Rd2", "Qg5", "h6", "Qg4", "Rxd3", "Rxd3", "Qxd3",
    ],
    result: "black",
  },
  // 30. Ding Liren vs Nepomniachtchi, World Championship 2023 Game 12
  {
    moves: [
      "d4", "Nf6", "c4", "e6", "Nf3", "d5", "h3", "dxc4", "e3", "c5",
      "Bxc4", "a6", "O-O", "Nc6", "Nc3", "b5", "Bd3", "Bb7", "a4", "b4",
      "Ne4", "Na5", "Nxf6+", "Qxf6", "e4", "cxd4", "e5", "Qf5", "Bxf5", "exf5",
      "Nxd4", "Bc5", "Nxf5", "O-O", "Qg4", "g6", "Nd6", "Bd5", "Bh6", "Rfe8",
      "b3", "Nc6", "Rad1", "Bf8", "Bg5", "Nd4", "Nf5", "Nxf5", "Qxf5", "Be6",
      "Qf4", "Be7", "Bxe7", "Rxe7", "Rd6", "Rae8", "Qf6", "Bc8", "f4", "Re6",
      "Qf3", "R6e7", "Rd4", "h5", "Rfd1", "a5", "R1d2", "Rb7", "Qd3", "f5",
    ],
    result: "draw",
  },
];
