import React, { useContext } from "react";
import { Avatar } from './avatar';
import { getMessy } from './messy';
import { TimeLeftBar } from './timeLeftBar';
import { t } from "./translation_ru";
import { SocketContext, DataContext } from './gameContext';

type ReadyBtnProps = { isReady: boolean };

const ReadyBtn = ({ isReady }: ReadyBtnProps) => {
    const socket = useContext(SocketContext);
    return (
        <div
            className={cs('ready-button', {isReady})}
            onClick={() => socket.emit("toggle-ready")}
        >
            <i className="material-icons">fast_forward</i>
        </div>
    )
}

const WinScreen = () => {
    const { playerWin, playerNames } = useContext(DataContext);
    if (playerWin === null || !playerNames[playerWin]) {
        return null;
    } else {
        return (
            <div className="player-win">
                <Avatar player={playerWin}/>
                    <div className="title">
                        {t('The winner is') + ' ' + playerNames[playerWin] + '!'}
                    </div>
            </div>
        )
    }
}

type ClosedWordProps = {
    text: string | null;
    mistake?: boolean;
    children?: React.ReactNode;
}

const ClosedWord = ({text, mistake, children}: ClosedWordProps) => {
    return (
        <div className={cs("card closed-word", {mistake, back: !mistake && text == null})}>
            {(text != null || mistake)
                ? <div>{window.hyphenate(text ? text : `(${t("empty")})`)}</div>
                : <div className="card-logo"/>}
            {children}
        </div>
    )
}

const HintForm = () => {
    const { userId, closedWord, master, rounds } = useContext(DataContext);
    const socket = useContext(SocketContext);

    const addHint = () => {
        const input = document.getElementById("hint-input") as HTMLInputElement;
        socket.emit("add-hint", input.value);
    }

    const onKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
        evt.stopPropagation();
        if (evt.key === "Enter") {
            addHint();
        }
    }

    return (
        <div className="hint-form">
            <div className="hint-cont">
                <div
                    className="card hint"
                    style={getMessy('card', rounds + '_' + 'input')}
                >
                    <input
                        id="hint-input"
                        type="text"
                        autoComplete="off"
                        autoFocus={true}
                        onKeyDown={onKeyDown}
                    />
                    <div className="bl-corner">
                        <Avatar player={userId}/>
                    </div>
                    <div className="br-corner">
                        <div
                            className="add-command-button"
                            onClick={addHint}
                        >
                            <i className="material-icons">send</i>
                        </div>
                    </div>
                </div>
            </div>
            <div className="avatar-arrow">
                <Avatar player={master}/>
            </div>
            <ClosedWord text={closedWord}/>
        </div>
    )
}

const MasterTarget = () => {
    const {master, closedWord} = useContext(DataContext);
    return (
        <div className="master-target">
            <ClosedWord text={closedWord}/>
            <div className="master-avatar">
                <Avatar player={master}/>
            </div>
        </div>
    )
}

const ClosedWordForm = () => {
    const { userId } = useContext(DataContext);
    const socket = useContext(SocketContext);

    const guessWord = () => {
        const input = document.getElementById("closed-word-input") as HTMLInputElement;
        socket.emit("guess-word", input.value);
    }

    const onKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
        evt.stopPropagation();
        if (evt.key === "Enter") {
            guessWord();
        }
    }

    return (
        <div className="card closed-word">
            <input
                id="closed-word-input"
                type="text"
                autoComplete="off"
                autoFocus={true}
                onKeyDown={onKeyDown}
            />
            <div className="bl-corner">
                <Avatar player={userId}/>
            </div>
            <div className="br-corner">
                <div
                    className="add-command-button"
                    onClick={guessWord}
                >
                    <i className="material-icons">send</i>
                </div>
            </div>
        </div>
    )
}


const ClosedWordResult = () => {
    const {wordGuessed, guessedWord, word, master, scoreChanges} = useContext(DataContext);
    if (master && wordGuessed) {
        return (
            <ClosedWord text={word}>
                <div className="tl-corner">
                    <div className="score-change">
                        {'+' + scoreChanges[master]}
                    </div>
                </div>
                <div className="bl-corner">
                    <Avatar player={master}/>
                </div>
            </ClosedWord>
        )
    }
    return (
        <div className="closed-word-result">
            <ClosedWord text={word}/>
            <ClosedWord text={guessedWord} mistake={true}>
                <div className="bl-corner">
                    <Avatar player={master}/>
                </div>
            </ClosedWord>
        </div>
    )
}

export const StatusBar = () => {
    const data = useContext(DataContext);
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
        content = <MasterTarget/>;
        subtitle = enoughText;
    } else if (phase === 1) {
        if (isMaster) {
            content = <MasterTarget/>;
            subtitle = t("Wait for players to write their hints");
        } else if (isReady) {
            content = <MasterTarget/>;
            subtitle = t("Wait for players to write their hints");
        } else if (isPlayer) {
            content = <HintForm/>;
            subtitle = t("Write your hint");
        } else {
            content = <MasterTarget/>;
            subtitle = t("Wait for players to write their hints");
        }
    } else if (phase === 2) {
        if (isMaster) {
            content = <MasterTarget/>;
            subtitle = t("Wait for players to delete duplicates");
        } else {
            content = <MasterTarget/>;
            subtitle = t("Delete duplicates");
            hasReady = isPlayer;
        }
    } else if (phase === 3) {
        if (isMaster) {
            content = <ClosedWordForm/>;
            subtitle = t("Now try guess the original word");
        } else if (master) {
            content = <MasterTarget/>;
            subtitle = t('Now ') + playerNames[master] + t(' should guess original word');
        }
    } else if (phase === 4) {
        content = <ClosedWordResult/>;
        subtitle = t("Next round");
        hasReady = isPlayer;
    } else if (phase === 0 && playerWin) {
        content = <WinScreen/>;
        subtitle = enoughText;
    }

    return (
        <div className="main-row">
            <div className="status-bar-wrap">
                <div className="status-bar">
                    <div className="aligner">
                        {content}
                    </div>
                    {subtitle && <div className="subtitle">{subtitle}</div>}
                    {hasReady && <ReadyBtn isReady={isReady}/>}
                    {timed && time !== null && <TimeLeftBar data={data} />}
                </div>
            </div>
        </div>
    )
}

