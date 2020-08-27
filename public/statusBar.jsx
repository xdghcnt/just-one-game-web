//import React from "react";
//import ReactDOM from "react-dom"
//import Avatar from '../player.jsx' 


class StatusBar extends React.Component {
    componentDidMount() {
        this.timerSound = new Audio("/just-one/tick.mp3");
        this.timerSound.volume = 0.4;
    }

    updateTimer(time) {
        const data = this.props.data
        const timeTotal = {
            1: data.playerTime,
            2: data.teamTime,
            3: data.masterTime,
            4: data.revealTime,
        }[data.phase] * 1000;
        this.progressBarUpdate(timeTotal - time, timeTotal);
    }

    progressBarUpdate(x, outOf) {
        let firstHalfAngle = 180,
            secondHalfAngle = 0;

        // calculate the angle
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

    addCommandClick() {
        this.props.socket.emit(
            this.props.data.phase === 1 ? "add-hint" : "guess-word",
            document.getElementById("command-input").value
        );
    }

    clickToggleReady() {
        this.props.socket.emit("toggle-ready");
    }

    render() {
        const
            setTime = this.props.setTime,
            data = this.props.data;

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

        if (data.phase !== 0 && data.timed) {
            let timeStart = new Date();
            this.timerTimeout = setTimeout(() => {
                if (data.timed && !data.paused) {
                    let prevTime = data.time,
                        time = prevTime - (new Date - timeStart);
                    setTime(time);
                    this.updateTimer(time);
                    if (![2, 4].includes(data.phase) && data.timed && time < 5000
                        && ((Math.floor(prevTime / 1000) - Math.floor(time / 1000)) > 0) && !parseInt(localStorage.muteSounds))
                        this.timerSound.play();
                }
                if (!data.timed)
                    this.updateTimer(0);
            }, 1000);
        }

        return (
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
                                        && evt.key === "Enter" && this.addCommandClick()}/>
                                <div className="add-command-button"
                                    onClick={() => this.addCommandClick()}>➜
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
                                onClick={() => this.clickToggleReady()}
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
        );
    }
}

