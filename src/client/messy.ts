type Point = {
    x: number;
    y: number;
}

const genZigzag = (): Point[] => {
    let x = 0;
    const points = [{x, y: Math.random()}];
    const avgSpikes = 20;
    while (x < 1) {
        x += Math.random() / avgSpikes;
        x = Math.min(x, 1);
        points.push({x, y: Math.random()});
    }
    return points;
}

const frac2perc = (p: Point, top: boolean): string => {
    const { x, y } = p;
    const maxDent = 0.03;
    const xDent = (top) ? x : 1 - x;
    const yDent = (top) ? maxDent * y : 1 - maxDent * y;
    const n2text = (n: number) => (n * 100).toFixed(1) + '%';
    return n2text(xDent) + ' ' + n2text(yDent);
}

const genTornEdges = (): string => {
    const percentages = [
        ...genZigzag().map(p => frac2perc(p, true)),
        ...genZigzag().map(p => frac2perc(p, false)),
    ];
    const path = `polygon(${percentages.join()})`;
    return path;
}

const plusMinus = (n: number) => (Math.random() - 0.5) * 2 * n;

type ValidTarget = 'card' | 'card-logo';

const generators: Record<ValidTarget, () => React.CSSProperties> = {
    'card': () => ({
        clipPath: genTornEdges(),
        transform: `rotate(${plusMinus(3)}deg)`,
        backgroundPosition: `${plusMinus(100)}% ${plusMinus(100)}%`
    }),
    'card-logo': () => ({
        transform: `rotate(${plusMinus(25) - 7}deg)`
    })
}

const cache = Object.fromEntries(Object.keys(generators)
    .map(target => [target, {} as Record<string, React.CSSProperties>]));

export const getMessy = (target: ValidTarget, key: string): React.CSSProperties => {
    if (!cache[target].hasOwnProperty(key)) {
        cache[target][key] = generators[target]();
    }
    return cache[target][key];
}