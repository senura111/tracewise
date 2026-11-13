import { Link, useSearchParams } from "react-router";
import { allTopics, challengeNumber, challenges, groupByMainTopic } from "../content/challenges";
import { DIFFICULTIES, LANGUAGES, type Difficulty, type Language } from "../content/types";
import { FilterBar, type FilterGroup } from "../components/FilterBar";
import { DifficultyBadge, TopicTags } from "../components/Labels";
import { Mark } from "../components/Mark";
import styles from "./ChallengeListPage.module.css";

const LANGUAGE_NAMES: Record<Language, string> = { python: "Python", cpp: "C++" };
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

export function ChallengeListPage() {
  // Filters live in the URL, so a filtered list can be bookmarked or shared.
  const [params, setParams] = useSearchParams();
  const language: Language = LANGUAGES.includes(params.get("language") as Language)
    ? (params.get("language") as Language)
    : "python";
  const difficulty = DIFFICULTIES.includes(params.get("difficulty") as Difficulty)
    ? (params.get("difficulty") as Difficulty)
    : null;
  const topic = allTopics.includes(params.get("topic") ?? "") ? params.get("topic") : null;

  const visible = challenges.filter(
    (c) => c.variants[language] && (!difficulty || c.difficulty === difficulty) && (!topic || c.topics.includes(topic)),
  );
  const groups = groupByMainTopic(visible);

  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const filterGroups: FilterGroup[] = [
    {
      key: "language",
      label: "Language",
      selected: language,
      options: LANGUAGES.map((l) => ({
        value: l,
        label: l === "cpp" ? `${LANGUAGE_NAMES[l]} (soon)` : LANGUAGE_NAMES[l],
        disabled: !challenges.some((c) => c.variants[l]),
      })),
    },
    {
      key: "difficulty",
      label: "Difficulty",
      selected: difficulty,
      options: [{ value: null, label: "All" }, ...DIFFICULTIES.map((d) => ({ value: d, label: capitalize(d) }))],
    },
    {
      key: "topic",
      label: "Topic",
      selected: topic,
      options: [{ value: null, label: "All" }, ...allTopics.map((t) => ({ value: t, label: capitalize(t) }))],
    },
  ];

  return (
    <div className={styles.page}>
      <title>Challenges · Tracewise</title>
      <header className={styles.head}>
        <h1 className={styles.h1}>Challenges</h1>
        <p className={styles.count} aria-live="polite">
          {visible.length} of {challenges.length} shown
        </p>
      </header>

      <FilterBar groups={filterGroups} onChange={setFilter} />

      {groups.length === 0 ? (
        <div className={styles.empty}>
          <p>No challenges match these filters.</p>
          <button type="button" className="btn btn-secondary" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </button>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.topic} className={styles.group} aria-labelledby={`topic-${group.topic}`}>
            <h2 id={`topic-${group.topic}`} className={`label ${styles.groupTitle}`}>
              {group.topic}
              <span className={styles.groupCount}>{group.challenges.length}</span>
            </h2>
            <ol className={styles.rows}>
              {group.challenges.map((c) => (
                <li key={c.id} className={styles.row}>
                  <span className={styles.no}>{String(challengeNumber(c)).padStart(2, "0")}</span>
                  <div className={styles.main}>
                    <Link to={`/challenges/${c.id}`} className={styles.title}>
                      {c.title}
                    </Link>
                    <TopicTags topics={c.topics} />
                  </div>
                  <DifficultyBadge difficulty={c.difficulty} />
                  <Mark state="blank" label="Not solved yet" />
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
