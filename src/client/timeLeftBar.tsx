import React, { Component } from "react";

interface TimeLeftBarProps {
    data: FullState;
}

interface TimeLeftBarState {
    time: number | null;
    serverTime: number | null;
    percent: number;
}

export class TimeLeftBar extends Component<TimeLeftBarProps, TimeLeftBarState> {
    timerTimeout?: ReturnType<typeof setTimeout>;
    timerSound = new Audio("/just-one/tick.mp3");

    constructor(props: TimeLeftBarProps) {
        super(props);
        const { time } = props.data;
        this.state = {
            time,
            serverTime: time,
            percent: 0
        };
    }

    componentDidMount() {
        this.timerSound.volume = 0.4;
        const {timed, time} = this.props.data;
        if (timed && time !== null) {
            this.updateTimer(time);
        }
        this.animate();
    }

    //If server sends new time, update TimeLeftBar time too.
    static getDerivedStateFromProps(nextProps: TimeLeftBarProps, prevState: TimeLeftBarState) {
        const { time } = nextProps.data;
        if ( time !== prevState.serverTime ) {
            return { time, serverTime: time };
        } else {
            return null;
        }
    }

    componentDidUpdate(prevProps: TimeLeftBarProps) {
        const { phase, time } = this.props.data
        if (phase !== prevProps.data.phase && time) {
            this.updateTimer(time);
        }
        this.animate();
    }

    updateTimer(time: number) {
        const data = this.props.data
        const phaseTimes: Record<number, number> = {
            1: data.playerTime,
            2: data.teamTime,
            3: data.masterTime,
            4: data.revealTime,
        };
        const timeTotal = phaseTimes[data.phase] * 1000;
        const percent  = (time / timeTotal) * 100;
        this.setState({ percent });
    }

    animate() {
        const { phase, paused, timed } = this.props.data;

        if (this.timerTimeout !== undefined) {
            clearTimeout(this.timerTimeout);
        }
        if (phase !== 0 && timed) {
            const tick = 1000;
            const animationDelay = 1000;
            let timeStart = (new Date()).getTime();
            this.timerTimeout = setTimeout(() => {
                if (timed && !paused && this.state.time !== null) {
                    let prevTime = this.state.time,
                        time = prevTime - ((new Date).getTime() - timeStart);
                    this.setState({ time });
                    this.updateTimer(Math.max(time - tick - animationDelay, 0));
                    if (![2, 4].includes(phase) && timed && time < 5000
                        && ((Math.floor(prevTime / 1000) - Math.floor(time / 1000)) > 0) && !parseInt(localStorage.muteSounds))
                        this.timerSound.play();
                } else if (!timed) {
                    this.updateTimer(0);
                }
            }, tick);
        }
    }

    render() {
        return (
            <div id="time-left-bar" style={{
                width: this.state.percent + '%'
            }}/>
        )
    }
}