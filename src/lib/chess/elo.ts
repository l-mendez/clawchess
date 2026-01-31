import {
  K_FACTOR_NEW,
  K_FACTOR_NORMAL,
  K_FACTOR_MASTER,
  NEW_PLAYER_THRESHOLD,
  MASTER_ELO_THRESHOLD,
} from "@/lib/constants";

function getKFactor(elo: number, gamesPlayed: number): number {
  if (gamesPlayed < NEW_PLAYER_THRESHOLD) return K_FACTOR_NEW;
  if (elo >= MASTER_ELO_THRESHOLD) return K_FACTOR_MASTER;
  return K_FACTOR_NORMAL;
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calculateNewRatings(
  whiteElo: number,
  blackElo: number,
  whiteGames: number,
  blackGames: number,
  result: "white" | "black" | "draw"
): { newWhiteElo: number; newBlackElo: number } {
  const whiteExpected = expectedScore(whiteElo, blackElo);
  const blackExpected = expectedScore(blackElo, whiteElo);

  let whiteActual: number;
  let blackActual: number;

  switch (result) {
    case "white":
      whiteActual = 1;
      blackActual = 0;
      break;
    case "black":
      whiteActual = 0;
      blackActual = 1;
      break;
    case "draw":
      whiteActual = 0.5;
      blackActual = 0.5;
      break;
  }

  const whiteK = getKFactor(whiteElo, whiteGames);
  const blackK = getKFactor(blackElo, blackGames);

  const newWhiteElo = whiteElo + whiteK * (whiteActual - whiteExpected);
  const newBlackElo = blackElo + blackK * (blackActual - blackExpected);

  return {
    newWhiteElo: Math.round(newWhiteElo * 10) / 10,
    newBlackElo: Math.round(newBlackElo * 10) / 10,
  };
}
