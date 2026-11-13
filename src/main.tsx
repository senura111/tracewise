import { StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/atkinson-hyperlegible-mono";
import "@fontsource-variable/archivo/wdth.css";
import "./styles/global.css";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ChallengeListPage } from "./pages/ChallengeListPage";
import { ErrorPage } from "./pages/ErrorPage";
import { NotFoundPage } from "./pages/NotFoundPage";

// The challenge page carries the code editor, so it loads on demand and keeps
// the home and list pages light.
const ChallengePage = lazy(() => import("./pages/ChallengePage").then((m) => ({ default: m.ChallengePage })));
const ProgressPage = lazy(() => import("./pages/ProgressPage").then((m) => ({ default: m.ProgressPage })));

// Hash URLs (#/challenges/...) work on any static host without redirect rules.
const router = createHashRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/challenges", element: <ChallengeListPage /> },
      { path: "/challenges/:id", element: <ChallengePage /> },
      { path: "/progress", element: <ProgressPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
