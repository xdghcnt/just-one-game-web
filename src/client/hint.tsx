class ScoreChange extends React.Component {
    render() {
        const {change} = this.props;
        if (change === undefined) {
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
        const {data, player, index} = this.props;
        const {bannedHints, hints, closedHints, playerLiked, userId, master, phase, wordGuessed, scoreChanges, rounds} = data;
        const banned = bannedHints[player];
        const isMaster = userId === master;
        const origText = hints[player] || (closedHints && closedHints[player]);
        const text = origText ? window.hyphenate(origText) : null;

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
                        <i className="material-icons">{
                            playerLiked === player ? "favorite" : "favorite_outline"
                        }</i>
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
            <div
                className={cs("card hint", {banned})}
                style={Messy.getStyle(rounds + '_' + index)}
            >
                {text != null
                    ? <div className={cs("hint-text", {banned})}>{text}</div>
                    : <div className="card-logo"
                           style={Messy.getLogoStyle(rounds + '_' + index)}/>}
                {corners}
            </div>
        )
    }
}

class Hints extends React.Component {
    render() {
        const {data, socket} = this.props;
        return (
            <div className="words">
                {data.playerHints.map((player, i) => (
                    <Hint player={player} data={data} socket={socket} key={i} index={i}/>
                ))}
            </div>
        );
    }
}

class Messy {
    static genZigzag() {
        let x = 0;
        const points = [{x, y: Math.random()}];
        const avgSpikes = 20;
        while (x < 1) {
            x += Math.random() / avgSpikes;
            x = Math.min(x, 1);
            points.push({x, y: Math.random()});
        }
        return points;
    }

    static frac2perc({x, y}, top) {
        const maxDent = 0.03;
        const xDent = (top) ? x : 1 - x;
        const yDent = (top) ? maxDent * y : 1 - maxDent * y;
        const n2text = (n) => (n * 100).toFixed(1) + '%';
        return n2text(xDent) + ' ' + n2text(yDent);
    }

    static genPath() {
        const percentages = [
            ...this.genZigzag().map(p => this.frac2perc(p, true)),
            ...this.genZigzag().map(p => this.frac2perc(p, false)),
        ];
        const path = `polygon(${percentages.join()})`;
        return path;
    }

    static genTransform() {
        return `rotate(${(Math.random() - 0.5) * 6}deg)`;
    }

    static genLogoTransform() {
        return `rotate(${((Math.random() - 0.5) * 50) - 7}deg)`;
    }

    static getBackgroundPosition() {
        return `${(Math.random() - 0.5) * 200}% ${(Math.random() - 0.5) * 200}%`;
    }

    static cache = {}
    static cacheLogo = {}

    static getStyle(key) {
        if (!this.cache.hasOwnProperty(key)) {
            this.cache[key] = {
                clipPath: this.genPath(),
                transform: this.genTransform(),
                backgroundPosition: this.getBackgroundPosition()
            }
        }
        return this.cache[key];
    }

    static getLogoStyle(key) {
        if (!this.cacheLogo.hasOwnProperty(key)) {
            this.cacheLogo[key] = {
                transform: this.genLogoTransform()
            }
        }
        return this.cacheLogo[key];
    }

}