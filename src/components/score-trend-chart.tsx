// A small hand-rolled line chart, drawn with plain SVG.
//
// We deliberately didn't add a charting library for this -- the project
// already avoids introducing UI dependencies beyond shadcn + lucide, and
// a handful of data points doesn't need much more than a <polyline>.

type ChartPoint = {
    label: string;
    value: number; // expected 0-100
};

export default function ScoreTrendChart({ points }: { points: ChartPoint[] }) {
    if (points.length === 0) {
        return (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Not enough data yet
            </div>
        );
    }

    // The SVG viewBox is a fixed 100x40 "grid" -- coordinates below are
    // percentages of that grid, so the chart scales to fit any container.
    const width = 100;
    const height = 40;
    const stepX = points.length > 1 ? width / (points.length - 1) : 0;

    const coords = points.map((point, index) => ({
        x: points.length > 1 ? index * stepX : width / 2,
        y: height - (point.value / 100) * height,
        ...point,
    }));

    const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");

    return (
        <div className="text-primary">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full" preserveAspectRatio="none">
                <polyline
                    points={linePoints}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                />
                {coords.map((point, index) => (
                    <circle key={index} cx={point.x} cy={point.y} r="1.5" fill="currentColor" vectorEffect="non-scaling-stroke">
                        <title>{`${point.label}: ${point.value.toFixed(0)}%`}</title>
                    </circle>
                ))}
            </svg>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>{points[0].label}</span>
                {points.length > 1 && <span>{points[points.length - 1].label}</span>}
            </div>
        </div>
    );
}
