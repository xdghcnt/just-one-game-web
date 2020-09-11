export type UserId = string;

//client:init
export interface InitUserArgs {
    avatarId?: string; 
    roomId?: string;
    userId?: UserId;
    token?: string;
    userName?: string;
    wssToken?: string;
    acceptDelete?: string;
}

export interface RoomState {
    inited: boolean;
    hostId: UserId;
    spectators: UserId[];
    playerNames: Record<UserId, string>;
    playerColors: Record<UserId, string>;
    inactivePlayers: UserId[];
    onlinePlayers: UserId[];
    master: UserId | null;
    players: UserId[];
    readyPlayers: UserId[];
    playerHints: UserId[];
    playerScores: Record<UserId, number>;
    scoreChanges: Record<UserId, number>;
    teamsLocked: boolean;
    timed: boolean;
    word: string | null;
    guessedWord: string | null;
    hints: Record<UserId, string>;
    bannedHints: Record<UserId, boolean>;
    rounds: number;
    phase: number;
    playerTime: number;
    teamTime: number;
    masterTime: number;
    revealTime: number;
    goal: number;
    wordsLevel: number;
    time: number | null;
    paused: boolean;
    playerAvatars: Record<UserId, string>;
    playerLiked: string | null;
    playerWin: string | null;
    wordGuessed: boolean | null;
    masterKicked: boolean;
}

export interface PlayerState {
    closedHints: Record<UserId, string>;
    closedWord: string | null;
}

export const setParamTypes = [
    "masterTime",
    "playerTime",
    "revealTime",
    "teamTime",
    "wordsLevel",
    "goal"
] as const;
export type SetParamType = typeof setParamTypes[number];