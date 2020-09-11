import React, { Component } from "react";
import { Avatar } from './avatar';
import { Messy } from './hint';
import { TimeLeftBar } from './timeLeftBar';
import { t } from "./translation_ru";

class ReadyBtn extends Component<{isReady: boolean, socket: WebSocketChannel}> {

    toggleReady() {
        this.props.socket.emit("toggle-ready");
    }

    render() {
        const {isReady} = this.props;
        return (
            <div
                className={cs('ready-button', {isReady})}
                onClick={() => this.toggleReady()}
            >
                <i className="material-icons">fast_forward</i>
            </div>
        )
    }
}

class Title extends Component<{text: string}> {
    render() {
        return (
            <div className="title">
                {this.props.text}
            </div>
        )
    }
}

class ClosedWord extends Component<{text: string | null, mistake?: boolean}> {
    render() {
        const {text, mistake} = this.props;
        return (
            <div className={cs("card closed-word", {mistake, back: !mistake && text == null})}>
                {(text != null || mistake)
                    ? <div>{window.hyphenate(text ? text : `(${t("empty")})`)}</div>
                    : <div className="card-logo"/>}
                {this.props.children}
            </div>
        )
    }
}

class HintForm extends Component<{data: FullState, socket: WebSocketChannel}> {
    addHint() {
        const input = document.getElementById("hint-input") as HTMLInputElement;
        this.props.socket.emit("add-hint", input.value);
    }

    onKeyDown(evt: React.KeyboardEvent<HTMLInputElement>) {
        evt.stopPropagation();
        if (evt.key === "Enter") {
            this.addHint();
        }
    }

    render() {
        const {data} = this.props;
        const {userId, closedWord, master, rounds} = data;
        return (
            <div className="hint-form">
                <div className="hint-cont">
                    <div
                        className="card hint"
                        style={Messy.getStyle(rounds + '_' + 'input')}
                    >
                        <input
                            id="hint-input"
                            type="text"
                            autoComplete="off"
                            autoFocus={true}
                            onKeyDown={(evt) => this.onKeyDown(evt)}
                        />
                        <div className="bl-corner">
                            <Avatar data={data} player={userId}/>
                        </div>
                        <div className="br-corner">
                            <div
                                className="add-command-button"
                                onClick={() => this.addHint()}
                            >
                                <i className="material-icons">send</i>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="avatar-arrow">
                    <Avatar data={data} player={master}/>
                </div>
                <ClosedWord text={closedWord}/>
            </div>
        )
    }
}

class MasterTarget extends Component<{data: FullState}> {
    render() {
        const {data} = this.props;
        const {master, closedWord} = data;
        return (
            <div className="master-target">
                <ClosedWord text={closedWord}/>
                <div className="master-avatar">
                    <Avatar data={data} player={master}/>
                </div>
            </div>
        )
    }
}

class ClosedWordForm extends Component<{data: FullState, socket: WebSocketChannel}> {
    guessWord() {
        const input = document.getElementById("closed-word-input") as HTMLInputElement;
        this.props.socket.emit("guess-word", input.value);
    }

    onKeyDown(evt: React.KeyboardEvent<HTMLInputElement>) {
        evt.stopPropagation();
        if (evt.key === "Enter") {
            this.guessWord();
        }
    }

    render() {
        const {data} = this.props;
        const {userId} = data;

        return (
            <div className="card closed-word">
                <input
                    id="closed-word-input"
                    type="text"
                    autoComplete="off"
                    autoFocus={true}
                    onKeyDown={(evt) => this.onKeyDown(evt)}
                />
                <div className="bl-corner">
                    <Avatar data={data} player={userId}/>
                </div>
                <div className="br-corner">
                    <div
                        className="add-command-button"
                        onClick={() => this.guessWord()}
                    >
                        <i className="material-icons">send</i>
                    </div>
                </div>
            </div>
        )
    }
}


class ClosedWordResult extends Component<{data: FullState}> {
    render() {
        const {data} = this.props;
        const {wordGuessed, guessedWord, word, master, scoreChanges} = data;
        if (master && wordGuessed) {
            return (
                <ClosedWord text={word}>
                    <div className="tl-corner">
                        <div className="score-change">
                            {'+' + scoreChanges[master]}
                        </div>
                    </div>
                    <div className="bl-corner">
                        <Avatar data={data} player={master}/>
                    </div>
                </ClosedWord>
            )
        }
        return (
            <div className="closed-word-result">
                <ClosedWord text={word}/>
                <ClosedWord text={guessedWord} mistake={true}>
                    <div className="bl-corner">
                        <Avatar data={data} player={master}/>
                    </div>
                </ClosedWord>
            </div>
        )
    }
}

export class StatusBar extends Component<{ data: FullState, socket: WebSocketChannel }> {
    render() {
        const {data, socket} = this.props;
        const {
            phase, players, playerWin, timed, time, userId,
            master, readyPlayers, playerNames
        } = data;
        const isMaster = userId === master;
        const isReady = readyPlayers.includes(userId);
        const isPlayer = players.includes(userId);

        const enoughText = (players.length > 2)
            ? t('Host can start game')
            : t('Not enough players (minimum 3)');

        let content
        let subtitle = null
        let hasReady = false
        if (phase === 0 && !playerWin) {
            content = <MasterTarget data={data}/>;
            subtitle = enoughText;
        } else if (phase === 1) {
            if (isMaster) {
                content = <MasterTarget data={data}/>;
                subtitle = t("Wait for players to write their hints");
            } else if (isReady) {
                content = <MasterTarget data={data}/>;
                subtitle = t("Wait for players to write their hints");
            } else if (isPlayer) {
                content = <HintForm data={data} socket={socket}/>;
                subtitle = t("Write your hint");
            } else {
                content = <MasterTarget data={data}/>;
                subtitle = t("Wait for players to write their hints");
            }
        } else if (phase === 2) {
            if (isMaster) {
                content = <MasterTarget data={data}/>;
                subtitle = t("Wait for players to delete duplicates");
            } else {
                content = <MasterTarget data={data}/>;
                subtitle = t("Delete duplicates");
                hasReady = isPlayer;
            }
        } else if (phase === 3) {
            if (isMaster) {
                content = <ClosedWordForm data={data} socket={socket}/>;
                subtitle = t("Now try guess the original word");
            } else if (master) {
                content = <MasterTarget data={data}/>;
                subtitle = t('Now ') + playerNames[master] + t(' should guess original word');
            }
        } else if (phase === 4) {
            content = <ClosedWordResult data={data}/>;
            subtitle = t("Next round");
            hasReady = isPlayer;
        } else if (phase === 0 && playerWin) {
            content = <div className="player-win">
                <Avatar data={data} player={playerWin}/>
                <Title text={t('The winner is') + ' ' + playerNames[playerWin] + '!'}/>
            </div>;
            subtitle = enoughText;
        }

        return (
            <div className="status-bar-wrap">
                <div className="status-bar">
                    <div className="aligner">
                        {content}
                    </div>
                    {subtitle && <div className="subtitle">{subtitle}</div>}
                    {hasReady && <ReadyBtn isReady={isReady} socket={socket}/>}
                    {timed && time !== null && <TimeLeftBar data={data} />}
                </div>
            </div>
        )
    }
}

