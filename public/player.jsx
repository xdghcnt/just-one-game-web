//import React from "react";
//import ReactDOM from "react-dom"

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
                     onClick={() => (id === data.userId) && this.props.avatarClick()}>
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
                               onClick={(evt) => this.props.giveHost(id, evt)}>
                                vpn_key
                            </i>) : ""}
                        {(data.hostId === data.userId && data.userId !== id) ? (
                            <i className="material-icons host-button"
                               title="Remove"
                               onClick={(evt) => this.props.removePlayer(id, evt)}>
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

class PlayerList extends React.Component {

    joinPlayersClick(evt) {
        evt.stopPropagation();
        if (!this.props.data.teamsLocked)
            this.props.socket.emit("players-join");
    }

    joinSpectatorsClick(evt) {
        evt.stopPropagation();
        if (!this.props.data.teamsLocked)
            this.props.socket.emit("spectators-join");
    }

    removePlayer(id, evt) {
        evt.stopPropagation();
        popup.confirm(
            {content: `Removing ${this.props.data.playerNames[id]}?`},
            (evt) => evt.proceed && this.props.socket.emit("remove-player", id)
        );
    }

    giveHost(id, evt) {
        evt.stopPropagation();
        popup.confirm(
            {content: `Give host ${this.props.data.playerNames[id]}?`},
            (evt) => evt.proceed && this.props.socket.emit("give-host", id))
        ;
    }

    clickSetAvatar() {
        document.getElementById("avatar-input").click();
    }

    sendAvatar(event, props) {
        const input = event.target;
        if (input.files && input.files[0]) {
            const file = input.files[0];
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
                        props.socket.emit("update-avatar", localStorage.avatarId);
                    } else if (xhr.readyState === 4 && xhr.status !== 200) popup.alert({content: "File upload error"});
                };
                fd.append("avatar", file);
                fd.append("userId", props.userId);
                fd.append("userToken", props.userToken);
                xhr.send(fd);
            } else
                popup.alert({content: "File shouldn't be larger than 5 MB"});
        }
    }

    render() {
        const
            data = this.props.data;
        return (
            <div className="player-list-section"
            onClick={(evt) => this.joinPlayersClick(evt)}>
                <div className="player-list">
                    {data.players.map((id => (
                        <Player key={id} data={data} id={id}
                                giveHost={(id, evt) => this.giveHost(id, evt)}
                                avatarClick={() => this.clickSetAvatar()}
                                removePlayer={(id, evt) => this.removePlayer(id, evt)}/>
                    )))}
                    {!~data.players.indexOf(data.userId) ? (
                        <div className="join-button">Play</div>) : ""}
                </div>
                <div className={cs("spectators", {empty: !data.spectators.length})}
                        onClick={(evt) => this.joinSpectatorsClick(evt)}>
                    {data.spectators.map((id => (
                        <Player key={id} data={data} id={id}
                                giveHost={(id) => this.giveHost(id)}
                                avatarClick={() => this.clickSetAvatar()}
                                removePlayer={(id, evt) => this.removePlayer(id, evt)}/>
                    )))}
                    {!~data.spectators.indexOf(data.userId) ? (
                        <div className="join-button">Spectate</div>) : ""}
                </div>
                <input
                    id="avatar-input"
                    type="file"
                    onChange={evt => this.sendAvatar(evt, this.props)}
                />
            </div>
        );
    }
}