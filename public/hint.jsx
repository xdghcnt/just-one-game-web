class ScoreChange extends React.Component {
    render() {
        const { change } = this.props;
        if ( change === undefined ) {
            return null;
        } else {
            const changeText = ((change > 0) ? '+' : '') + change;
            return (
                <span class="score-change">
                    {changeText}
                </span>
            );
        }
    }
}

class Hint extends React.Component {
    toggleHintBan(user) {
        this.props.socket.emit("toggle-hint-ban", user);
    }

    setLike(user) {
        this.props.socket.emit("set-like", user);
    }

    render() {
        const { data, player } = this.props;
        const { bannedHints, hints, closedHints, playerLiked, userId, master, phase, wordGuessed, scoreChanges } = data;
        const banned = bannedHints[player];
        const isMaster = userId === master;
        const text = window.hyphenate(hints[player] || (closedHints && closedHints[player]) || "xxx");

        const corners = [];
        if (!isMaster || playerLiked || (phase === 4 && !wordGuessed)) {
            corners.push(
                <div className="bl-corner">
                    <Avatar data={data} player={player}/>
                </div>
            )
        }
        if (phase === 2 || (phase === 4 && banned)) {
            corners.push(
                <div className="tr-corner">
                    <div
                        className="ban-hint-button"
                        onClick={() => this.toggleHintBan(player)}
                    >
                        <i className="material-icons">warning</i>
                    </div>
                </div>
            )
        }
        if (
            playerLiked === player
            || (phase === 4 && !banned && isMaster && playerLiked == null && wordGuessed)
        ) {
            corners.push(
                <div className="tr-corner">
                    <div
                        className="set-like-button"
                        onClick={() => this.setLike(player)}
                    >
                        <i className="material-icons">thumb_up</i>
                    </div>
                </div>
            )
        }
        const delta = scoreChanges[player];
        if (delta) {
            const changeText = ((delta > 0) ? '+' : '') + delta;
            corners.push(
                <div className="tl-corner">
                    <div className="score-change">
                        {changeText}
                    </div>
                </div>
            )
        }

        return (
            <div className={cs("card hint", { banned } )}>
                <div>
                    { text }
                </div>
                { corners }
            </div>
        )
    }
}

class Hints extends React.Component {
    render() {
        const { data, socket } = this.props;
        return (
            <div className="words">
                { data.playerHints.map((player) => (
                    <Hint player={player} data={data} socket={socket} />
                ))}
            </div> 
        );
    }
}