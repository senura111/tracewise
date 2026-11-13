import { useEffect, useRef } from "react";
import { EditorState, Prec, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  type DecorationSet,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { tags as t } from "@lezer/highlight";
import type { Language } from "../content/types";
import { splitInlineCode } from "../explain/inline";
import styles from "./CodeEditor.module.css";

/**
 * A note attached to a line of code (used by the error explainer).
 * "error": red-pen note shown below the line. "warning": the same, in the pen
 * colour, for compiler warnings. "fix": a lighter marker for the line where
 * the fix goes. Text may contain `backticks` for code.
 */
export interface LineNote {
  kind?: "error" | "warning" | "fix";
  line: number;
  label: string;
  title?: string;
  message: string;
  fix?: string;
}

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  notes?: LineNote[];
  ariaLabel: string;
  /** Called on Ctrl+Enter / Cmd+Enter */
  onRun?: () => void;
  /** Syntax highlighting; fixed when the editor is created */
  language?: Language;
}

// ---------------------------------------------------------------------------
// Line notes: a highlighted line plus a block widget rendered underneath it.

/** Creates an element whose text may contain `backtick` code spans. */
function richText(tag: string, className: string, text: string) {
  const el = document.createElement(tag);
  el.className = className;
  for (const part of splitInlineCode(text)) {
    if (part.code) {
      const code = document.createElement("code");
      code.textContent = part.text;
      el.append(code);
    } else {
      el.append(part.text);
    }
  }
  return el;
}

const sameNote = (a: LineNote, b: LineNote) =>
  a.kind === b.kind && a.label === b.label && a.title === b.title && a.message === b.message && a.fix === b.fix;

class NoteWidget extends WidgetType {
  constructor(readonly note: LineNote) {
    super();
  }
  eq(other: NoteWidget) {
    return sameNote(other.note, this.note);
  }
  toDOM() {
    const outer = document.createElement("div");
    outer.className = this.note.kind === "warning" ? `${styles.note} ${styles.warning}` : styles.note;
    outer.setAttribute("role", "note");
    const box = document.createElement("div");
    box.className = styles.noteBox;
    outer.append(box);
    box.append(richText("span", styles.noteLabel, this.note.label));
    if (this.note.title) box.append(richText("p", styles.noteTitle, this.note.title));
    box.append(richText("p", styles.noteMessage, this.note.message));
    if (this.note.fix) {
      const fix = document.createElement("p");
      fix.className = styles.noteFix;
      const label = document.createElement("span");
      label.className = styles.noteFixLabel;
      label.textContent = "Try";
      const code = document.createElement("code");
      code.textContent = this.note.fix;
      fix.append(label, code);
      box.append(fix);
    }
    return outer;
  }
}

/** Small inline marker at the end of the line where the fix goes. */
class FixMarker extends WidgetType {
  constructor(readonly label: string) {
    super();
  }
  eq(other: FixMarker) {
    return other.label === this.label;
  }
  toDOM() {
    const el = document.createElement("span");
    el.className = styles.fixMarker;
    el.textContent = `← ${this.label}`;
    return el;
  }
}

const setNotes = StateEffect.define<LineNote[]>();
const noteLine = Decoration.line({ class: styles.noteLine });
const warningLine = Decoration.line({ class: styles.warningLine });
const fixLine = Decoration.line({ class: styles.fixLine });

function buildNotes(state: EditorState, notes: LineNote[]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const valid = notes.filter((n) => n.line >= 1 && n.line <= state.doc.lines).sort((a, b) => a.line - b.line);
  for (const note of valid) {
    const line = state.doc.line(note.line);
    if (note.kind === "fix") {
      builder.add(line.from, line.from, fixLine);
      builder.add(line.to, line.to, Decoration.widget({ widget: new FixMarker(note.label), side: 1 }));
    } else {
      builder.add(line.from, line.from, note.kind === "warning" ? warningLine : noteLine);
      builder.add(line.to, line.to, Decoration.widget({ widget: new NoteWidget(note), block: true, side: 1 }));
    }
  }
  return builder.finish();
}

const notesField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, tr) {
    for (const effect of tr.effects) if (effect.is(setNotes)) return buildNotes(tr.state, effect.value);
    return decorations.map(tr.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

// ---------------------------------------------------------------------------
// Theme: every colour and font comes from CSS custom properties, so the editor
// follows the site's palette and light/dark mode automatically.

const theme = EditorView.theme({
  "&": {
    backgroundColor: "var(--editor-bg)",
    color: "var(--ink)",
    fontSize: "0.95rem",
    border: "1px solid var(--rule)",
    borderRadius: "var(--radius)",
  },
  "&.cm-focused": { outline: "2px solid var(--focus)", outlineOffset: "2px" },
  ".cm-scroller": { fontFamily: "var(--font-code)", lineHeight: "1.6" },
  ".cm-content": { caretColor: "var(--ink)", padding: "0.75rem 0" },
  ".cm-cursor": { borderLeftColor: "var(--ink)", borderLeftWidth: "2px" },
  ".cm-gutters": {
    backgroundColor: "var(--editor-gutter)",
    color: "var(--muted)",
    border: "none",
    borderRight: "1px solid var(--rule)",
  },
  ".cm-activeLine": { backgroundColor: "var(--editor-active-line)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--editor-active-line)", color: "var(--ink)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "var(--editor-selection) !important",
  },
  ".cm-matchingBracket": { backgroundColor: "var(--editor-selection)", outline: "1px solid var(--muted)" },
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.operatorKeyword, t.moduleKeyword], color: "var(--code-keyword)", fontWeight: "700" },
  { tag: [t.string, t.special(t.string)], color: "var(--code-string)" },
  { tag: [t.number, t.bool, t.null], color: "var(--code-number)" },
  { tag: [t.comment, t.lineComment], color: "var(--code-comment)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--code-function)" },
  { tag: [t.standard(t.variableName)], color: "var(--code-function)" },
]);

// ---------------------------------------------------------------------------

const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "Cmd" : "Ctrl";

const NO_NOTES: LineNote[] = [];

export function CodeEditor({ value, onChange, notes = NO_NOTES, ariaLabel, onRun, language = "python" }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          indentOnInput(),
          bracketMatching(),
          indentUnit.of("    "),
          EditorState.tabSize.of(4),
          // Ctrl/Cmd+Enter runs the code (overrides "insert blank line").
          Prec.highest(
            keymap.of([
              {
                key: "Mod-Enter",
                run: () => {
                  onRunRef.current?.();
                  return true;
                },
              },
            ]),
          ),
          // Tab indents; Esc then Tab moves focus out of the editor.
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          language === "cpp" ? cpp() : python(),
          syntaxHighlighting(highlight),
          theme,
          notesField,
          EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // The editor is created once; value/notes changes are pushed in below.
  }, []);

  // Replace the document when the value changes from outside (e.g. Reset).
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: setNotes.of(notes) });
  }, [notes]);

  return (
    <div className={styles.wrapper}>
      <div ref={host} />
      <p className={styles.keyHint}>
        <kbd>{MOD_KEY}</kbd>+<kbd>Enter</kbd> runs · <kbd>Tab</kbd> indents · <kbd>Esc</kbd> then <kbd>Tab</kbd> leaves
        the editor
      </p>
    </div>
  );
}
