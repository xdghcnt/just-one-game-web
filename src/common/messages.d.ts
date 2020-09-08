//client:init
export interface InitUserArgs {
    avatarId?: string; 
    roomId?: string;
    userId?: string;
    token?: string;
    userName?: string;
    wssToken?: string;
    acceptDelete?: string;
}

export interface RoomState {
    inited: boolean;
    hostId: string;
    spectators: string[];
    playerNames: object;
    playerColors: object;
    inactivePlayers: string[];
    onlinePlayers: string[];
    master: string | null;
    players: string[];
    readyPlayers: string[];
    playerHints: string[];
    playerScores: object;
    scoreChanges: object;
    teamsLocked: boolean;
    timed: boolean;
    word: string | null;
    guessedWord: string | null;
    hints: object;
    bannedHints: object;
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
    playerAvatars: object;
    playerLiked: string | null;
    playerWin: string | null;
    wordGuessed: boolean | null;
    masterKicked: boolean;
}

export interface PlayerState {
    closedWord: string | null;
    closedHints: object | null;
}