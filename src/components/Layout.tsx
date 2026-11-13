import { Suspense, type MouseEvent } from "react";
import { Link, NavLink, Outlet, ScrollRestoration } from "react-router";
import styles from "./Layout.module.css";

export function Layout() {
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip} onClick={skipToMain}>
        Skip to content
      </a>
      <header className={styles.header}>
        <Link to="/" className={styles.wordmark}>
          Tracewise
        </Link>
        <nav aria-label="Main">
          <NavLink to="/challenges" className={({ isActive }) => (isActive ? styles.active : undefined)}>
            Challenges
          </NavLink>
          <NavLink to="/progress" className={({ isActive }) => (isActive ? styles.active : undefined)}>
            Progress
          </NavLink>
        </nav>
      </header>
      <main id="main" tabIndex={-1} className={styles.main}>
        <Suspense fallback={<p className={styles.loading}>Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
      <footer className={styles.footer}>
        <span className="label">Tracewise</span>
        <span>Your code runs on your own machine. No accounts, no tracking.</span>
      </footer>
      <ScrollRestoration />
    </div>
  );
}

// With hash routing, a plain #main link would change the route, so move focus instead.
function skipToMain(event: MouseEvent) {
  event.preventDefault();
  document.getElementById("main")?.focus();
}
