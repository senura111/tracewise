export function App() {
  // Shown so a deploy can be checked at a glance: the Python runtime (Phase 2)
  // needs cross-origin isolation for interactive input() and the Stop button.
  const isolated = window.crossOriginIsolated;

  return (
    <main className="hello">
      <h1>Tracewise</h1>
      <p>Practise Python and C++ in your browser, with friendly explanations of your mistakes.</p>
      <p className="status">
        Phase 0 · hello world · cross-origin isolated:{" "}
        <strong className={isolated ? "ok" : "warn"}>{isolated ? "yes" : "no"}</strong>
      </p>
    </main>
  );
}
