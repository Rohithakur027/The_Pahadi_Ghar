'use client';

const STEPS = [
  { n: 1, label: 'Add' },
  { n: 2, label: 'Review' },
  { n: 3, label: 'Assign' },
  { n: 4, label: 'Send' },
];

export default function PhaseStrip({ phase }: { phase: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-0 mb-1">
      {STEPS.map(({ n, label }, i) => {
        const done   = phase > n;
        const active = phase === n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{
                  background: active ? '#D4873A' : done ? '#22C55E' : 'rgba(28,58,42,0.1)',
                  color: active || done ? '#fff' : 'rgba(28,58,42,0.35)',
                }}
              >
                {done ? '✓' : n}
              </div>
              <span
                className="text-[11px] font-semibold"
                style={{ color: active ? '#D4873A' : done ? '#22C55E' : 'rgba(28,58,42,0.35)' }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-6 h-px mx-1 flex-shrink-0"
                style={{ background: done ? '#22C55E' : 'rgba(28,58,42,0.15)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
