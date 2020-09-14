import React, { useContext } from "react";
import { SocketContext, DataContext } from './gameContext';

type AvatarProps = { player: UserId | null };

export const Avatar = ({ player }: AvatarProps) => {
    const { playerAvatars, playerColors } = useContext(DataContext);
    if (player === null) {
        return null;
    } else {
        const hasAvatar = !!playerAvatars[player];
        const avatarURI = `/just-one/avatars/${player}/${playerAvatars[player]}.png`;
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

interface SaveAvatar {
    input: HTMLInputElement;
    onSuccess: () => void;
    formData: Record<string, string>;
}

const saveAvatar = ({input, onSuccess, formData}: SaveAvatar) => {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const
            uri = "/common/upload-avatar",
            xhr = new XMLHttpRequest(),
            fd = new FormData(),
            fileSize = ((file.size / 1024) / 1024); // MB
        if (fileSize <= 5) {
            xhr.open("POST", uri, true);
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    localStorage.avatarId = xhr.responseText;
                    onSuccess();
                } else if (xhr.readyState === 4 && xhr.status !== 200) {
                    popup.alert({content: "File upload error"});
                }
            };
            fd.append("avatar", file);
            for (const key in formData) {
                fd.append(key, formData[key]);
            }
            xhr.send(fd);
        } else
            popup.alert({content: "File shouldn't be larger than 5 MB"});
    }
}

type AvatarSaverProps = { userToken: string };

export const AvatarSaver = ({userToken}: AvatarSaverProps) => {
    const { userId } = useContext(DataContext);
    const socket = useContext(SocketContext);
    const onSuccess = () => socket.emit("update-avatar", localStorage.avatarId);
    const formData = { userId, userToken };

    return (
        <input id="avatar-input" type="file"
            onChange={({ target }) => saveAvatar({input: target, onSuccess, formData})}
        />
    )
}