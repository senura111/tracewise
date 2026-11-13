import type { Difficulty } from "../content/types";
import styles from "./Labels.module.css";

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`badge ${styles.difficulty}`} data-difficulty={difficulty}>
      {difficulty}
    </span>
  );
}

export function TopicTags({ topics }: { topics: string[] }) {
  return (
    <ul className={styles.tags} aria-label="Topics">
      {topics.map((topic) => (
        <li key={topic} className="tag">
          {topic}
        </li>
      ))}
    </ul>
  );
}
