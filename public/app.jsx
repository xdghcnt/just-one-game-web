//import React from "react";
//import ReactDOM from "react-dom"
//import io from "socket.io"
function makeId() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

class Player extends React.Component {
    render() {
        const
            data = this.props.data,
            id = this.props.id;
        return (
            <div className={cs("player", {
                ready: ~data.readyPlayers.indexOf(id),
                offline: !~data.onlinePlayers.indexOf(id),
                self: id === data.userId
            })} onTouchStart={(e) => e.target.focus()}>
                <div className="player-avatar-section"
                     onTouchStart={(e) => e.target.focus()}
                     onClick={() => (id === data.userId) && this.props.handleAvatarClick()}>
                    <Avatar data={data} player={id}/>
                    {id === data.userId ? (<i className="change-avatar-icon material-icons" title="Change avatar">
                        edit
                    </i>) : ""}
                </div>
                <div className="player-name-section">
                    <span className="player-name">{data.master === id ? "> " : ""}{data.playerNames[id]}</span>
                    &nbsp;({data.playerScores[id] || 0})
                    <div className="player-host-controls">
                        {(data.hostId === data.userId && data.userId !== id) ? (
                            <i className="material-icons host-button"
                               title="Give host"
                               onClick={(evt) => this.props.handleGiveHost(id, evt)}>
                                vpn_key
                            </i>) : ""}
                        {(data.hostId === data.userId && data.userId !== id) ? (
                            <i className="material-icons host-button"
                               title="Remove"
                               onClick={(evt) => this.props.handleRemovePlayer(id, evt)}>
                                delete_forever
                            </i>) : ""}
                        {(data.hostId === id) ? (
                            <i className="material-icons host-button inactive"
                               title="Game host">
                                stars
                            </i>
                        ) : ""}
                    </div>
                </div>
            </div>
        );
    }
}

class Avatar extends React.Component {
    render() {
        const
            hasAvatar = !!this.props.data.playerAvatars[this.props.player],
            avatarURI = `/just-one/avatars/${this.props.player}/${this.props.data.playerAvatars[this.props.player]}.png`;
        return (
            <div className={cs("avatar", {"has-avatar": hasAvatar})}
                 style={{
                     "background-image": hasAvatar
                         ? `url(${avatarURI})`
                         : `none`,
                     "background-color": hasAvatar
                         ? `transparent`
                         : this.props.data.playerColors[this.props.player]
                 }}>
                {!hasAvatar ? (
                    <i className="material-icons avatar-stub">
                        person
                    </i>
                ) : ""}
            </div>
        );
    }
}

