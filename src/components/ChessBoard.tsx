"use client";

import { Chessboard } from "react-chessboard";
import { useMemo } from "react";

interface ChessBoardProps {
  fen: string;
  lastMove?: { from: string; to: string } | null;
  orientation?: "white" | "black";
  isCheck?: boolean;
  checkSquare?: string | null;
  width?: number;
}

export default function ChessBoard({
  fen,
  lastMove,
  orientation = "white",
  width,
}: ChessBoardProps) {
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (lastMove) {
      styles[lastMove.from] = {
        backgroundColor: "rgba(255, 107, 53, 0.3)",
      };
      styles[lastMove.to] = {
        backgroundColor: "rgba(255, 107, 53, 0.5)",
      };
    }

    return styles;
  }, [lastMove]);

  return (
    <div className="rounded-lg overflow-hidden shadow-2xl">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        boardWidth={width || 480}
        arePiecesDraggable={false}
        customBoardStyle={{
          borderRadius: "8px",
        }}
        customDarkSquareStyle={{ backgroundColor: "#779952" }}
        customLightSquareStyle={{ backgroundColor: "#edeed1" }}
        customSquareStyles={customSquareStyles}
        animationDuration={200}
      />
    </div>
  );
}
