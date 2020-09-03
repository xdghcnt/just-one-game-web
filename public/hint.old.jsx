<div className="words">
{data.playerHints.map((player) => (
    <div className={cs("word", {
        banned: data.bannedHints[player]
    })}>
        <div className="word-box">
            <span>{window.hyphenate(data.hints[player] || (data.closedHints && data.closedHints[player]) || "xxx")}</span>
            <div className="card-votes">
                <div className="player-vote">
                    {data.userId !== data.master || data.playerLiked
                        ? (<Avatar data={data} player={player}/>) : ""}
                </div>
            </div>
        </div>
        {data.phase === 2 || (data.phase === 4 && data.bannedHints[player]) ? (
            <div className="ban-hint-button"
                onClick={() => this.toggleHintBan(player)}>
                <i className="material-icons">warning</i></div>) : ""}
        {(data.playerLiked === player
            || (data.phase === 4 && !data.bannedHints[player] && data.master === data.userId
                && data.playerLiked == null && data.wordGuessed))
            ? (<div className="set-like-button"
                    onClick={() => this.setLike(player)}><i
                className="material-icons">thumb_up</i></div>) : ""}
        <ScoreChange change={data.scoreChanges[player]} />
    </div>
))}
</div>