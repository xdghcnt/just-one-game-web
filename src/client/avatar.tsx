import React, { Component } from "react";

export class Avatar extends Component<{data: FullState, player: UserId | null}> {
    render() {
        const {data, player} = this.props;
        if (player === null) {
            return null;
        } else {
            const { playerAvatars, playerColors } = data;
            const
                hasAvatar = !!playerAvatars[player],
                avatarURI = `/just-one/avatars/${player}/${playerAvatars[player]}.png`;
            return (
                <div className={cs("avatar", {"has-avatar": hasAvatar})}
                     style={{
                         backgroundImage: hasAvatar
                             ? `url(${avatarURI})`
                             : `none`,
                         backgroundColor: hasAvatar
                             ? `transparent`
                             : playerColors[player]
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
}

export class AvatarSaver extends Component<{
    socket: WebSocketChannel,
    userId: UserId,
    userToken: string
}> {
    saveAvatar( input: HTMLInputElement ) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const
                uri = "/common/upload-avatar",
                xhr = new XMLHttpRequest(),
                fd = new FormData(),
                fileSize = ((file.size / 1024) / 1024); // MB
            if (fileSize <= 5) {
                const { socket, userId, userToken } = this.props;
                xhr.open("POST", uri, true);
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        localStorage.avatarId = xhr.responseText;
                        socket.emit("update-avatar", localStorage.avatarId);
                    } else if (xhr.readyState === 4 && xhr.status !== 200) popup.alert({content: "File upload error"});
                };
                fd.append("avatar", file);
                fd.append("userId", userId);
                fd.append("userToken", userToken);
                xhr.send(fd);
            } else
                popup.alert({content: "File shouldn't be larger than 5 MB"});
        }
    }

    render() {
        return (
            <input id="avatar-input" type="file"
                onChange={({ target }) => this.saveAvatar(target)}
            />
        )
    }
}