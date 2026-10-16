export function AmbientBackground({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <div className="blob blob-1" style={{ background: colors[0] }} />
      <div className="blob blob-2" style={{ background: colors[1] }} />
      <div className="blob blob-3" style={{ background: colors[2] }} />
    </div>
  );
}
