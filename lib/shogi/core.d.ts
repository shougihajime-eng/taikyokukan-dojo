// lib/shogi/core.js（Kifu Vault 由来の将棋ルールエンジン）の型定義
export type Color = "sente" | "gote";
export type PieceType = "P" | "L" | "N" | "S" | "G" | "B" | "R" | "K";

export interface Piece {
  type: PieceType;
  promoted: boolean;
  color: Color;
}

export interface Square {
  r: number; // 0=一段目(上) .. 8=九段目(下)
  c: number; // 0=９筋(左) .. 8=１筋(右)
}

export interface Move {
  from?: Square | null;
  to: Square;
  promote?: boolean;
  drop?: PieceType | null;
}

export interface GameState {
  board: (Piece | null)[][];
  hands: Record<Color, Partial<Record<PieceType, number>>>;
  turn: Color;
  lastMove: Move | null;
}

declare const ShogiCore: {
  VERSION: string;
  HIRATE_SFEN: string;
  KANJI: Record<PieceType, string>;
  KIF_PROMO: Record<string, string>;
  HAND_ORDER: PieceType[];
  PROMOTABLE: Record<string, number>;
  opp(color: Color): Color;
  inBoard(r: number, c: number): boolean;
  cloneState(s: GameState): GameState;
  initialState(): GameState;
  findKing(st: GameState, color: Color): Square | null;
  inCheck(st: GameState, color: Color): boolean;
  applyMove(st: GameState, mv: Move): GameState | null;
  inPromoZone(color: Color, r: number): boolean;
  canPromote(p: Piece, fr: number, tr: number): boolean;
  mustPromote(p: Piece, tr: number): boolean;
  legalMoveTargets(st: GameState, r: number, c: number): Square[];
  legalDropTargets(st: GameState, type: PieceType): Square[];
  hasAnyLegalMove(st: GameState): boolean;
  isMate(st: GameState): boolean;
  allLegalMoves(st: GameState): Move[];
  moveToUsi(mv: Move): string;
  usiToMove(st: GameState, u: string): Move | null;
  applyUsi(st: GameState, u: string): GameState | null;
  applyUsiStrict(st: GameState, u: string): GameState | null;
  parseSfen(sfen: string): GameState | null;
  toSfen(st: GameState): string;
  parseKif(text: string): { initialSfen?: string; moves?: string[]; notes?: Record<number, string>; error?: string };
  parseRecord(text: string): { initialSfen?: string; moves?: string[]; notes?: Record<number, string>; error?: string };
  buildKif(initialSfen: string, moves: string[], title?: string, notes?: Record<number, string>): string | null;
};

export default ShogiCore;
