import type { Language } from "../content/types";
import { getCppRunner } from "./cpp/CppRunner";
import { getPythonRunner } from "./python/PythonRunner";
import type { Runner } from "./types";

/** The shared runtime for a language (one per page, loaded on first use). */
export function getRunner(language: Language): Runner {
  return language === "cpp" ? getCppRunner() : getPythonRunner();
}

export { LANGUAGE_NAMES } from "../content/types";
