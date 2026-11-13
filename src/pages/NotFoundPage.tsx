import { Link } from "react-router";

export function NotFoundPage({ message = "There's nothing at this address." }: { message?: string }) {
  return (
    <div style={{ maxWidth: "var(--content-width)", margin: "0 auto", padding: "3rem var(--gutter)" }}>
      <title>Not found · Tracewise</title>
      <p className="label" style={{ color: "var(--redpen)" }}>
        Not found
      </p>
      <h1 style={{ margin: "0.4rem 0 1rem" }}>Nothing here</h1>
      <p>{message}</p>
      <p>
        <Link to="/challenges">Go to the challenge list</Link>
      </p>
    </div>
  );
}
