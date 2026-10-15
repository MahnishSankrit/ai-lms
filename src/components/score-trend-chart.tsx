// A small hand-rolled line chart, drawn with plain SVG.
//
// We deliberately didn't add a charting library for this -- the project
// already avoids introducing UI dependencies beyond shadcn + lucide, and
// a handful of data points doesn't need much more than a <polyline>.
//
// What it draws:
// - a Y axis from 0% to 100% with light gridlines every 25%
// - a dashed reference line at 100% (a perfect score)
// - one dot per exam, with its short label underneath on the X axis
// - a tooltip (exam name, score, date) when you hover or tab to a dot

"use client"

import { useState } from "react";

type ChartPoint = {
    label: string; // short text under the X axis
    value: number; // percentage, expected 0-100
    name: string;  // full exam name, shown in the tooltip
    date?: string; // already-formatted date, shown in the tooltip
};

// Drawing area, in SVG units. The SVG scales to its container's width,
// and because we don't stretch it (no preserveAspectRatio="none"), the
// text stays readable instead of getting squashed.
const WIDTH = 600;
const HEIGHT = 220;
const PAD_LEFT = 40;   // room for the "100%" labels
const PAD_RIGHT = 16;
const PAD_TOP = 12;
const PAD_BOTTOM = 28; // room for the X axis labels

const Y_TICKS = [0, 25, 50, 75, 100];

export default function ScoreTrendChart({ points }: { points: ChartPoint[] }) {
    // Index of the dot being hovered/focused, or null when none is.
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    if (points.length === 0) {
        return (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Not enough data yet
            </div>
        );
    }

    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

    // Turn a percentage (0-100) into a Y position. 100% is at the top.
    const yFor = (value: number) => PAD_TOP + plotHeight - (Math.min(Math.max(value, 0), 100) / 100) * plotHeight;

    // Spread the dots evenly across the width. A single dot goes in the middle.
    const xFor = (index: number) => {
        if (points.length === 1) return PAD_LEFT + plotWidth / 2;
        return PAD_LEFT + (index / (points.length - 1)) * plotWidth;
    };

    const linePoints = points.map((point, index) => `${xFor(index)},${yFor(point.value)}`).join(" ");

    // With lots of points the X labels would overlap, so only show every Nth.
    const labelEvery = Math.ceil(points.length / 8);

    const active = activeIndex === null ? null : points[activeIndex];

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Score trend chart">
                {/* Y axis gridlines + labels */}
                {Y_TICKS.map((tick) => (
                    <g key={tick}>
                        <line
                            x1={PAD_LEFT}
                            x2={WIDTH - PAD_RIGHT}
                            y1={yFor(tick)}
                            y2={yFor(tick)}
                            className={tick === 100 ? "stroke-muted-foreground/60" : "stroke-border"}
                            strokeWidth="1"
                            strokeDasharray={tick === 100 ? "4 4" : undefined}
                        />
                        <text
                            x={PAD_LEFT - 8}
                            y={yFor(tick)}
                            textAnchor="end"
                            dominantBaseline="middle"
                            className="fill-muted-foreground text-[11px]"
                        >
                            {tick}%
                        </text>
                    </g>
                ))}

                {/* X axis labels */}
                {points.map((point, index) =>
                    index % labelEvery === 0 || index === points.length - 1 ? (
                        <text
                            key={index}
                            x={xFor(index)}
                            y={HEIGHT - 8}
                            textAnchor="middle"
                            className="fill-muted-foreground text-[11px]"
                        >
                            {point.label}
                        </text>
                    ) : null
                )}

                {/* The line itself */}
                <polyline points={linePoints} fill="none" className="stroke-primary" strokeWidth="2" />

                {/* Dots -- focusable so keyboard users get the tooltip too */}
                {points.map((point, index) => (
                    <circle
                        key={index}
                        cx={xFor(index)}
                        cy={yFor(point.value)}
                        r={activeIndex === index ? 6 : 4}
                        className="cursor-pointer fill-primary stroke-background outline-none focus-visible:stroke-ring"
                        strokeWidth="2"
                        tabIndex={0}
                        aria-label={`${point.name}: ${point.value.toFixed(0)}%${point.date ? `, ${point.date}` : ""}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                        onFocus={() => setActiveIndex(index)}
                        onBlur={() => setActiveIndex(null)}
                    />
                ))}
            </svg>

            {/* Tooltip. Positioned with percentages so it lines up with the
                dot no matter how wide the chart is rendered. */}
            {active && activeIndex !== null && (
                <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
                    style={{
                        left: `${(xFor(activeIndex) / WIDTH) * 100}%`,
                        top: `calc(${(yFor(active.value) / HEIGHT) * 100}% - 10px)`,
                    }}
                >
                    <p className="max-w-48 truncate font-medium">{active.name}</p>
                    <p className="text-muted-foreground">
                        {active.value.toFixed(0)}%{active.date ? ` · ${active.date}` : ""}
                    </p>
                </div>
            )}
        </div>
    );
}
