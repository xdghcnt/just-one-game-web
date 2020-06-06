function init(wsServer, path) {
    const
        fs = require("fs"),
        randomColor = require('randomcolor'),
        app = wsServer.app,
        registry = wsServer.users,
        channel = "just-one",
        testMode = process.argv[2] === "debug",
        PLAYERS_MIN = testMode ? 1 : 3;

    app.use("/just-one", wsServer.static(`${__dirname}/public`));
    if (registry.config.appDir)
        app.use("/just-one", wsServer.static(`${registry.config.appDir}/public`));
    registry.handleAppPage(path, `${__dirname}/public/app.html`);

    const defaultWords = JSON.parse(fs.readFileSync(`${registry.config.appDir}/moderated-words.json`));

    class GameState extends wsServer.users.RoomState {
        constructor(hostId, hostData, userRegistry) {
            super(hostId, hostData, userRegistry);
            const
                room = {
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
                    teamsLocked: false,
                    timed: true,
                    word: null,
                    guessedWord: null,
                    hints: {},
                    bannedHints: {},
                    phase: 0,
                    playerTime: 20,
                    teamTime: 20,
                    masterTime: 30,
                    revealTime: 10,
                    wordsLevel: 1,
                    time: null,
                    paused: true,
                    playerAvatars: {}
                },
                state = {
                    closedHints: {},
                    closedWord: null
                };
            this.room = room;
            this.state = state;
            this.lastInteraction = new Date();
            let interval;
            const
                send = (target, event, data) => userRegistry.send(target, event, data),
                update = () => send(room.onlinePlayers, "state", room),
                updatePlayerState = () => {
                    [...room.players].forEach(playerId => {
                        if (room.onlinePlayers.has(playerId) && room.master === playerId)
                            send(playerId, "player-state", {closedHints: null, closedWord: null});
                        else if (room.phase !== 1)
                            send(playerId, "player-state", state);
                        else
                            send(playerId, "player-state", {
                                closedHints: {[playerId]: state.closedHints[playerId]},
                                closedWord: state.closedWord
                            });
                    });
                },
                getNextPlayer = () => {
                    const nextPlayerIndex = [...room.players].indexOf(room.master) + 1;
                    return [...room.players][(room.players.size === nextPlayerIndex) ? 0 : nextPlayerIndex];
                },
                processInactivity = (playerId) => {
                    if (room.inactivePlayers.has(playerId))
                        removePlayer(playerId);
                    else
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
                        else if (room.phase === 4)
                            room.time = room.revealTime * 1000;
                        let time = new Date();
                        interval = setInterval(() => {
                            if (!room.paused) {
                                room.time -= new Date() - time;
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
                                    } else if (room.phase === 3) {
                                        processInactivity(room.master);
                                        endRound();
                                    } else if (room.phase === 4) {
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
                        room.paused = false;
                        room.teamsLocked = true;
                        clearInterval(interval);
                        startRound();
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
                endRound = () => {
                    room.phase = 4;
                    room.word = state.closedWord;
                    room.hints = state.closedHints;
                    room.readyPlayers.clear();
                    room.master = getNextPlayer();
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
                startRound = () => {
                    room.readyPlayers.clear();
                    if (room.players.size >= PLAYERS_MIN) {
                        room.readyPlayers.add(room.master);
                        room.phase = 1;
                        room.hints = {};
                        room.bannedHints = {};
                        state.closedHints = {};
                        room.playerHints.clear();
                        room.word = state.closedWord = room.guessedWord = null;
                        state.closedWord = shuffleArray(defaultWords[room.wordsLevel])[0];
                        startTimer();
                        update();
                        updatePlayerState();
                    } else {
                        room.phase = 0;
                        room.teamsLocked = false;
                        update();
                    }
                },
                startTeamPhase = () => {
                    room.phase = 2;
                    room.readyPlayers.clear();
                    room.readyPlayers.add(room.master);
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
                        else
                            room.playerHints.delete(playerId);
                    });
                    startTimer();
                    update();
                    updatePlayerState();
                },
                removePlayer = (playerId) => {
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
                },
                userJoin = (data) => {
                    const user = data.userId;
                    if (!room.playerNames[user])
                        room.spectators.add(user);
                    room.playerColors[user] = room.playerColors[user] || randomColor();
                    room.onlinePlayers.add(user);
                    room.playerNames[user] = data.userName.substr && data.userName.substr(0, 60);
                    if (data.avatarId) {
                        fs.stat(`${registry.config.appDir || __dirname}/public/avatars/${user}/${data.avatarId}.png`, (err) => {
                            if (!err) {
                                room.playerAvatars[user] = data.avatarId;
                                update()
                            }
                        });
                    }
                    update();
                    updatePlayerState();
                },
                userLeft = (user) => {
                    room.onlinePlayers.delete(user);
                    if (room.spectators.has(user))
                        delete room.playerNames[user];
                    room.spectators.delete(user);
                    if (room.onlinePlayers.size === 0)
                        stopGame();
                    update();
                },
                userEvent = (user, event, data) => {
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
                "update-avatar": (user, id) => {
                    room.playerAvatars[user] = id;
                    update()
                },
                "toggle-lock": (user) => {
                    if (user === room.hostId && room.paused)
                        room.teamsLocked = !room.teamsLocked;
                    update();
                },
                "add-hint": (user, hint) => {
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
                "toggle-hint-ban": (user, hintUser) => {
                    if (room.phase === 2 && room.players.has(user) && room.master !== user && state.closedHints[hintUser]) {
                        room.bannedHints[hintUser] = !room.bannedHints[hintUser];
                        update();
                    }
                },
                "guess-word": (user, word) => {
                    if (room.phase === 3 && room.master === user && word) {
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
                "set-time": (user, type, value) => {
                    if (user === room.hostId && ~[
                        "masterTime",
                        "playerTime",
                        "revealTime",
                        "teamTime",
                        "wordsLevel"].indexOf(type) && (type === "wordsLevel" || (value <= 4 && value >=1)) && !isNaN(parseInt(value)))
                        room[type] = parseFloat(value);
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
                    }
                },
                "spectators-join": (user) => {
                    if (!room.teamsLocked) {
                        if (room.master === user)
                            room.master = getNextPlayer();
                        room.players.delete(user);
                        room.spectators.add(user);
                        update();
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

        setSnapshot(snapshot) {
            Object.assign(this.room, snapshot.room);
            Object.assign(this.state, snapshot.state);
            this.room.paused = true;
            this.room.inactivePlayers = new JSONSet(this.room.inactivePlayers);
            this.room.onlinePlayers = new JSONSet();
            this.room.spectators = new JSONSet();
            this.room.players = new JSONSet(this.room.players);
            this.room.readyPlayers = new JSONSet(this.room.readyPlayers);
            this.room.playerHints = new JSONSet(this.room.playerHints);
            this.room.onlinePlayers.clear();
        }
    }

    function makeId() {
        let text = "";
        const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

        for (let i = 0; i < 5; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }

    function shuffleArray(array) {
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

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    class JSONSet extends Set {
        constructor(iterable) {
            super(iterable)
        }

        toJSON() {
            return [...this]
        }
    }

    registry.createRoomManager(path, channel, GameState);
}

module.exports = init;