class Game extends React.Component {
    componentDidMount() {
        const initArgs = {};
        if (!parseInt(localStorage.darkThemeDixit))
            document.body.classList.add("dark-theme");
        if (!localStorage.dixitUserId || !localStorage.dixitUserToken) {
            while (!localStorage.userName)
                localStorage.userName = prompt("Your name");
            localStorage.dixitUserId = makeId();
            localStorage.dixitUserToken = makeId();
        }
        if (!location.hash)
            history.replaceState(undefined, undefined, location.origin + location.pathname + "#" + makeId());
        else
            history.replaceState(undefined, undefined, location.origin + location.pathname + location.hash);
        if (localStorage.acceptDelete) {
            initArgs.acceptDelete = localStorage.acceptDelete;
            delete localStorage.acceptDelete;
        }
        initArgs.avatarId = localStorage.avatarId;
        initArgs.roomId = location.hash.substr(1);
        initArgs.userId = this.userId = localStorage.dixitUserId;
        initArgs.token = this.userToken = localStorage.dixitUserToken;
        initArgs.userName = localStorage.userName;
        initArgs.wssToken = window.wssToken;
        this.socket = window.socket.of("just-one");
        this.player = {cards: []};
        this.socket.on("state", state => {
            CommonRoom.processCommonRoom(state, this.state);
            if (this.state.phase && state.phase !== 0 && !parseInt(localStorage.muteSounds)) {
                if (this.state.master !== this.userId && state.master === this.userId)
                    this.masterSound.play();
                else if (this.state.phase === 1 && state.phase === 2)
                    this.storySound.play();
                else if (this.state.phase === 2 && state.phase === 3)
                    this.revealSound.play();
                else if (state.phase === 2 && this.state.readyPlayers.length !== state.readyPlayers.length)
                    this.tapSound.play();
            }
            if (this.state.inited && this.state.phase !== 2 && state.phase === 2)
                this.progressBarUpdate(0, 100);
            this.setState(Object.assign({
                userId: this.userId
            }, state));
        });
        this.socket.on("player-state", (state) => {
            this.setState(Object.assign(this.state, state));
        });
        this.socket.on("message", text => {
            popup.alert({content: text});
        });
        window.socket.on("disconnect", (event) => {
            this.setState({
                inited: false,
                disconnected: true,
                disconnectReason: event.reason
            });
        });
        this.socket.on("reload", () => {
            setTimeout(() => window.location.reload(), 3000);
        });
        this.socket.on("auth-required", () => {
            this.setState(Object.assign({}, this.state, {
                userId: this.userId,
                authRequired: true
            }));
            if (grecaptcha)
                grecaptcha.render("captcha-container", {
                    sitekey: "",
                    callback: (key) => this.socket.emit("auth", key)
                });
            else
                setTimeout(() => window.location.reload(), 3000)
        });
        this.socket.on("prompt-delete-prev-room", (roomList) => {
            if (localStorage.acceptDelete =
                prompt(`Limit for hosting rooms per IP was reached: ${roomList.join(", ")}. Delete one of rooms?`, roomList[0]))
                location.reload();
        });
        this.socket.on("ping", (id) => {
            this.socket.emit("pong", id);
        });
        document.title = `Just one - ${initArgs.roomId}`;
        this.socket.emit("init", initArgs);
        this.timerSound = new Audio("/just-one/tick.mp3");
        this.timerSound.volume = 0.4;
        this.tapSound = new Audio("/just-one/tap.mp3");
        this.tapSound.volume = 0.3;
        this.storySound = new Audio("/just-one/start.mp3");
        this.storySound.volume = 0.4;
        this.revealSound = new Audio("/just-one/reveal.mp3");
        this.revealSound.volume = 0.3;
        this.masterSound = new Audio("/just-one/master.mp3");
        this.masterSound.volume = 0.7;
    }

    debouncedEmit() {
        clearTimeout(this.debouncedEmitTimer);
        this.debouncedEmitTimer = setTimeout(() => {
            this.socket.emit.apply(this.socket, arguments);
        }, 100);
    }

    constructor() {
        super();
        this.state = {
            inited: false
        };
        window.hyphenate = createHyphenator(hyphenationPatternsRu);
    }

    handleJoinPlayersClick(evt) {
        evt.stopPropagation();
        if (!this.state.teamsLocked)
            this.socket.emit("players-join");
    }

    handleJoinSpectatorsClick(evt) {
        evt.stopPropagation();
        if (!this.state.teamsLocked)
            this.socket.emit("spectators-join");
    }

