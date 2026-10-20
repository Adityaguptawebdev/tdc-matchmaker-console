import { usePrefersReducedMotion } from '../../hooks/useMotion';

const PATH = 'M104,96 Q180,18 256,96';
const HEART = 'M0,4 C-6,-2 -10,-6 -6,-9 C-3,-11 -1,-9 0,-7 C1,-9 3,-11 6,-9 C10,-6 6,-2 0,4 Z';

function Person({
  cx,
  cy,
  tone,
  label,
  delay,
}: {
  cx: number;
  cy: number;
  tone: string;
  label: string;
  delay: string;
}) {
  return (
    <g className="animate-bob" style={{ animationDelay: delay }}>
      <circle cx={cx} cy={cy} r={36} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)" />
      <circle cx={cx} cy={cy - 9} r={9} fill={tone} />
      <path d={`M${cx - 17},${cy + 19} a17,14 0 0 1 34,0 Z`} fill={tone} />
      <text x={cx} y={cy + 58} textAnchor="middle" fontSize="11" fill="#baaadb" letterSpacing="0.06em">
        {label}
      </text>
    </g>
  );
}

/** Login-panel illustration: a client and a match, with a heart travelling along the path between them. */
export function CoupleIllustration() {
  const reduced = usePrefersReducedMotion();
  return (
    <svg
      viewBox="0 0 360 170"
      className="mx-auto block w-full max-w-sm"
      role="img"
      aria-label="Two people connected by a heart"
    >
      <path
        d={PATH}
        fill="none"
        stroke="rgba(253,164,175,0.45)"
        strokeWidth="1.5"
        strokeDasharray="4 8"
        strokeLinecap="round"
        className="animate-dash-flow"
      />
      <Person cx={64} cy={100} tone="#d8cfeb" label="YOUR CLIENT" delay="0s" />
      <Person cx={296} cy={100} tone="#fecdd3" label="THEIR MATCH" delay="1.2s" />
      {reduced ? (
        <path d={HEART} fill="#fb7185" transform="translate(180,57) scale(1.3)" />
      ) : (
        <g>
          <path d={HEART} fill="#fb7185" transform="scale(1.3)" />
          <animateMotion
            dur="3.4s"
            repeatCount="indefinite"
            path={PATH}
            keyPoints="0;1;1"
            keyTimes="0;0.85;1"
            calcMode="linear"
          />
        </g>
      )}
    </svg>
  );
}
