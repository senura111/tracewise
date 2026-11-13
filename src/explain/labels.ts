/** Short label for the kind of problem: Python's own names, plainer words for C++. */
export function errorLabel(type: string): string {
  switch (type) {
    case "CompileError":
      return "Compile error";
    case "CompileWarning":
      return "Warning";
    case "RuntimeError":
      return "Crash";
    default:
      return type;
  }
}
