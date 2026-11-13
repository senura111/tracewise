import { useId } from "react";
import styles from "./FilterBar.module.css";

export interface FilterOption {
  value: string | null;
  label: string;
  disabled?: boolean;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  selected: string | null;
}

interface FilterBarProps {
  groups: FilterGroup[];
  onChange: (key: string, value: string | null) => void;
}

/** Rows of toggle buttons; each row picks one value (or "All"). */
export function FilterBar({ groups, onChange }: FilterBarProps) {
  const id = useId();
  return (
    <div className={styles.bar}>
      {groups.map((group) => (
        <div key={group.key} className={styles.group} role="group" aria-labelledby={`${id}-${group.key}`}>
          <span id={`${id}-${group.key}`} className={`label ${styles.groupLabel}`}>
            {group.label}
          </span>
          <div className={styles.options}>
            {group.options.map((option) => (
              <button
                key={option.value ?? "all"}
                type="button"
                className={styles.option}
                aria-pressed={group.selected === option.value}
                disabled={option.disabled}
                onClick={() => onChange(group.key, option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
