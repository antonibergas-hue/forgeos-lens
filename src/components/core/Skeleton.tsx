/**
 * Skeleton loading placeholders (TODO #17b).
 *
 * Dense, monospace-friendly pulse animation over the Mission Control surface
 * colour. Used during the first paint of each tab to eliminate the "blank tab
 * then a wall of data" flicker.
 */

export function SkeletonRow({
  columns = 4,
  height = "h-5",
}: {
  columns?: number;
  height?: string;
}) {
  return (
    <div className="flex gap-3 px-2 py-1">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className={`${height} rounded bg-surface/80 animate-pulse ${
            i === 0 ? "w-16" : i === columns - 1 ? "w-14" : "flex-1"
          }`}
        />
      ))}
    </div>
  );
}

export function SkeletonBlock({
  width = "w-48",
  height = "h-4",
}: {
  width?: string;
  height?: string;
}) {
  return (
    <div className={`${width} ${height} rounded bg-surface/80 animate-pulse`} />
  );
}

export function SkeletonCard({
  lines = 3,
}: {
  lines?: number;
}) {
  return (
    <div className="border border-border rounded p-3 space-y-2 bg-surface/40">
      <div className="flex gap-2 mb-1">
        <SkeletonBlock width="w-12" height="h-3" />
        <SkeletonBlock width="w-20" height="h-3" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={i === lines - 1 ? "w-3/4" : "w-full"}
          height="h-3"
        />
      ))}
    </div>
  );
}

export function SkeletonGraph({
  w = 600,
  h = 400,
}: {
  w?: number;
  h?: number;
}) {
  return (
    <div
      className="border border-border rounded bg-surface/40 animate-pulse"
      style={{ width: "100%", maxWidth: `${w}px`, height: `${h}px` }}
    />
  );
}
