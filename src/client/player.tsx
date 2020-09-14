import React, { useContext } from "react";
import { Avatar } from './avatar';
import { DataContext, SocketContext } from "./gameContext";
import { t } from "./translation_ru";

type UserProps = { id: UserId };

const PlayerHostControls = ({ id }: UserProps) => {
    const { hostId, userId, playerNames } = useContext(DataContext);
    const socket = useContext(SocketContext);
    const isHost = hostId === userId;
    const userHost = hostId === id;
    const self = id === userId;

    const removePlayer = (evt: React.MouseEvent<HTMLElement, MouseEvent>) => {
        evt.stopPropagation();
        popup.confirm(
            {content: `Removing ${playerNames[id]}?`},
            (evt) => evt.proceed && socket.emit("remove-player", id)
        );
    }

    const giveHost = (evt: React.MouseEvent<HTMLElement, MouseEvent>) => {
        evt.stopPropagation();
        popup.confirm(
            {content: `Give host ${playerNames[id]}?`},
            (evt) => evt.proceed && socket.emit("give-host", id)
        );
    }

    return (
        <div className="player-host-controls">
            {isHost && !self && (<>
                <i className="material-icons host-button"
                    title="Give host"
                    onClick={giveHost}>
                    vpn_key
                </i>
                <i className="material-icons host-button"
                    title="Remove"
                    onClick={removePlayer}>
                    delete_forever
                </i>
            </>)}
            {userHost && (
                <i className="material-icons host-button inactive"
                    title="Game host">
                    stars
                </i>
            )}
        </div>
    )
}

const Player = ({ id }: UserProps) => {
    const {master, readyPlayers, onlinePlayers, userId, playerNames, playerScores} = useContext(DataContext);
    const isReady = readyPlayers.includes(id);
    const isMaster = id === master;
    const self = id === userId;
    const clickSaveAvatar = () => document.getElementById("avatar-input")?.click();

    return (
        <div className={cs("player", {
            ready: isReady && !isMaster,
            offline: !~onlinePlayers.indexOf(id),
            self,
            master: isMaster,
        })} onTouchStart={(e) => (e.target as HTMLElement).focus()}>
            <div className="player-inner">
                <div className="player-avatar-section"
                        onTouchStart={(e) => (e.target as HTMLElement).focus()}
                        onClick={() => self && clickSaveAvatar()}>
                    <Avatar player={id}/>
                    {self && (<i 
                        className="change-avatar-icon material-icons"
                        title="Change avatar"
                    >
                        edit
                    </i>)}
                </div>
                <div className="player-name-section">
                    <span className="player-name">
                        {playerNames[id]}
                    </span>
                    &nbsp;
                    <PlayerHostControls id={id}/>
                    <span className="spacer"/>
                    <span className="score-cont">
                        <span className="score">
                            {playerScores[id] || 0}
                        </span>
                    </span>
                </div>
            </div>
        </div>
    );
}

export const PlayerList = () => {
    const { teamsLocked, players, userId } = useContext(DataContext);
    const isPlayer = players.includes(userId);
    const socket = useContext(SocketContext);

    const joinPlayersClick = (evt: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        evt.stopPropagation();
        if (!teamsLocked) socket.emit("players-join");
    }

    return (
        <div className="player-list-section">
            <div className="player-list">
                {players.map(id => <Player key={id} id={id} />)}
                {!isPlayer && (
                    <div
                        className="player join-button"
                        onClick={joinPlayersClick}
                    >
                        <div className="player-inner">
                            <div className="player-avatar-section">
                                <div className="avatar"/>
                            </div>
                            <div className="player-name-section">
                            <span className="player-name">
                                {t('Enter')}
                            </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const Spectator = ({ id }: UserProps) => {
    const { playerNames, userId } = useContext(DataContext);
    const self = id === userId;
    return (
        <span className={cs("spectator", {self})}>
            &nbsp;●&nbsp;
            <span className="spectator-name">
                {playerNames[id]}
            </span>
            &nbsp;
            <PlayerHostControls id={id} />
        </span>
    )
}

export const SpectatorList = () =>  {
    const { teamsLocked, spectators } = useContext(DataContext);
    const socket = useContext(SocketContext);
    const empty = spectators.length === 0;

    const joinSpectatorsClick = (evt: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        evt.stopPropagation();
        if (!teamsLocked) socket.emit("spectators-join");
    }

    return (
        <div className="spectator-placeholder">
            <div className={cs('spectators-section')}>
                <div
                    className={cs("spectators", {empty})}
                    onClick={joinSpectatorsClick}
                >
                    {t('Spectators')}:{empty && ' ...'}
                    {spectators.map(id => <Spectator key={id} id={id} /> )}
                </div>
            </div>
        </div>
    )
}