    handleRemovePlayer(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: `Removing ${this.state.playerNames[id]}?`}, (evt) => evt.proceed && this.socket.emit("remove-player", id));
    }

    handleGiveHost(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: `Give host ${this.state.playerNames[id]}?`}, (evt) => evt.proceed && this.socket.emit("give-host", id));
    }

    handleChangeParam(value, type) {
        this.debouncedEmit("set-param", type, value);
    }

    handleClickChangeName() {
        popup.prompt({content: "New name", value: this.state.playerNames[this.state.userId] || ""}, (evt) => {
            if (evt.proceed && evt.input_value.trim()) {
                this.socket.emit("change-name", evt.input_value.trim());
                localStorage.userName = evt.input_value.trim();
            }
        });
    }

    handleClickSetAvatar() {
        document.getElementById("avatar-input").click();
    }

    handleSetAvatar(event) {
        const input = event.target;
        if (input.files && input.files[0])
            this.sendAvatar(input.files[0]);
    }

    sendAvatar(file) {
        const
            uri = "/common/upload-avatar",
            xhr = new XMLHttpRequest(),
            fd = new FormData(),
            fileSize = ((file.size / 1024) / 1024).toFixed(4); // MB
        if (fileSize <= 5) {

            xhr.open("POST", uri, true);
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    localStorage.avatarId = xhr.responseText;
                    this.socket.emit("update-avatar", localStorage.avatarId);
                } else if (xhr.readyState === 4 && xhr.status !== 200) popup.alert({content: "File upload error"});
            };
            fd.append("avatar", file);
            fd.append("userId", this.userId);
            fd.append("userToken", this.userToken);
            xhr.send(fd);
        } else
            popup.alert({content: "File shouldn't be larger than 5 MB"});
    }

    handleToggleTheme() {
        localStorage.darkThemeDixit = !parseInt(localStorage.darkThemeDixit) ? 1 : 0;
        document.body.classList.toggle("dark-theme");
        this.setState(Object.assign({}, this.state));
    }

    handleToggleMuteSounds() {
        localStorage.muteSounds = !parseInt(localStorage.muteSounds) ? 1 : 0;
        this.setState(Object.assign({}, this.state));
    }

    handleClickTogglePause() {
        this.socket.emit("toggle-pause");
    }

    handleToggleTeamLockClick() {
        this.socket.emit("toggle-lock");
    }

    handleClickRestart() {
        if (!this.gameIsOver)
            popup.confirm({content: "Restart? Are you sure?"}, (evt) => evt.proceed && this.socket.emit("restart"));
        else
            this.socket.emit("restart")
    }

    handleToggleTimed() {
        this.socket.emit("toggle-timed");
    }

    updateTimer(time) {
        const timeTotal = {
            1: this.state.playerTime,
            2: this.state.teamTime,
            3: this.state.masterTime,
            4: this.state.revealTime,
        }[this.state.phase] * 1000;
        this.progressBarUpdate(timeTotal - time, timeTotal);
    }

    progressBarUpdate(x, outOf) {
        let firstHalfAngle = 180,
            secondHalfAngle = 0;

        // caluclate the angle
        let drawAngle = x / outOf * 360;

        // calculate the angle to be displayed if each half
        if (drawAngle <= 180) {
            firstHalfAngle = drawAngle;
        } else {
            secondHalfAngle = drawAngle - 180;
        }

        // set the transition
        document.getElementsByClassName("rtb-slice1")[0].style.transform = `rotate(${firstHalfAngle}deg)`;
        document.getElementsByClassName("rtb-slice2")[0].style.transform = `rotate(${secondHalfAngle}deg)`;
    }

    handleAddCommandClick() {
        this.socket.emit(this.state.phase === 1 ? "add-hint" : "guess-word", document.getElementById("command-input").value);
    }

    handleClickToggleReady() {
        this.socket.emit("toggle-ready");
    }

    handleClickToggleHintBan(user) {
        this.socket.emit("toggle-hint-ban", user);
    }

    handleClickSetLike(user) {
        this.socket.emit("set-like", user);
    }

    render() {
        clearTimeout(this.timerTimeout);
        if (this.state.disconnected)
            return (<div
                className="kicked">Disconnected{this.state.disconnectReason ? ` (${this.state.disconnectReason})` : ""}</div>);
        else if (this.state.inited) {
            document.body.classList.add("captcha-solved");
            const
                data = this.state,
                isHost = data.hostId === data.userId,
                inProcess = data.phase !== 0 && !data.paused,
                isMaster = data.master === data.userId;
            if (data.phase !== 0 && data.timed) {
                let timeStart = new Date();
                this.timerTimeout = setTimeout(() => {
                    if (this.state.timed && !this.state.paused) {
                        let prevTime = this.state.time,
                            time = prevTime - (new Date - timeStart);
                        this.setState(Object.assign({}, this.state, {time: time}));
                        this.updateTimer(time);
                        if (![2, 4].includes(this.state.phase) && this.state.timed && time < 5000
                            && ((Math.floor(prevTime / 1000) - Math.floor(time / 1000)) > 0) && !parseInt(localStorage.muteSounds))
                            this.timerSound.play();
                    }
                    if (!this.state.timed)
                        this.updateTimer(0);
                }, 1000);
            }
            let status = "";
            if (data.phase === 0) {
                if (data.players.length > 2)
                    status = "Host can start game";
                else
                    status = "Not enough players";
            } else if (data.userId === data.master) {
                if (data.phase === 1)
                    status = `Wait for players to write their hints`;
                else if (data.phase === 2)
                    status = "Wait for players to delete duplicates";
                else if (data.phase === 3)
                    status = "Now try guess the original word";
            } else {
                if (data.phase === 1 && data.readyPlayers.includes(data.userId))
                    status = `Wait for players to write their hints`;
                else if (data.phase === 2)
                    status = "Delete duplicates";
                else if (data.phase === 3)
                    status = "Now master should guess original word";
            }
            if (data.phase === 4)
                status = `Next round`;
            return (
                <div className={cs("game", {timed: this.state.timed})}>
                    <div className={
                        cs("game-board", {
                            active: this.state.inited,
                            isMaster,
                            teamsLocked: data.teamsLocked
                        })}>
                        <div className="status-bar-wrap">
                            <div className="status-bar">
                                <div className="title-section">
                                    {((data.master === data.userId && data.phase === 3)
                                        || (data.master !== data.userId && data.players.includes(data.userId)
                                            && data.phase === 1 && !data.readyPlayers.includes(data.userId))) ? (
                                        <div className="add-command">
                                            <input className="add-command-input" id="command-input"
                                                   autoComplete="off"
                                                   onKeyDown={(evt) => !evt.stopPropagation()
                                                       && evt.key === "Enter" && this.handleAddCommandClick()}/>
                                            <div className="add-command-button"
                                                 onClick={() => this.handleAddCommandClick()}>➜
                                            </div>
                                        </div>) : ""}
                                    <div className="command">{(data.word || data.closedWord) ?
                                        `Word is «${data.word || data.closedWord}»` : ""}</div>
                                    <div className="command">{data.phase === 4
                                    && !data.wordGuessed ?
                                        `Guess is «${data.guessedWord}»` : ""}
                                    </div>
                                    {!data.playerWin ? "" : `The winner is ${data.playerNames[data.playerWin]}!`}
                                    <div className="status-text">{status}{data.phase === 4 || (data.phase === 2
                                        && data.players.includes(data.userId) && data.master !== data.userId)
                                        ? (<span>&nbsp;<span
                                            onClick={() => this.handleClickToggleReady()}
                                            className="ready-button">{!data.readyPlayers.includes(data.userId)
                                            ? "Ready"
                                            : "Unready"}</span></span>) : ""}</div>
                                </div>
                                <div className="timer-section">
                                    <div className="round-track-bar">
                                        <div className="rtb-clip1">
                                            <div className="rtb-slice1"/>
                                        </div>
                                        <div className="rtb-clip2">
                                            <div className="rtb-slice2"/>
                                        </div>
                                        <div className="rtb-content">
                                            <Avatar data={data}
                                                    player={data.playerWin ? data.playerWin : data.master}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="main-row">
                            <div className="player-list-section"
                                 onClick={(evt) => this.handleJoinPlayersClick(evt)}>
                                <div className="player-list">
                                    {data.players.map((id => (
                                        <Player key={id} data={data} id={id}
                                                handleGiveHost={(id, evt) => this.handleGiveHost(id, evt)}
                                                handleAvatarClick={() => this.handleClickSetAvatar()}
                                                handleRemovePlayer={(id, evt) => this.handleRemovePlayer(id, evt)}/>
                                    )))}
                                    {!~data.players.indexOf(data.userId) ? (
                                        <div className="join-button">Play</div>) : ""}
                                </div>
                                <div className={cs("spectators", {empty: !data.spectators.length})}
                                     onClick={(evt) => this.handleJoinSpectatorsClick(evt)}>
                                    {data.spectators.map((id => (
                                        <Player key={id} data={data} id={id}
                                                handleGiveHost={(id) => this.handleGiveHost(id)}
                                                handleAvatarClick={() => this.handleClickSetAvatar()}
                                                handleRemovePlayer={(id, evt) => this.handleRemovePlayer(id, evt)}/>
                                    )))}
                                    {!~data.spectators.indexOf(data.userId) ? (
                                        <div className="join-button">Spectate</div>) : ""}
                                </div>
                            </div>
                            <div className="words-wrap">
                                <div className="words">
                                    {data.playerHints.map((player) => (
                                        <div className={cs("word", {
                                            banned: data.bannedHints[player]
                                        })}>
                                            <div className="word-box">
                                                <span>{window.hyphenate(data.hints[player] || (data.closedHints && data.closedHints[player]) || "xxx")}</span>
                                                <div className="card-votes">
                                                    <div className="player-vote">
                                                        {data.userId !== data.master || data.playerLiked
                                                            ? (<Avatar data={data} player={player}/>) : ""}
                                                    </div>
                                                </div>
                                            </div>
                                            {data.phase === 2 || (data.phase === 4 && data.bannedHints[player]) ? (
                                                <div className="ban-hint-button"
                                                     onClick={() => this.handleClickToggleHintBan(player)}>
                                                    <i className="material-icons">warning</i></div>) : ""}
                                            {(data.playerLiked === player
                                                || (data.phase === 4 && !data.bannedHints[player] && data.master === data.userId
                                                    && data.playerLiked == null && data.wordGuessed))
                                                ? (<div className="set-like-button"
                                                        onClick={() => this.handleClickSetLike(player)}><i
                                                    className="material-icons">thumb_up</i></div>) : ""}
                                        </div>))}
                                </div>
                            </div>
                        </div>
                        <div className="host-controls" onTouchStart={(e) => e.target.focus()}>
                            {data.timed ? (<div className="host-controls-menu">
                                <div className="little-controls">
                                    <div className="game-settings">
                                        <div className="set-player-time"><i title="player time"
                                                                            className="material-icons">alarm</i>
                                            {(isHost && !inProcess) ? (<input id="player-time"
                                                                              type="number"
                                                                              defaultValue={this.state.playerTime}
                                                                              min="0"
                                                                              onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                  && this.handleChangeParam(evt.target.valueAsNumber, "playerTime")}
                                            />) : (<span className="value">{this.state.playerTime}</span>)}
                                        </div>
                                        <div className="set-team-time"><i title="team time"
                                                                          className="material-icons">alarm</i>
                                            {(isHost && !inProcess) ? (<input id="team-time"
                                                                              type="number"
                                                                              defaultValue={this.state.teamTime} min="0"
                                                                              onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                  && this.handleChangeParam(evt.target.valueAsNumber, "teamTime")}
                                            />) : (<span className="value">{this.state.teamTime}</span>)}
                                        </div>
                                        <div className="set-master-time"><i title="master time"
                                                                            className="material-icons">alarm_on</i>
                                            {(isHost && !inProcess) ? (<input id="master-time"
                                                                              type="number"
                                                                              defaultValue={this.state.masterTime}
                                                                              min="0"
                                                                              onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                  && this.handleChangeParam(evt.target.valueAsNumber, "masterTime")}
                                            />) : (<span className="value">{this.state.masterTime}</span>)}
                                            <div className="set-reveal-time"><i title="reveal time"
                                                                                className="material-icons">alarm_on</i>
                                                {(isHost && !inProcess) ? (<input id="reveal-time"
                                                                                  type="number"
                                                                                  defaultValue={this.state.revealTime}
                                                                                  min="0"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeParam(evt.target.valueAsNumber, "revealTime")}
                                                />) : (<span className="value">{this.state.revealTime}</span>)}
                                            </div>
                                            <div className="set-words-level"><i title="words level"
                                                                                className="material-icons">school</i>
                                                {(isHost && !inProcess) ? (<input id="words-level"
                                                                                  type="number"
                                                                                  defaultValue={this.state.wordsLevel}
                                                                                  min="1"
                                                                                  max="4"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeParam(evt.target.valueAsNumber, "wordsLevel")}
                                                />) : (<span className="value">{this.state.wordsLevel}</span>)}
                                            </div>
                                            <div className="set-goal"><i title="goal"
                                                                         className="material-icons">flag</i>
                                                {(isHost && !inProcess) ? (<input id="goal"
                                                                                  type="number"
                                                                                  defaultValue={this.state.goal}
                                                                                  min="1"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeParam(evt.target.valueAsNumber, "goal")}
                                                />) : (<span className="value">{this.state.goal}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>) : ""}
                            <div className="side-buttons">
                                {this.state.userId === this.state.hostId ?
                                    <i onClick={() => this.socket.emit("set-room-mode", false)}
                                       className="material-icons exit settings-button">store</i> : ""}
                                {isHost ? (!inProcess
                                    ? (<i onClick={() => this.handleClickTogglePause()}
                                          className="material-icons start-game settings-button">play_arrow</i>)
                                    : (<i onClick={() => this.handleClickTogglePause()}
                                          className="material-icons start-game settings-button">pause</i>)) : ""}
                                {(isHost && data.paused) ? (data.teamsLocked
                                    ? (<i onClick={() => this.handleToggleTeamLockClick()}
                                          className="material-icons start-game settings-button">lock_outline</i>)
                                    : (<i onClick={() => this.handleToggleTeamLockClick()}
                                          className="material-icons start-game settings-button">lock_open</i>)) : ""}
                                {(isHost && data.paused) ? (!data.timed
                                    ? (<i onClick={() => this.handleToggleTimed()}
                                          className="material-icons start-game settings-button">alarm_off</i>)
                                    : (<i onClick={() => this.handleToggleTimed()}
                                          className="material-icons start-game settings-button">alarm</i>)) : ""}
                                {(isHost && data.paused)
                                    ? (<i onClick={() => this.handleClickRestart()}
                                          className="toggle-theme material-icons settings-button">sync</i>) : ""}
                                <i onClick={() => this.handleClickChangeName()}
                                   className="toggle-theme material-icons settings-button">edit</i>
                                {!parseInt(localStorage.muteSounds)
                                    ? (<i onClick={() => this.handleToggleMuteSounds()}
                                          className="toggle-theme material-icons settings-button">volume_up</i>)
                                    : (<i onClick={() => this.handleToggleMuteSounds()}
                                          className="toggle-theme material-icons settings-button">volume_off</i>)}
                                {!parseInt(localStorage.darkThemeDixit)
                                    ? (<i onClick={() => this.handleToggleTheme()}
                                          className="toggle-theme material-icons settings-button">brightness_2</i>)
                                    : (<i onClick={() => this.handleToggleTheme()}
                                          className="toggle-theme material-icons settings-button">wb_sunny</i>)}
                            </div>
                            <i className="settings-hover-button material-icons">settings</i>
                            <input id="avatar-input" type="file" onChange={evt => this.handleSetAvatar(evt)}/>
                        </div>
                        <CommonRoom state={this.state} app={this}/>
                    </div>
                </div>
            );
        } else return (<div/>);
    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));
