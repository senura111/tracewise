import { useEffect, useRef } from "react";
import { EditorState, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
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
import { python } from "@codemirror/lang-python";
import { tags as t } from "@lezer/highlight";
import styles from "./CodeEditor.module.css";

/** A red-pen note attached below a line of code (used by the error explainer). */
export interface LineNote {
  line: number;
  label: string;
  message: string;
}

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  notes?: LineNote[];
  ariaLabel: string;
}

// ---------------------------------------------------------------------------
// Line notes: a highlighted line plus a block widget rendered underneath it.

class NoteWidget extends WidgetType {
  constructor(readonly note: LineNote) {
    super();
  }
  eq(other: NoteWidget) {
    return other.note.label === this.note.label && other.note.message === this.note.message;
  }
  toDOM() {
    const outer = document.createElement("div");
    outer.className = styles.note;
    outer.setAttribute("role", "note");
    const box = document.createElement("div");
    box.className = styles.noteBox;
    outer.append(box);
    const label = document.createElement("span");
    label.className = styles.noteLabel;
    label.textContent = this.note.label;
    const message = document.createElement("p");
    message.className = styles.noteMessage;
    message.textContent = this.note.message;
    box.append(label, message);
    return outer;
  }
}

const setNotes = StateEffect.define<LineNote[]>();
const noteLine = Decoration.line({ class: styles.noteLine });

function buildNotes(state: EditorState, notes: LineNote[]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const valid = notes.filter((n) => n.line >= 1 && n.line <= state.doc.lines).sort((a, b) => a.line - b.line);
  for (const note of valid) {
    const line = state.doc.line(note.line);
    builder.add(line.from, line.from, noteLine);
    builder.add(line.to, line.to, Decoration.widget({ widget: new NoteWidget(note), block: true, side: 1 }));
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

export function CodeEditor({ value, onChange, notes = [], ariaLabel }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
          // Tab indents; Esc then Tab moves focus out of the editor.
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          python(),
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
        <kbd>Tab</kbd> indents · <kbd>Esc</kbd> then <kbd>Tab</kbd> leaves the editor
      </p>
    </div>
  );
}
