import { Link, useRouteError } from "react-router";

/** Shown instead of a blank page if something in the app crashes. */
export function ErrorPage() {
  const error = useRouteError();
  const detail = error instanceof Error ? error.message : String(error ?? "Unknown error");

  return (
    <main
      style={{ maxWidth: "var(--content-width)", margin: "0 auto", padding: "3rem var(--gutter)", display: "grid", gap: "1rem" }}
    >
      <title>Something went wrong · Tracewise</title>
      <p className="label" style={{ color: "var(--redpen)", margin: 0 }}>
        Error
      </p>
      <h1 style={{ textTransform: "uppercase" }}>Something went wrong</h1>
      <p style={{ margin: 0 }}>
        Tracewise hit a problem it didn't expect. Your saved code and progress are safe: they're stored in your
        browser, not in this page.
      </p>
      <p style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", margin: 0 }}>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload the page
        </button>
        <Link className="btn btn-secondary" to="/" reloadDocument>
          Go to the home page
        </Link>
      </p>
      <details>
        <summary style={{ cursor: "pointer", color: "var(--muted)" }}>Technical details</summary>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>{detail}</pre>
      </details>
    </main>
  );
}
