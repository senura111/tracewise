import { useRef, type KeyboardEvent } from "react";
import styles from "./Tabs.module.css";

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  /** Unique prefix used to link tabs to their panels. */
  idBase: string;
  label: string;
  tabs: readonly TabItem<T>[];
  selected: T;
  onSelect: (id: T) => void;
  className?: string;
}

const tabId = (base: string, id: string) => `${base}-tab-${id}`;
const panelId = (base: string, id: string) => `${base}-panel-${id}`;

/** Props for the element that a tab controls. */
export function tabPanelProps(idBase: string, id: string, selected: string) {
  return {
    role: "tabpanel",
    id: panelId(idBase, id),
    "aria-labelledby": tabId(idBase, id),
    hidden: id !== selected,
    tabIndex: 0,
  } as const;
}

/** Accessible tab list: arrow keys, Home and End move between tabs. */
export function Tabs<T extends string>({ idBase, label, tabs, selected, onSelect, className }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const target =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (target === null) return;
    event.preventDefault();
    onSelect(tabs[target].id);
    refs.current[target]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={`${styles.list} ${className ?? ""}`}>
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={tabId(idBase, tab.id)}
          aria-controls={panelId(idBase, tab.id)}
          aria-selected={tab.id === selected}
          tabIndex={tab.id === selected ? 0 : -1}
          className={styles.tab}
          onClick={() => onSelect(tab.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
