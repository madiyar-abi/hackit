import { fmtNum } from "@/lib/format";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

const C = 120; // centre of the 240×240 canvas
const R_PX = 100; // canvas radius that corresponds to VIEW_M
const VIEW_M = 600;

/** Static schematic: outlet in the centre, check-in GPS points around it, allowed radius as a circle.
 *  Points farther than VIEW_M are pinned to the edge and labelled with their distance. */
export function VisitMap({ lat, lng, points, radiusM }: { lat: number; lng: number; points: MapPoint[]; radiusM: number }) {
  const k = R_PX / VIEW_M;
  const mPerLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  return (
    <svg viewBox="0 0 240 240" className="mx-auto block w-full max-w-[280px]" role="img" aria-label={`Схема отметок визитов относительно точки, радиус ${radiusM} м`}>
      <circle cx={C} cy={C} r={R_PX} className="fill-milk stroke-line" strokeWidth="1" />
      <circle cx={C} cy={C} r={radiusM * k} className="fill-ok-soft stroke-ok" strokeWidth="1" strokeDasharray="3 3" />
      <text x={C} y={C - radiusM * k - 4} textAnchor="middle" className="fill-muted text-[9px]">
        {radiusM} м
      </text>
      {points.map((p) => {
        const dx = (p.lng - lng) * mPerLng;
        const dy = (p.lat - lat) * 110_540;
        const dist = Math.hypot(dx, dy);
        const far = dist > VIEW_M;
        const s = far ? VIEW_M / dist : 1;
        const x = C + dx * s * k;
        const y = C - dy * s * k;
        const bad = dist > radiusM;
        return (
          <g key={p.id}>
            <title>{`${p.label}: ${fmtNum(dist)} м от точки`}</title>
            <circle
              cx={x}
              cy={y}
              r={far ? 5 : 4}
              strokeWidth="2"
              className={bad ? (far ? "fill-carton stroke-critical" : "fill-critical stroke-carton") : "fill-frost stroke-carton"}
            />
            {far && (
              <text x={x} y={y + (y < C ? -9 : 15)} textAnchor="middle" className="fill-critical text-[9px] font-medium">
                {(dist / 1000).toFixed(1).replace(".", ",")} км
              </text>
            )}
          </g>
        );
      })}
      <rect x={C - 5} y={C - 5} width="10" height="10" rx="2" className="fill-ink" />
    </svg>
  );
}
