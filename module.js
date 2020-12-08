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
                    playerAcceptVotes: new JSONSet(),
                    playerScores: {},
                    scoreChanges: {},
                    teamsLocked: false,
                    timed: true,
                    word: null,
                    guessedWord: null,
                    hints: {},
                    bannedHints: {},
                    unbannedHints: {},
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
                    wordAccepted: null,
                    managedVoice: true,
                    masterKicked: false
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
                update = () => {
                    if (room.voiceEnabled)
                        processUserVoice();
                    send(room.onlinePlayers, "state", room);
                },
                processUserVoice = () => {
                    room.userVoice = {};
                    room.onlinePlayers.forEach((user) => {
                        if (!room.managedVoice || !room.teamsLocked || room.phase === 0)
                            room.userVoice[user] = true;
                        else if (room.players)
                            room.userVoice[user] = true;
                    });
                },
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
                    const nextPlayerIndex = [...room.players].indexOf(room.master) + 1;
                    return [...room.players][(room.players.size === nextPlayerIndex) ? 0 : nextPlayerIndex];
                },
                processInactivity = (playerId, master) => {
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
                                        processInactivity(room.master, true);
                                        endRound();
                                    } else if (room.phase === 4) {
                                        if (!room.playerLiked && room.wordGuessed) {
                                            changeScore(room.master, -2);
                                            processInactivity(room.master, true);
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
                    room.playerAcceptVotes.clear();
                    clearInterval(interval);
                    update();
                    updatePlayerState();
                },
                changeScore = (player, change) => {
                    room.playerScores[player] = room.playerScores[player] || 0;
                    room.playerScores[player] += change;
                    room.scoreChanges[player] = room.scoreChanges[player] || 0;
                    room.scoreChanges[player] += change;
                },
                endRound = () => {
                    room.phase = 4;
                    Object.keys(state.closedHints).forEach((player) => {
                        if ((room.wordGuessed || room.wordAccepted) && room.playerHints.has(player)) {
                            changeScore(player, 1);
                        }
                        room.playerHints.add(player);
                    });
                    room.word = state.closedWord;
                    room.hints = state.closedHints;
                    room.readyPlayers.clear();
                    room.playerAcceptVotes.clear();
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
                startRound = (initial) => {
                    room.readyPlayers.clear();
                    if (room.players.size >= PLAYERS_MIN) {
                        checkScores();
                        if (!room.playerWin || initial) {
                            if (!initial && !room.masterKicked)
                                room.master = getNextPlayer();
                            room.masterKicked = false;
                            room.wordAccepted = null;
                            room.wordGuessed = null;
                            room.playerLiked = null;
                            room.readyPlayers.add(room.master);
                            room.rounds++;
                            room.phase = 1;
                            room.hints = {};
                            room.bannedHints = {};
                            room.unbannedHints = {};
                            state.closedHints = {};
                            room.playerAcceptVotes.clear();
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
                    room.readyPlayers.add(room.master);
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
            this.updatePublicState = update;
            this.userJoin = userJoin;
            this.userLeft = userLeft;
            this.userEvent = userEvent;
            this.eventHandlers = {
                ...this.eventHandlers,
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
                        if (room.bannedHints[hintUser]) {
                            room.bannedHints[hintUser] = null;
                            room.unbannedHints[hintUser] = user;
                        }
                        else {
                            room.bannedHints[hintUser] = user;
                            room.unbannedHints[hintUser] = null;
                        }
                        update();
                    }
                },
                "set-like": (user, likedUser) => {
                    if (room.phase === 4 && !room.playerLiked && room.wordGuessed) {
                        room.playerLiked = likedUser;
                        changeScore(likedUser, 2);
                        if (room.time >= 5000)
                            room.time = 5000;
                        checkScores();
                        update();
                    }
                },
                "vote-accept": (user) => {
                    if (room.phase === 4 && room.players.has(user) && !room.wordGuessed) {
                        room.playerAcceptVotes.add(user);
                        if (room.playerAcceptVotes.size >= Math.ceil(room.players.size / 2)) {
                            room.wordAccepted = true;
                            changeScore(room.master, 2);
                            endRound();
                        } else update();
                    }
                },
                "guess-word": (user, word) => {
                    if (room.phase === 3 && room.master === user && word) {
                        if (state.closedWord.toLowerCase() === word.toLowerCase().trim()) {
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
                "set-param": (user, type, value) => {
                    if (user === room.hostId && ~[
                        "masterTime",
                        "playerTime",
                        "revealTime",
                        "teamTime",
                        "wordsLevel",
                        "goal"].indexOf(type) && (type !== "wordsLevel" || (value <= 4 && value >= 1)) && !isNaN(parseInt(value)))
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
            this.room.playerAcceptVotes = new JSONSet();
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

