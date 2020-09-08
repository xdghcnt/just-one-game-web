import React, { Component } from "react";
import { render } from "react-dom";
import { StatusBar } from './statusBar';
import { Hints } from './hint';
import { PlayerList, SpectatorList } from './player';
import { HostControls } from './hostControls';
import { AvatarSaver } from './avatar';
import { InitUserArgs, RoomState, PlayerState } from '../common/messages';

declare global {
    interface WebSocketChannel {
        on(messageName: string, callback: (d: any) => any): WebSocketChannel;
        emit(messageName: string, data?: any): any;
    }

    interface Window {
        wssToken?: string;
        socket?: WebSocketWrapper;
    }

    type CommonRoomComponent =
        (new() => Component<{state: FullState, app: Game}>)
        & { processCommonRoom: (serverState: any, clientState: any) => any };

    const CommonRoom: CommonRoomComponent;

    type popupModal = (
        options: object,
        callback?: (popupReturnObj: {
            proceed?: boolean,
            input_value?: string
        }) => any
    ) => void;

    const popup: {
        alert: popupModal;
        prompt: popupModal;
        confirm: popupModal;
    };

    const cs: (...args: any[]) => string;

    type HollowState = {
        inited: false;
    }

    type FullState = RoomState & PlayerState & {
        inited: true;
        userId: string;
    }

    type DisconnectedState = Partial<RoomState> & {
        inited: false;
        disconnected: true;
        disconnectReason: any;
    }

    type GameCompState = HollowState | FullState | DisconnectedState;

    class ConnectedComponent extends Component<{data: FullState, socket: WebSocketChannel}> {}
}

interface WebSocketWrapper {
    of(channelName: string): WebSocketChannel;
    on(messageName: string, callback: (data: any) => any): void;
}


function makeId() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

class Game extends Component<{}, GameCompState> {

    userId?: string;
    userToken?: string;
    socket?: WebSocketChannel;
    masterSound?: HTMLAudioElement;
    storySound?: HTMLAudioElement;
    revealSound?: HTMLAudioElement;
    tapSound?: HTMLAudioElement;
    phase2StatusBar?: () => void;

    constructor(props) {
        super(props);
        this.state = {
            inited: false
        };
    }

    componentDidMount() {
        const initArgs : InitUserArgs = {
            avatarId: localStorage.avatarId,
            roomId: location.hash.substr(1),
            userId: this.userId = localStorage.dixitUserId,
            token: this.userToken = localStorage.dixitUserToken,
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
            history.replaceState(undefined, undefined, location.origin + location.pathname + "#" + makeId());
        else
            history.replaceState(undefined, undefined, location.origin + location.pathname + location.hash);
        if (localStorage.acceptDelete) {
            initArgs.acceptDelete = localStorage.acceptDelete;
            delete localStorage.acceptDelete;
        }
        this.socket = window.socket.of("just-one");
        // this.player = {cards: []}; //Seems deprecated.
        this.socket.on("state", (state: RoomState) => {
            CommonRoom.processCommonRoom(state, this.state);
            if (this.state.inited) {
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
                if (this.state.phase !== 2 && state.phase === 2)
                    this.phase2StatusBar && this.phase2StatusBar();
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
        this.socket.on("auth-required", () => {
            this.setState(Object.assign({}, this.state, {
                userId: this.userId,
                authRequired: true
            }));
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
        this.tapSound = new Audio("/just-one/tap.mp3");
        this.tapSound.volume = 0.3;
        this.storySound = new Audio("/just-one/start.mp3");
        this.storySound.volume = 0.4;
        this.revealSound = new Audio("/just-one/reveal.mp3");
        this.revealSound.volume = 0.3;
        this.masterSound = new Audio("/just-one/master.mp3");
        this.masterSound.volume = 0.7;
    }

    setTime(time) {
        this.setState(Object.assign({}, this.state, {time: time}));
    }

    refreshState() {
        this.setState(Object.assign({}, this.state));
    }

    //TODO: move to Hints component
    getOptimalWidth({players}) {
        const numCards = players.length - 1;
        const contWidth = window.innerWidth - 20; //approximate
        if (numCards <= 6 || contWidth < 760) {
            return null;
        } else {
            const cardWidth = 210 + 25; //approximate
            const originalNumCols = Math.floor(contWidth / cardWidth);
            const originalNumRows = Math.ceil(numCards / originalNumCols);
            let numRows = originalNumRows;
            let numCols = originalNumCols;
            while (numRows === originalNumRows) {
                numCols-- ;
                numRows = Math.ceil(numCards / numCols);
            };
            numCols++;
            return ({ maxWidth: numCols * cardWidth + 'px' });
        }

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
                    <div className={
                        cs("game-board", {
                            active: this.state.inited,
                            isMaster,
                            teamsLocked: data.teamsLocked
                    })}>
                        <SpectatorList data={data} socket={socket} />
                        <PlayerList data={data} socket={socket}  />
                        <div className="main-row">
                            <StatusBar data={data} socket={socket}
                                setTime={(time) => this.setTime(time)}
                                //Notify about phase 2
                                //https://stackoverflow.com/questions/37949981/call-child-method-from-parent#45582558
                                setPhase2={cb => this.phase2StatusBar = cb}
                            />
                        </div>
                        <div className="main-row" style={this.getOptimalWidth(data)}>
                            <Hints data={data} socket={socket} />
                        </div>
                        <AvatarSaver socket={socket}
                            userId={this.userId}
                            userToken={this.userToken}
                        />
                        <HostControls data={data} socket={socket}
                            refreshState={() => this.refreshState()}
                        />
                        <CommonRoom state={this.state} app={this}/>
                    </div>
                </div>
            );
        } else {
            return (<div/>);
        }
    }
}

render(<Game/>, document.getElementById('root'));
