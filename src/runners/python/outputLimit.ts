export interface OutputLimits {
  maxChars: number;
  maxLines: number;
}

export const DEFAULT_OUTPUT_LIMITS: OutputLimits = { maxChars: 200_000, maxLines: 10_000 };

/**
 * Counts output across stdout and stderr and cuts it off at the limits, so a
 * runaway print loop can't flood the page.
 */
export class OutputLimiter {
  private chars = 0;
  private lines = 0;
  exceeded = false;

  constructor(private readonly limits: OutputLimits) {}

  /** Returns the part of `text` that still fits; sets `exceeded` once a limit is hit. */
  take(text: string): string {
    if (this.exceeded || text === "") return "";

    let end = text.length;
    const roomForChars = this.limits.maxChars - this.chars;
    if (end > roomForChars) {
      end = roomForChars;
      this.exceeded = true;
    }

    for (let i = 0; i < end; i++) {
      if (text.charCodeAt(i) !== 10) continue;
      if (this.lines === this.limits.maxLines) {
        // This newline would start line maxLines + 1.
        end = i;
        this.exceeded = true;
        break;
      }
      this.lines++;
    }

    this.chars += end;
    return text.slice(0, end);
  }
}
