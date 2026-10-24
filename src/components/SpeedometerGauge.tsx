/**
 * SpeedometerGauge - Sleek circular analog racing speedometer (Kadran)
 * Features smooth springy needle animation, color-coded speed zones,
 * radial tick marks, digital readout, and active nitro boost pulse.
 */

import React from 'react';

interface SpeedometerGaugeProps {
  speedKmH: number;
  isNitroActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SpeedometerGauge: React.FC<SpeedometerGaugeProps> = ({
  speedKmH,
  isNitroActive = false,
  size = 'md',
}) => {
  const maxSpeed = 240;
  const clampedSpeed = Math.max(0, Math.min(maxSpeed, speedKmH));

  // Gauge angle sweep: -120 degrees at 0 km/h to +120 degrees at 240 km/h (240 deg sweep)
  const angle = -120 + (clampedSpeed / maxSpeed) * 240;

  // Ticks at intervals of 20 km/h
  const ticks = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240];

  const sizeDimensions = {
    sm: { width: 84, height: 84, cx: 42, cy: 42, r: 35, fontMain: 'text-base', fontSub: 'text-[9px]' },
    md: { width: 104, height: 104, cx: 52, cy: 52, r: 44, fontMain: 'text-xl', fontSub: 'text-[10px]' },
    lg: { width: 128, height: 128, cx: 64, cy: 64, r: 54, fontMain: 'text-2xl', fontSub: 'text-xs' },
  }[size];

  const { width, height, cx, cy, r } = sizeDimensions;

  // Arc path generator
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    // 0 deg is top, +angle is clockwise
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const bgTrack = describeArc(cx, cy, r, -120, 120);
  const greenTrack = describeArc(cx, cy, r, -120, -20);
  const amberTrack = describeArc(cx, cy, r, -20, 60);
  const redTrack = describeArc(cx, cy, r, 60, 120);

  return (
    <div
      className={`relative flex items-center justify-center select-none ${
        isNitroActive ? 'animate-pulse' : ''
      }`}
      style={{ width, height }}
      title={`Hız: ${speedKmH} km/sa`}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Glow drop-shadow filter */}
        <defs>
          <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Bezel Circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r + 5}
          fill="#0a192f"
          stroke="#1e3a5f"
          strokeWidth="3"
          className="shadow-2xl"
        />

        {/* Gauge Background Plate */}
        <circle cx={cx} cy={cy} r={r} fill="#061222" />

        {/* Background Inactive Arc Track */}
        <path
          d={bgTrack}
          fill="none"
          stroke="#1e293b"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Color-Coded Speed Zones */}
        <path
          d={greenTrack}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d={amberTrack}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="4"
          opacity="0.9"
        />
        <path
          d={redTrack}
          fill="none"
          stroke="#ef4444"
          strokeWidth="4.5"
          strokeLinecap="round"
          filter="url(#gaugeGlow)"
        />

        {/* Radial Tick Marks */}
        {ticks.map((t) => {
          const tickAngle = -120 + (t / maxSpeed) * 240;
          const isMajor = t % 40 === 0;
          const p1 = polarToCartesian(cx, cy, r - (isMajor ? 8 : 4.5), tickAngle);
          const p2 = polarToCartesian(cx, cy, r - 1.5, tickAngle);
          const tickColor = t >= 180 ? '#ef4444' : t >= 120 ? '#f59e0b' : '#94a3b8';

          return (
            <line
              key={t}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={tickColor}
              strokeWidth={isMajor ? 1.8 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Rotating Needle */}
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          }}
        >
          {/* Needle shadow/glow */}
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - r + 3}
            stroke={isNitroActive ? '#38bdf8' : '#ff4444'}
            strokeWidth="3.2"
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
          />
          {/* Inner sharp needle spine */}
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - r + 5}
            stroke={isNitroActive ? '#ffffff' : '#ffedd5'}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Needle counterweight tail */}
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy + 7}
            stroke="#475569"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* Center Metallic Needle Hub / Pin */}
        <circle cx={cx} cy={cy} r="6.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.8" />
        <circle cx={cx} cy={cy} r="2.8" fill={isNitroActive ? '#38bdf8' : '#f97316'} />
      </svg>

      {/* Embedded Digital Speed Readout in Lower Arc */}
      <div className="absolute inset-x-0 bottom-2.5 sm:bottom-3 flex flex-col items-center justify-center pointer-events-none">
        <span
          className={`font-racing font-extrabold ${sizeDimensions.fontMain} text-white tracking-tight leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
        >
          {speedKmH}
        </span>
        <span
          className={`font-bold ${sizeDimensions.fontSub} text-[#93c5fd] uppercase tracking-wider leading-none mt-0.5`}
        >
          km/sa
        </span>
      </div>
    </div>
  );
};
