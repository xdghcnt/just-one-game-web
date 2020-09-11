import React from "react";
import { SetParamType } from "../common/messages";
import { t } from "./translation_ru";
import { useDebouncedCallback } from 'use-debounce';

type GameSettingType = {
    param: SetParamType,
    label: string,
    icon: string,
    min?: number,
    max?: number
}

const gameSettings: GameSettingType[] = [
    { param: 'playerTime', label: 'player time', icon: 'alarm', min: 0},
    { param: 'teamTime', label: 'team time', icon: 'alarm', min: 0},
    { param: 'masterTime', label: 'master time', icon: 'alarm_on', min: 0},
    { param: 'revealTime', label: 'reveal time', icon: 'alarm_on', min: 0},
    { param: 'wordsLevel', label: 'words level', icon: 'school', min: 1, max: 4},
    { param: 'goal', label: 'goal', icon: 'flag', min: 1}
];

type SettingInputProps = FullProps & { setting: GameSettingType };

const SettingInput = ({data, socket, setting}: SettingInputProps) => {
    const { param, label, icon, min, max } = setting;
    //generate className from label e.g. "set-player-time"
    const className = ['set', ...label.split(' ')].join('-');
    const { hostId, userId, phase, paused } = data;
    const isHost = hostId === userId;
    const inProcess = phase !== 0 && !paused;
    const editable = isHost && !inProcess;
    const value = data[param];

    const [update] = useDebouncedCallback((newVal: number) => {
        if (!isNaN(newVal)) {
            socket.emit("set-param", param, newVal);
        }
    }, 100);

    return (
        <div className={className}>
            <i title={t(label)} className="material-icons">
                {icon}
            </i>
            {(editable) ? (
                <input
                    id={className}
                    type="number"
                    defaultValue={value}
                    min={min}
                    max={max}
                    onChange={evt => update(evt.target.valueAsNumber)}
                />
            ) : (
                <span className="value">
                    {value}
                </span>
            )}
        </div>
    )
}

const GameSettings = ( {data, socket}: FullProps ) => (
    <div className="host-controls-menu">
        <div className="little-controls">
            <div className="game-settings">
                {gameSettings.map((setting) => (
                    <SettingInput data={data} socket={socket} setting={setting} />
                ))}
            </div>
        </div>
    </div>
)


type HostControlsProps = FullProps & { refreshState: () => void };

type ButtonProps = {
    icon: string;
    onClick: () => void;
}

const SideButtons = ( {data, socket, refreshState }: HostControlsProps ) => {
    const { hostId, userId, phase, paused, teamsLocked, timed, playerNames } = data;
    const isHost = hostId === userId;
    const inProcess = phase !== 0 && !paused;
    const buttons: ButtonProps[] = [];
    if (isHost) {
        buttons.push({
            icon: 'store',
            onClick: () => socket.emit("set-room-mode", false)
        });
        buttons.push({
            icon: (inProcess) ? 'pause' : 'play_arrow',
            onClick: () => socket.emit("toggle-pause")
        });
        if (paused) {
            buttons.push({
                icon: (teamsLocked) ? 'lock_outline' : 'lock_open',
                onClick: () => socket.emit("toggle-lock")
            });
            buttons.push({
                icon: (timed) ? 'alarm' : 'alarm_off',
                onClick: () => socket.emit("toggle-timed")
            });
            buttons.push({
                icon: 'sync',
                onClick: () => popup.confirm(
                    {content: "Restart? Are you sure?"},
                    (evt) => evt.proceed && socket.emit("restart")
                )
            });
        }
    }

    const changeName = () => popup.prompt({
        content: "New name",
        value: playerNames[userId] || ""
    }, ({proceed, input_value}) => {
        const newName =  input_value?.trim();
        if (proceed && newName) {
            socket.emit("change-name", newName);
            localStorage.userName = newName;
        }
    })
    buttons.push({
        icon: 'edit',
        onClick: changeName
    });

    const toggleMuteSounds = () => {
        localStorage.muteSounds = !parseInt(localStorage.muteSounds) ? 1 : 0;
        refreshState();
    };
    buttons.push({
        icon: (parseInt(localStorage.muteSounds)) ? 'volume_off' : 'volume_up', 
        onClick: toggleMuteSounds
    });

    const toggleTheme = () => {
        localStorage.darkThemeDixit = !parseInt(localStorage.darkThemeDixit) ? 1 : 0;
        document.body.classList.toggle("dark-theme");
        refreshState();
    };
    buttons.push({
        icon: (parseInt(localStorage.darkThemeDixit)) ? 'wb_sunny' : 'brightness_2', 
        onClick: toggleTheme
    });

    return (
        <div className="side-buttons">
            {buttons.map(({onClick, icon}) => (
                <i onClick={onClick} className="material-icons settings-button">
                    {icon}
                </i>
            ))}
        </div>
    )
}

export const HostControls = ( { data, socket, refreshState }: HostControlsProps) => (
    <div
        className="host-controls"
        onTouchStart={(e) => (e.target as HTMLElement).focus()}
    >
        {data.timed && <GameSettings data={ data } socket={ socket } />}
        <SideButtons data={ data } socket={ socket } refreshState={refreshState} />
        <i className="settings-hover-button material-icons">
            settings
        </i>
    </div>
)