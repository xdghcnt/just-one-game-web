import React, { useContext } from "react";
import { Avatar } from "./avatar";
import { SocketContext, DataContext } from './gameContext';
import { getMessy } from './messy';
import './card.css';

type HintProps = {
    player: UserId;
    index: number;
}

const Hint = ({ player, index }: HintProps ) => {
    const socket = useContext(SocketContext);
    const {
        bannedHints, hints, closedHints, playerLiked, userId,
        master, phase, wordGuessed, scoreChanges, rounds
    } = useContext(DataContext);
    const banned = bannedHints[player];
    const isMaster = userId === master;
    const origText = hints[player] || (closedHints && closedHints[player]);
    const text = origText ? window.hyphenate(origText) : null;

    const corners = [];
    if (!isMaster || playerLiked || (phase === 4 && !wordGuessed)) {
        corners.push(
            <div className="bl-corner">
                <Avatar player={player}/>
            </div>
        )
    }
    if (phase === 2 || (phase === 4 && banned)) {
        corners.push(
            <div className="tr-corner">
                <div
                    className="ban-hint-button"
                    onClick={() => socket.emit("toggle-hint-ban", player)}
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
                    onClick={() => socket.emit("set-like", player)}
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
    const messyKey = rounds + '_' + index;

    return (
        <div
            className={cs("card hint", {banned})}
            style={getMessy('card', messyKey)}
        >
            {text != null
                ? <div className={cs("hint-text", {banned})}>{text}</div>
                : <div className="card-logo"
                       style={getMessy('card-logo', messyKey)}/>}
            {corners}
        </div>
    )
}

const getOptimalWidth = ( numPlayers: number ): React.CSSProperties => {
    const numCards = numPlayers - 1;
    const contWidth = window.innerWidth - 20; //approximate
    if (numCards <= 6 || contWidth < 760) {
        return {};
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

export const Hints = () => {
    const { players, playerHints } = useContext(DataContext);
    const optimalWidth = getOptimalWidth(players.length);
    return (
        <div className="main-row" style={optimalWidth}>
            <div className="words">
                {playerHints.map((player, i) => (
                    <Hint player={player} key={i} index={i}/>
                ))}
            </div>
        </div>
    );
}