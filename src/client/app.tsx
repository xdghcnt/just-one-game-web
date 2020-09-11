import React, { Component } from "react";
import { render } from "react-dom";
import { StatusBar } from './statusBar';
import { Hints } from './hint';
import { PlayerList, SpectatorList } from './player';
import { HostControls } from './hostControls';
import { AvatarSaver } from './avatar';
import { InitUserArgs, RoomState, PlayerState } from '../common/messages';
import './global';

function makeId() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

class Game extends Component<{}, GameCompState> {

    userId = localStorage.dixitUserId;
    userToken = localStorage.dixitUserToken;
    socket = window.socket.of("just-one");
    sounds: Record<string, HTMLAudioElement> = {};

    constructor(props: any) {
        super(props);
        this.state = {
            inited: false
        }
    }

    componentDidMount() {
        const initArgs : InitUserArgs = {
            avatarId: localStorage.avatarId,
            roomId: location.hash.substr(1),
            userId: this.userId,
            token: this.userToken,
            userName: localStorage.userName,
            wssToken: window.wssToken
        };
        if (!parseInt(localStorage.darkThemeDixit))
            document.body.classList.add("dark-theme");
        if (!localStorage.dixitUserId || !localStorage.dixitUserToken) {
            while (!localStorage.userName)
                localStorage.userName = prompt("Your name");
            localStorage.dixitUserId = makeId();
            localStorage.dixitUserToken = makeId();
        }
        if (!location.hash)
            history.replaceState(undefined, '', location.origin + location.pathname + "#" + makeId());
        else
            history.replaceState(undefined, '', location.origin + location.pathname + location.hash);
        if (localStorage.acceptDelete) {
            initArgs.acceptDelete = localStorage.acceptDelete;
            delete localStorage.acceptDelete;
        }
        window.hyphenate = createHyphenator(hyphenationPatternsRu);
        this.socket.on("state", (state: RoomState) => {
            //Temporary hack to accommodate slow-loading standalone babel script
            setTimeout(() => {
                CommonRoom.processCommonRoom(state, this.state);
                this.refreshState();
            }, 1000);
            if (this.state.inited) {
                if (this.state.phase && state.phase !== 0 && !parseInt(localStorage.muteSounds)) {
                    if (this.state.master !== this.userId && state.master === this.userId)
                        this.sounds.master.play();
                    else if (this.state.phase === 1 && state.phase === 2)
                        this.sounds.start.play();
                    else if (this.state.phase === 2 && state.phase === 3)
                        this.sounds.reveal.play();
                    else if (state.phase === 2 && this.state.readyPlayers.length !== state.readyPlayers.length)
                        this.sounds.tap.play();
                }
            }
            this.setState(Object.assign({
                userId: this.userId
            }, state));
        });
        this.socket.on("player-state", (state: PlayerState) => {
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
        this.socket.on("ping", (id) => {
            this.socket.emit("pong", id);
        });
        document.title = `Just one - ${initArgs.roomId}`;
        this.socket.emit("init", initArgs);

        const soundVolume: Record<string, number> = {
            master: 0.7,
            start: 0.4,
            reveal: 0.3,
            tap: 0.3
        }
        for (const name in soundVolume) {
            this.sounds[name] = new Audio(`/just-one/${name}.mp3`);
            this.sounds[name].volume = soundVolume[name];
        }
    }

    refreshState() {
        this.setState(Object.assign({}, this.state));
    }

    render() {
        if ('disconnected' in this.state && this.state.disconnected) {
            return (<div className="kicked">
                Disconnected{this.state.disconnectReason ? ` (${this.state.disconnectReason})` : ""}
            </div>);
        } else if (this.state.inited) {
            const
                data = this.state,
                isMaster = data.master === data.userId,
                socket = this.socket;
            return (
                <div className={cs("game", {timed: this.state.timed})}>
                    <div className={cs("game-board", {
                        active: this.state.inited,
                        isMaster,
                        teamsLocked: data.teamsLocked
                    })}>
                        <SpectatorList data={data} socket={socket} />
                        <PlayerList data={data} socket={socket}  />
                        <StatusBar data={data} socket={socket} />
                        <Hints data={data} socket={socket} />
                        <AvatarSaver socket={socket}
                            userId={this.userId}
                            userToken={this.userToken}
                        />
                        <HostControls data={data} socket={socket}
                            refreshState={() => this.refreshState()}
                        />
                        {window.CommonRoom && <CommonRoom state={this.state} app={this}/>}
                    </div>
                </div>
            );
        } else {
            return (<div/>);
        }
    }
}

render(<Game/>, document.getElementById('root'));
