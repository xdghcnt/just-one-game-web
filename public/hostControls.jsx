//import React from "react";
//import ReactDOM from "react-dom"

class HostControls extends React.Component {

    debouncedEmit() {
        clearTimeout(this.debouncedEmitTimer);
        this.debouncedEmitTimer = setTimeout(() => {
            this.props.socket.emit.apply(this.props.socket, arguments);
        }, 100);
    }

    changeParam(value, type) {
        this.debouncedEmit("set-param", type, value);
    }

    clickChangeName() {
        const { data, socket } = this.props;
        const { playerNames, userId } = data;
        popup.prompt({content: "New name", value: playerNames[userId] || ""}, (evt) => {
            if (evt.proceed && evt.input_value.trim()) {
                socket.emit("change-name", evt.input_value.trim());
                localStorage.userName = evt.input_value.trim();
            }
        });
    }

    toggleTheme() {
        localStorage.darkThemeDixit = !parseInt(localStorage.darkThemeDixit) ? 1 : 0;
        document.body.classList.toggle("dark-theme");
        this.props.refreshState()
    }

    toggleMuteSounds() {
        localStorage.muteSounds = !parseInt(localStorage.muteSounds) ? 1 : 0;
        this.props.refreshState()
    }

    clickTogglePause() {
        this.props.socket.emit("toggle-pause");
    }

    toggleTeamLockClick() {
        this.props.socket.emit("toggle-lock");
    }

    clickRestart() {
        if (!this.gameIsOver)
            popup.confirm(
                {content: "Restart? Are you sure?"},
                (evt) => evt.proceed && this.props.socket.emit("restart")
            );
        else
            this.props.socket.emit("restart")
    }

    toggleTimed() {
        this.props.socket.emit("toggle-timed");
    }

    setRoomMode() {
        this.props.socket.emit("set-room-mode", false);
    }


    render() {
        const
            data = this.props.data,
            isHost = data.hostId === data.userId,
            inProcess = data.phase !== 0 && !data.paused;
        return (
            <div className="host-controls" onTouchStart={(e) => e.target.focus()}>
                {data.timed ? (<div className="host-controls-menu">
                    <div className="little-controls">
                        <div className="game-settings">
                            <div className="set-player-time"><i title="player time"
                                                                className="material-icons">alarm</i>
                                {(isHost && !inProcess) ? (<input id="player-time"
                                                                type="number"
                                                                defaultValue={data.playerTime}
                                                                min="0"
                                                                onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                    && this.changeParam(evt.target.valueAsNumber, "playerTime")}
                                />) : (<span className="value">{data.playerTime}</span>)}
                            </div>
                            <div className="set-team-time"><i title="team time"
                                                            className="material-icons">alarm</i>
                                {(isHost && !inProcess) ? (<input id="team-time"
                                                                type="number"
                                                                defaultValue={data.teamTime} min="0"
                                                                onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                    && this.changeParam(evt.target.valueAsNumber, "teamTime")}
                                />) : (<span className="value">{data.teamTime}</span>)}
                            </div>
                            <div className="set-master-time"><i title="master time"
                                                                className="material-icons">alarm_on</i>
                                {(isHost && !inProcess) ? (<input id="master-time"
                                                                type="number"
                                                                defaultValue={data.masterTime}
                                                                min="0"
                                                                onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                    && this.changeParam(evt.target.valueAsNumber, "masterTime")}
                                />) : (<span className="value">{data.masterTime}</span>)}
                                <div className="set-reveal-time"><i title="reveal time"
                                                                    className="material-icons">alarm_on</i>
                                    {(isHost && !inProcess) ? (<input id="reveal-time"
                                                                    type="number"
                                                                    defaultValue={data.revealTime}
                                                                    min="0"
                                                                    onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                        && this.changeParam(evt.target.valueAsNumber, "revealTime")}
                                    />) : (<span className="value">{data.revealTime}</span>)}
                                </div>
                                <div className="set-words-level"><i title="words level"
                                                                    className="material-icons">school</i>
                                    {(isHost && !inProcess) ? (<input id="words-level"
                                                                    type="number"
                                                                    defaultValue={data.wordsLevel}
                                                                    min="1"
                                                                    max="4"
                                                                    onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                        && this.changeParam(evt.target.valueAsNumber, "wordsLevel")}
                                    />) : (<span className="value">{data.wordsLevel}</span>)}
                                </div>
                                <div className="set-goal"><i title="goal"
                                                            className="material-icons">flag</i>
                                    {(isHost && !inProcess) ? (<input id="goal"
                                                                    type="number"
                                                                    defaultValue={data.goal}
                                                                    min="1"
                                                                    onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                        && this.changeParam(evt.target.valueAsNumber, "goal")}
                                    />) : (<span className="value">{data.goal}</span>)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>) : ""}
                <div className="side-buttons">
                    {data.userId === data.hostId ?
                        <i onClick={() => this.setRoomMode()}
                        className="material-icons exit settings-button">store</i> : ""}
                    {isHost ? (!inProcess
                        ? (<i onClick={() => this.clickTogglePause()}
                            className="material-icons start-game settings-button">play_arrow</i>)
                        : (<i onClick={() => this.clickTogglePause()}
                            className="material-icons start-game settings-button">pause</i>)) : ""}
                    {(isHost && data.paused) ? (data.teamsLocked
                        ? (<i onClick={() => this.toggleTeamLockClick()}
                            className="material-icons start-game settings-button">lock_outline</i>)
                        : (<i onClick={() => this.toggleTeamLockClick()}
                            className="material-icons start-game settings-button">lock_open</i>)) : ""}
                    {(isHost && data.paused) ? (!data.timed
                        ? (<i onClick={() => this.toggleTimed()}
                            className="material-icons start-game settings-button">alarm_off</i>)
                        : (<i onClick={() => this.toggleTimed()}
                            className="material-icons start-game settings-button">alarm</i>)) : ""}
                    {(isHost && data.paused)
                        ? (<i onClick={() => this.clickRestart()}
                            className="toggle-theme material-icons settings-button">sync</i>) : ""}
                    <i onClick={() => this.clickChangeName()}
                    className="toggle-theme material-icons settings-button">edit</i>
                    {!parseInt(localStorage.muteSounds)
                        ? (<i onClick={() => this.toggleMuteSounds()}
                            className="toggle-theme material-icons settings-button">volume_up</i>)
                        : (<i onClick={() => this.toggleMuteSounds()}
                            className="toggle-theme material-icons settings-button">volume_off</i>)}
                    {!parseInt(localStorage.darkThemeDixit)
                        ? (<i onClick={() => this.toggleTheme()}
                            className="toggle-theme material-icons settings-button">brightness_2</i>)
                        : (<i onClick={() => this.toggleTheme()}
                            className="toggle-theme material-icons settings-button">wb_sunny</i>)}
                </div>
                <i className="settings-hover-button material-icons">settings</i>
            </div>
        )
    }
}