import React from 'react'

interface RatingRadarChartProps {
    ratings: {
        label: string
        value: number
        fullMark: number
    }[]
    size?: number
}

export function RatingRadarChart({ ratings, size = 200 }: RatingRadarChartProps) {
    const center = size / 2
    const radius = (size / 2) * 0.8
    const angleSlice = (Math.PI * 2) / ratings.length

    // Helper to get coordinates
    const getCoordinates = (value: number, index: number, max: number) => {
        const angle = index * angleSlice - Math.PI / 2 // Start from top
        const r = (value / max) * radius
        const x = center + r * Math.cos(angle)
        const y = center + r * Math.sin(angle)
        return { x, y }
    }

    // Generate polygon points
    const points = ratings.map((r, i) => {
        const { x, y } = getCoordinates(r.value, i, r.fullMark)
        return `${x},${y}`
    }).join(' ')

    // Generate grid lines (e.g., 5 levels)
    const levels = 5
    const gridPolygons = Array.from({ length: levels }).map((_, levelIndex) => {
        const levelFactor = (levelIndex + 1) / levels
        const levelPoints = ratings.map((r, i) => {
            const { x, y } = getCoordinates(r.fullMark * levelFactor, i, r.fullMark)
            return `${x},${y}`
        }).join(' ')
        return (
            <polygon
                key={levelIndex}
                points={levelPoints}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="1"
            />
        )
    })

    // Generate axes
    const axes = ratings.map((r, i) => {
        const { x, y } = getCoordinates(r.fullMark, i, r.fullMark)
        return (
            <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
            />
        )
    })

    // Generate labels
    const labels = ratings.map((r, i) => {
        const angle = i * angleSlice - Math.PI / 2
        const labelRadius = radius * 1.2
        const x = center + labelRadius * Math.cos(angle)
        const y = center + labelRadius * Math.sin(angle)
        return (
            <text
                key={i}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-medium fill-slate-600"
            >
                {r.label}
            </text>
        )
    })

    return (
        <div className="flex justify-center items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background Grid */}
                {gridPolygons}
                {axes}

                {/* Data Polygon */}
                <polygon
                    points={points}
                    fill="rgba(79, 70, 229, 0.2)" // Indigo-600 with opacity
                    stroke="#4f46e5"
                    strokeWidth="2"
                />

                {/* Data Points */}
                {ratings.map((r, i) => {
                    const { x, y } = getCoordinates(r.value, i, r.fullMark)
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="3"
                            fill="#4f46e5"
                        />
                    )
                })}

                {labels}
            </svg>
        </div>
    )
}
