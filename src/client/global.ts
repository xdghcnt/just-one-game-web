import { Component } from "react";
import { RoomState, PlayerState } from '../common/messages';

declare global {
    interface WebSocketChannel {
        on(messageName: string, callback: (d: any) => any): WebSocketChannel;
        emit(messageName: string, ...data: any[]): any;
    }

    interface WebSocketWrapper {
        of(channelName: string): WebSocketChannel;
        on(messageName: string, callback: (data: any) => any): void;
    }

    const hyphenationPatternsRu: any;
    const createHyphenator: any;

    interface Window {
        wssToken: string;
        socket: WebSocketWrapper;
        hyphenate: (text: string) => string;
        CommonRoom: CommonRoomComponent;
    }

    type CommonRoomComponent =
        (new() => Component<{state: FullState, app: Component}>)
        & { processCommonRoom: (serverState: any, clientState: any) => any };

    const CommonRoom: CommonRoomComponent;

    const UserAudioMarker: (new() => Component<{user: string, data: FullState}>);

    type PopupEvt = {
        proceed?: boolean;
        input_value?: string;
    }

    type popupModal = (
        options: object,
        callback?: (evt: PopupEvt) => any
    ) => void;

    const popup: {
        alert: popupModal;
        prompt: popupModal;
        confirm: popupModal;
    };

    const cs: (...args: any[]) => string;

    type UserId = string;

    type HollowState = {
        inited: false;
    }

    type FullState = RoomState & PlayerState & {
        inited: true;
        userId: UserId;
    }

    type DisconnectedState = Partial<RoomState> & {
        inited: false;
        disconnected: true;
        disconnectReason: any;
    }

    type GameCompState = HollowState | FullState | DisconnectedState;
}
