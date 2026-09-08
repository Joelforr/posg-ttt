import {z} from 'zod';

// --- TTT Primitives ---
export const SquareSchema = z.number().int().min(0).max(15);
export const CellSchema = z.object({ 
  symbol: z.union([z.literal('X'), z.literal('O'), z.null()]),
  locked: z.boolean()
});
export const BoardSchema = z.array(CellSchema).length(16);
export const LineSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]).optional();
export const SymbolSchema = z.enum(['X', 'O']);
export const PlayerIdSchema = z.enum(['p1', 'p2']);

// --- Observation (what client/agents see) ---
export const ObservationHistoryEntrySchema = z.object({
    turn: z.number().int().nonnegative(),
    yourMove: SquareSchema.nullable(),
    opponentMove: SquareSchema.nullable(),
    yourInvalidated: z.boolean(),
    opponentInvalidated: z.boolean(),
    collision: z.boolean(),
    boardAfter: BoardSchema,
});

export const ObservationSchema = z.object({
    turn: z.number().int().nonnegative(),
    phase: z.enum(['submit', 'terminal']),
    yourSymbol: SymbolSchema,
    opponentSymbol: SymbolSchema,
    visibleBoard: BoardSchema,
    yourLastMove: SquareSchema.nullable(),
    forbiddenSquare: SquareSchema.nullable(),
    opponentLastReveal: z.object({
            square: SquareSchema.nullable(),
            collided: z.boolean(),
        }).nullable(),
    history: z.array(ObservationHistoryEntrySchema),
    deadlineMs: z.number().int(),
});


// --- Client -> Server ---
export const JoinRoomSchema = z.object({
    type: z.literal('join_room'),
    v: z.literal(1),
    roomCode: z.string().min(1).max(16),
    playerName: z.string().max(32).optional(),
    playerToken: z.string().optional(),
});

export const MoveSubmitSchema = z.object({
    type: z.literal('move_submit'),
    v: z.literal(1),
    turn: z.number().int().nonnegative(),
    square: SquareSchema,
});

export const PingSchema = z.object({
    type: z.literal('ping'),
    v: z.literal(1),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
    JoinRoomSchema,
    MoveSubmitSchema,
    PingSchema,
]);

// --- Server -> Client ---
export const JoinedSchema = z.object({
    type: z.literal('joined'),
    v: z.literal(1),
    playerId: PlayerIdSchema,
    playerToken: z.string(),
    symbol: SymbolSchema,
    roomCode: z.string(),
    opponent: z.object({
        present: z.boolean(),
        name: z.string().optional(),
    }),
});

export const TurnStartSchema = z.object({
    type: z.literal('turn_start'),
    v: z.literal(1),
    observation: ObservationSchema,
    deadlineMs: z.number().int(),
});

export const MoveAckSchema = z.object({
    type: z.literal('move_ack'),
    v: z.literal(1),
    turn: z.number().int().nonnegative(),
    accepted: z.boolean(),
    reason: z
        .enum([
        'two_turn_repeat',
        'out_of_bounds',
        'wrong_turn',
        'wrong_phase',
        'turn_expired',
        ])
        .nullable()
        .optional(),
});

export const RandMoveSchema = z.object({
    type: z.literal('rand_move'),
    v: z.literal(1),
    turn: z.number().int().nonnegative(),
    square: SquareSchema,
});

export const TerminalInRevealSchema = z
  .object({
    outcome: z.enum(['win', 'loss', 'draw']),
    reason: z.string(),
    winningLine: LineSchema,
  })
  .nullable();

export const TurnRevealSchema = z.object({
  type: z.literal('turn_reveal'),
  v: z.literal(1),
  turn: z.number().int().nonnegative(),
  yourMove: SquareSchema.nullable(),
  opponentMove: SquareSchema.nullable(),
  yourInvalidated: z.boolean(),
  opponentInvalidated: z.boolean(),
  collision: z.boolean(),
  boardAfter: BoardSchema,
  terminal: TerminalInRevealSchema,
});

export const GameOverSchema = z.object({
  type: z.literal('game_over'),
  v: z.literal(1),
  outcome: z.enum(['win', 'loss', 'draw']),
  reason: z.string(),
  finalBoard: BoardSchema,
});

export const OpponentStatusSchema = z.object({
  type: z.literal('opponent_status'),
  v: z.literal(1),
  connected: z.boolean(),
});

export const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  v: z.literal(1),
  code: z.string(),
  message: z.string(),
});

export const PongSchema = z.object({
  type: z.literal('pong'),
  v: z.literal(1),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  JoinedSchema,
  TurnStartSchema,
  MoveAckSchema,
  RandMoveSchema,
  TurnRevealSchema,
  GameOverSchema,
  OpponentStatusSchema,
  ErrorMessageSchema,
  PongSchema,
]);

// ---- Inferred types ----
export type Square = z.infer<typeof SquareSchema>;
export type Cell = z.infer<typeof CellSchema>;
export type Board = z.infer<typeof BoardSchema>;
export type Line = z.infer<typeof LineSchema>;
export type GameSymbol = z.infer<typeof SymbolSchema>;
export type PlayerId = z.infer<typeof PlayerIdSchema>;
export type Observation = z.infer<typeof ObservationSchema>;
export type ObservationHistoryEntry = z.infer<typeof ObservationHistoryEntrySchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
export type JoinRoom = z.infer<typeof JoinRoomSchema>;
export type MoveSubmit = z.infer<typeof MoveSubmitSchema>;
export type Joined = z.infer<typeof JoinedSchema>;
export type TurnStart = z.infer<typeof TurnStartSchema>;
export type MoveAck = z.infer<typeof MoveAckSchema>;
export type RandMove = z.infer<typeof RandMoveSchema>;
export type TurnReveal = z.infer<typeof TurnRevealSchema>;
export type GameOver = z.infer<typeof GameOverSchema>;