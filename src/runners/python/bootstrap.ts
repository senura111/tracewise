/**
 * Python that runs once after Pyodide loads. Shared by the browser worker and
 * the Node solution checker, so both treat input() the same way.
 *
 * input() calls the JS function `_tracewise.read_line(prompt)`, which returns
 * the line, or one of the sentinels below.
 */

export const INPUT_STOP = "\u0000stop";
export const INPUT_EXHAUSTED = "\u0000exhausted";
export const INPUT_UNAVAILABLE = "\u0000unavailable";

export const BOOTSTRAP = String.raw`
import builtins, sys
from _tracewise import read_line as _read_line

class TracewiseNoInput(BaseException):
    """Raised when input() has nothing to read. Not an Exception subclass,
    so a learner's 'except Exception' can't swallow it."""

def _tracewise_input(prompt=""):
    sys.stdout.flush()
    sys.stderr.flush()
    line = _read_line(str(prompt))
    if line.startswith("\0"):
        if line == "\0stop":
            raise KeyboardInterrupt
        raise TracewiseNoInput(line[1:])
    return line

builtins.input = _tracewise_input
`;
