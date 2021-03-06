//import React from "react";
//import ReactDOM from "react-dom"

class Avatar extends React.Component {
    render() {
        const
            hasAvatar = !!this.props.data.playerAvatars[this.props.player],
            avatarURI = `/just-one/avatars/${this.props.player}/${this.props.data.playerAvatars[this.props.player]}.png`;
        return (
            <div className={cs("avatar", {"has-avatar": hasAvatar})}
                 style={{
                     "background-image": hasAvatar
                         ? `url(${avatarURI})`
                         : `none`,
                     "background-color": hasAvatar
                         ? `transparent`
                         : this.props.data.playerColors[this.props.player]
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

class AvatarSaver extends React.Component {
    saveAvatar(event, props) {
        const input = event.target;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const
                uri = "/common/upload-avatar",
                xhr = new XMLHttpRequest(),
                fd = new FormData(),
                fileSize = ((file.size / 1024) / 1024).toFixed(4); // MB
            if (fileSize <= 5) {
    
                xhr.open("POST", uri, true);
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        localStorage.avatarId = xhr.responseText;
                        props.socket.emit("update-avatar", localStorage.avatarId);
                    } else if (xhr.readyState === 4 && xhr.status !== 200) popup.alert({content: "File upload error"});
                };
                fd.append("avatar", file);
                fd.append("userId", props.userId);
                fd.append("userToken", props.userToken);
                xhr.send(fd);
            } else
                popup.alert({content: "File shouldn't be larger than 5 MB"});
        }
    }

    render() {
        return (
            <input id="avatar-input" type="file"
                onChange={evt => this.saveAvatar(evt, this.props)}
            />
        )
    }
}