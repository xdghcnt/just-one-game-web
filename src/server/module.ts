//TODO: separate server setup, util, timer(?), lobby management and just-one specific game logic.

import { UserId, PlayerState, RoomState, setParamTypes, SetParamType } from "../common/messages";

type Modify<T, R> = Omit<T, keyof R> & R;
interface ServerRoomState extends Modify<RoomState, {
    spectators: Set<UserId>;
    inactivePlayers: Set<UserId>;
    onlinePlayers: Set<UserId>;
    players: Set<UserId>;
    readyPlayers: Set<UserId>;
    playerHints: Set<UserId>;
}> {}

interface Snapshot {
    room: RoomState,
    state: PlayerState
}

function init(wsServer: any, path: string) {
    const
        fs = require("fs"),
        randomColor = require('randomcolor'),
        app = wsServer.app,
        registry = wsServer.users,
        channel = "just-one",
        testMode = process.argv[2] === "debug",
        PLAYERS_MIN = testMode ? 1 : 3;
    const rootDir = `${__dirname}/../..`;

    app.use("/just-one", wsServer.static(`${rootDir}/public`));
    if (registry.config.appDir)
        app.use("/just-one", wsServer.static(`${registry.config.appDir}/public`));
    registry.handleAppPage(path, `${rootDir}/public/app.html`);

    const defaultWords = JSON.parse(fs.readFileSync(`${registry.config.appDir}/moderated-words.json`));

    class GameState extends wsServer.users.RoomState {
        room: ServerRoomState;
        state: PlayerState;
        eventHandlers: Record<string, (userId: UserId, ...args: any[]) => void>
        
        constructor(hostId: string, hostData: any, userRegistry: any) {
            super(hostId, hostData, userRegistry);
            const
                room: ServerRoomState = {
                    inited: true,
                    hostId: hostId,
                    spectators: new JSONSet(),
                    playerNames: {},
                    playerColors: {},
                    inactivePlayers: new JSONSet(),
                    onlinePlayers: new JSONSet(),
                    master: null,
                    players: new JSONSet(),
                    readyPlayers: new JSONSet(),
                    playerHints: new JSONSet(),
                    playerScores: {},
                    scoreChanges: {},
                    teamsLocked: false,
                    timed: true,
                    word: null,
                    guessedWord: null,
                    hints: {},
                    bannedHints: {},
                    rounds: 0,
                    phase: 0,
                    playerTime: 60,
                    teamTime: 12,
                    masterTime: 60,
                    revealTime: 25,
                    goal: 15,
                    wordsLevel: 1,
                    time: null,
                    paused: true,
                    playerAvatars: {},
                    playerLiked: null,
                    playerWin: null,
                    wordGuessed: null,
                    masterKicked: false
                },
                state: PlayerState = {
                    closedHints: {},
                    closedWord: null
                };
            this.room = room;
            this.state = state;
            this.lastInteraction = new Date();
            let interval: NodeJS.Timeout;
            const
                send = (target: any, event: string, data: object) => userRegistry.send(target, event, data),
                update = () => send(room.onlinePlayers, "state", room),
                updatePlayerState = () => {
                    [...room.onlinePlayers].forEach(playerId => {
                        if (room.players.has(playerId)) {
                            if (room.master === playerId)
                                send(playerId, "player-state", {closedHints: null, closedWord: null});
                            else if (room.phase !== 1)
                                send(playerId, "player-state", state);
                            else
                                send(playerId, "player-state", {
                                    closedHints: {[playerId]: state.closedHints[playerId]},
                                    closedWord: state.closedWord
                                });
                        } else {
                            send(playerId, "player-state", {closedHints: null, closedWord: null});
                        }
                    });
                },
                getNextPlayer = () => {
                    if (room.master === null) {
                        return [...room.players][0];
                    } else {
                        const nextPlayerIndex = [...room.players].indexOf(room.master) + 1;
                        return [...room.players][(room.players.size === nextPlayerIndex) ? 0 : nextPlayerIndex];
                    }
                },
                processInactivity = (playerId: UserId, master=false) => {
                    if (room.inactivePlayers.has(playerId)) {
                        if (master)
                            room.masterKicked = true;
                        removePlayer(playerId);
                    } else
                        room.inactivePlayers.add(playerId);
                },
                startTimer = () => {
                    if (room.timed) {
                        clearInterval(interval);
                        if (room.phase === 1)
                            room.time = room.playerTime * 1000;
                        else if (room.phase === 2)
                            room.time = room.teamTime * 1000;
                        else if (room.phase === 3)
                            room.time = room.masterTime * 1000;
                        else if (room.phase === 4) {
                            if (room.wordGuessed)
                                room.time = room.revealTime * 1000;
                            else
                                room.time = 10 * 1000;
                        }
                        let time = new Date();
                        interval = setInterval(() => {
                            if (!room.paused && room.time !== null) {
                                room.time -= (new Date()).getTime() - time.getTime();
                                time = new Date();
                                if (room.time <= 0) {
                                    clearInterval(interval);
                                    if (room.phase === 1) {
                                        if (room.readyPlayers.size === 1)
                                            endRound();
                                        else {
                                            [...room.players].forEach(playerId => {
                                                if (room.master !== playerId && !room.readyPlayers.has(playerId))
                                                    processInactivity(playerId);
                                            });
                                            startTeamPhase();
                                        }
                                    } else if (room.phase === 2) {
                                        startMasterPhase();
                                    } else if (room.phase === 3 && room.master !== null) {
                                        processInactivity(room.master, true);
                                        endRound();
                                    } else if (room.phase === 4) {
                                        if (!room.playerLiked && room.wordGuessed && room.master !== null) {
                                            changeScore(room.master, -2);
                                            if (room.master !== null) {
                                                processInactivity(room.master, true);
                                            }
                                        }
                                        startRound();
                                    }
                                    update();
                                }
                            } else time = new Date();
                        }, 100);
                    }
                },
                startGame = () => {
                    if (room.players.size >= PLAYERS_MIN) {
                        room.masterKicked = false;
                        room.playerWin = null;
                        room.playerScores = {};
                        room.scoreChanges = {};
                        room.paused = false;
                        room.teamsLocked = true;
                        clearInterval(interval);
                        startRound(true);
                    } else {
                        room.paused = true;
                        room.teamsLocked = false;
                    }
                },
                endGame = () => {
                    room.paused = true;
                    room.teamsLocked = false;
                    room.time = null;
                    room.phase = 0;
                    clearInterval(interval);
                    update();
                    updatePlayerState();
                },
                changeScore = (player: UserId, change: number) => {
                    room.playerScores[player] = room.playerScores[player] || 0;
                    room.playerScores[player] += change;
                    room.scoreChanges[player] = room.scoreChanges[player] || 0;
                    room.scoreChanges[player] += change;
                },
                endRound = () => {
                    room.phase = 4;
                    Object.keys(state.closedHints).forEach((player) => {
                        if (room.wordGuessed && room.playerHints.has(player)) {
                            changeScore(player, 1);
                        }
                        room.playerHints.add(player);
                    });
                    room.word = state.closedWord;
                    room.hints = state.closedHints;
                    room.readyPlayers.clear();
                    startTimer();
                    update();
                    updatePlayerState();
                },
                stopGame = () => {
                    room.readyPlayers.clear();
                    room.paused = true;
                    room.teamsLocked = false;
                    room.phase = 0;
                    clearInterval(interval);
                    update();
                    updatePlayerState();
                },
                startRound = (initial=false) => {
                    room.readyPlayers.clear();
                    if (room.players.size >= PLAYERS_MIN) {
                        checkScores();
                        if (!room.playerWin || initial) {
                            if ((!initial && !room.masterKicked) || room.master === null)
                                room.master = getNextPlayer();
                            room.masterKicked = false;
                            room.wordGuessed = null;
                            room.playerLiked = null;
                            room.readyPlayers.add(room.master);
                            room.rounds++;
                            room.phase = 1;
                            room.hints = {};
                            room.bannedHints = {};
                            state.closedHints = {};
                            room.playerHints.clear();
                            room.scoreChanges = {};
                            room.word = state.closedWord = room.guessedWord = null;
                            state.closedWord = shuffleArray(defaultWords[room.wordsLevel])[0];
                            startTimer();
                            update();
                            updatePlayerState();
                        }
                    } else {
                        room.phase = 0;
                        room.teamsLocked = false;
                        update();
                    }
                },
                startTeamPhase = () => {
                    room.phase = 2;
                    room.readyPlayers.clear();
                    if (room.master !== null) {
                        room.readyPlayers.add(room.master);
                    }
                    room.playerHints = new JSONSet(shuffleArray([...room.playerHints]));
                    startTimer();
                    update();
                    updatePlayerState();
                },
                startMasterPhase = () => {
                    room.phase = 3;
                    room.readyPlayers.clear();
                    Object.keys(state.closedHints).forEach((playerId) => {
                        if (!room.bannedHints[playerId])
                            room.hints[playerId] = state.closedHints[playerId];
                        else {
                            room.playerHints.delete(playerId);
                        }
                    });
                    if (room.playerHints.size === 0)
                        endRound();
                    else
                        startTimer();
                    update();
                    updatePlayerState();
                },
                removePlayer = (playerId: UserId) => {
                    if (room.master === playerId)
                        room.master = getNextPlayer();
                    room.players.delete(playerId);
                    room.readyPlayers.delete(playerId);
                    if (room.spectators.has(playerId) || !room.onlinePlayers.has(playerId)) {
                        room.spectators.delete(playerId);
                        delete room.playerNames[playerId];
                        this.emit("user-kicked", playerId);
                    } else
                        room.spectators.add(playerId);
                    if (room.phase !== 0 && room.players.size < PLAYERS_MIN)
                        stopGame();
                    update();
                    updatePlayerState();
                },
                checkScores = () => {
                    const scores = [...room.players].map(playerId => room.playerScores[playerId] || 0).sort((a, b) => a - b).reverse();
                    if (scores[0] > scores[1]) {
                        const playerLeader = [...room.players].filter(playerId => room.playerScores[playerId] === scores[0])[0];
                        if (scores[0] >= room.goal)
                            room.playerWin = playerLeader;
                    }
                    if (room.playerWin)
                        endGame();
                };

            interface UserJoinData {
                userId: UserId,
                userName: string,
                avatarId: string,
            }

            const
                userJoin = (data: UserJoinData) => {
                    const user = data.userId;
                    if (!room.playerNames[user])
                        room.spectators.add(user);
                    room.playerColors[user] = room.playerColors[user] || randomColor();
                    room.onlinePlayers.add(user);
                    room.playerNames[user] = data.userName.substr && data.userName.substr(0, 60);
                    if (data.avatarId) {
                        fs.stat(`${registry.config.appDir || rootDir}/public/avatars/${user}/${data.avatarId}.png`, (err: Error) => {
                            if (!err) {
                                room.playerAvatars[user] = data.avatarId;
                                update()
                            }
                        });
                    }
                    update();
                    updatePlayerState();
                },
                userLeft = (user: UserId) => {
                    room.onlinePlayers.delete(user);
                    if (room.spectators.has(user))
                        delete room.playerNames[user];
                    room.spectators.delete(user);
                    if (room.onlinePlayers.size === 0)
                        stopGame();
                    update();
                },
                userEvent = (user: UserId, event: string, data: any[]) => {
                    this.lastInteraction = new Date();
                    try {
                        if (this.eventHandlers[event])
                            this.eventHandlers[event](user, data[0], data[1], data[2]);
                    } catch (error) {
                        console.error(error);
                        registry.log(error.message);
                    }
                };
            this.userJoin = userJoin;
            this.userLeft = userLeft;
            this.userEvent = userEvent;
            this.eventHandlers = {
                "update-avatar": (user, id: string) => {
                    room.playerAvatars[user] = id;
                    update()
                },
                "toggle-lock": (user) => {
                    if (user === room.hostId && room.paused)
                        room.teamsLocked = !room.teamsLocked;
                    update();
                },
                "add-hint": (user, hint: string) => {
                    if (room.phase === 1 && room.players.has(user)
                        && room.master !== user && !room.readyPlayers.has(user) && hint) {
                        if (room.players.size >= PLAYERS_MIN) {
                            state.closedHints[user] = hint;
                            room.readyPlayers.add(user);
                            room.playerHints.add(user);
                            if (room.readyPlayers.size === room.players.size)
                                startTeamPhase();
                            else {
                                update();
                                updatePlayerState();
                            }
                        } else stopGame();
                    }
                },
                "toggle-hint-ban": (user, hintUser: UserId) => {
                    if (room.phase === 2 && room.players.has(user) && room.master !== user && state.closedHints[hintUser]) {
                        room.bannedHints[hintUser] = !room.bannedHints[hintUser];
                        update();
                    }
                },
                "set-like": (user, likedUser: UserId) => {
                    if (room.phase === 4 && !room.playerLiked && room.wordGuessed) {
                        room.playerLiked = likedUser;
                        changeScore(likedUser, 2);
                        if (room.time && room.time >= 5000)
                            room.time = 5000;
                        checkScores();
                        update();
                    }
                },
                "guess-word": (user, word: string) => {
                    if (room.phase === 3 && room.master === user && word) {
                        if (state.closedWord?.toLowerCase() === word.toLowerCase().trim()) {
                            room.wordGuessed = true;
                            changeScore(room.master, 2);
                        }
                        room.guessedWord = word;
                        endRound();
                    }
                },
                "toggle-ready": (user) => {
                    if (room.players.has(user) && (
                        (room.master !== user && room.phase === 2)
                        || (room.phase === 4)
                    )) {
                        if (room.readyPlayers.has(user))
                            room.readyPlayers.delete(user);
                        else {
                            room.readyPlayers.add(user);
                            if (room.players.size === room.readyPlayers.size)
                                if (room.phase === 2)
                                    startMasterPhase();
                                else if (room.phase === 4)
                                    startRound();
                        }
                        update();
                    }
                },
                "toggle-pause": (user) => {
                    if (user === room.hostId) {
                        room.paused = !room.paused;
                        if (room.phase === 0)
                            startGame();
                    }
                    update();
                },
                "restart": (user) => {
                    if (user === room.hostId)
                        startGame();
                },
                "toggle-timed": (user) => {
                    if (user === room.hostId) {
                        room.timed = !room.timed;
                        if (!room.timed) {
                            room.time = null;
                            clearInterval(interval);
                        }
                    }
                    update();
                },
                "set-param": (user, type: SetParamType, value: number) => {
                    if (
                        user === room.hostId
                        && setParamTypes.includes(type)
                        && typeof value === 'number'
                        && (type !== "wordsLevel" || (value <= 4 && value >= 1))
                    ) {
                        room[type] = value;
                    }
                    update();
                },
                "change-name": (user, value) => {
                    if (value)
                        room.playerNames[user] = value.substr && value.substr(0, 60);
                    update();
                },
                "remove-player": (user, playerId) => {
                    if (playerId && user === room.hostId)
                        removePlayer(playerId);
                    update();
                },
                "give-host": (user, playerId) => {
                    if (playerId && user === room.hostId) {
                        room.hostId = playerId;
                        this.emit("host-changed", user, playerId);
                    }
                    update();
                },
                "players-join": (user) => {
                    if (!room.teamsLocked) {
                        room.spectators.delete(user);
                        room.players.add(user);
                        if (room.players.size === 1)
                            room.master = user;
                        update();
                        updatePlayerState();
                    }
                },
                "spectators-join": (user) => {
                    if (!room.teamsLocked) {
                        if (room.master === user)
                            room.master = getNextPlayer();
                        room.players.delete(user);
                        room.spectators.add(user);
                        update();
                        updatePlayerState();
                    }
                }
            };
        }

        getPlayerCount() {
            return Object.keys(this.room.playerNames).length;
        }

        getActivePlayerCount() {
            return this.room.onlinePlayers.size;
        }

        getLastInteraction() {
            return this.lastInteraction;
        }

        getSnapshot() {
            return {
                room: this.room,
                state: this.state,
                player: this.player
            };
        }

        setSnapshot({room, state}: Snapshot) {
            Object.assign(this.room, room, {
                paused: true,
                inactivePlayers: new JSONSet(room.inactivePlayers),
                onlinePlayers: new JSONSet(),
                spectators: new JSONSet(),
                players: new JSONSet(room.players),
                readyPlayers: new JSONSet(room.readyPlayers),
                playerHints: new JSONSet(room.playerHints)
            });
            Object.assign(this.state, state);
        }
    }

    function shuffleArray(array: any[]) {
        let currentIndex = array.length, temporaryValue, randomIndex;
        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    }

    class JSONSet extends Set {
        constructor(iterable: any[]=[]) {
            super(iterable)
        }

        toJSON() {
            return [...this]
        }
    }

    registry.createRoomManager(path, channel, GameState);
}

module.exports = init;

