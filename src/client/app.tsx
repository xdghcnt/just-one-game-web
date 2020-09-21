import React, { Component } from "react";
import { render } from "react-dom";
import { StatusBar } from './statusBar';
import { Hints } from './hint';
import { PlayerList, SpectatorList } from './player';
import { HostControls } from './hostControls';
import { AvatarSaver } from './avatar';
import { InitUserArgs, RoomState, PlayerState } from '../common/messages';
import { makeId } from '../common/utils'
import { SocketContext, DataContext } from './gameContext';
import './global';
import './app.css';

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
            if (window.CommonRoom) {
                CommonRoom.processCommonRoom(state, this.state);
            } else {
                //Temporary hack to accommodate slow-loading standalone babel script
                setTimeout(() => {
                    CommonRoom.processCommonRoom(this.state, this.state);
                    this.refreshState();
                }, 1000);
            }
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
            const { master, userId, teamsLocked, inited, timed } = this.state;
            const isMaster = master === userId;
            const Socket = SocketContext.Provider;
            const Data = DataContext.Provider;
            return (
                <div className={cs("game", {timed})}>
                    <div className={cs("game-board", { active: inited, isMaster, teamsLocked })}>
                        <Socket value={this.socket}>
                            <Data value={this.state}>
                                <SpectatorList/>
                                <PlayerList/>
                                <StatusBar/>
                                <Hints/>
                                <AvatarSaver userToken={this.userToken} />
                                <HostControls refreshState={() => this.refreshState()} />
                            </Data>
                        </Socket>
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
