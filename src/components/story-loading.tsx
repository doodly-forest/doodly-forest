import styles from "./story-loading.module.css";

export function StoryLoading({ characterName }: { characterName?: string }) {
  return (
    <div className={styles.loading}>
      <svg className={styles.artwork} viewBox="32 24 96 104" fill="none" aria-hidden="true" focusable="false">
        <g className={styles.book}>
          <path className={styles.star} d="M80 36 85.6 47.6 98.4 49.4 89.1 58.5 91.4 71.1 80 65.1 68.6 71.1 70.9 58.5 61.6 49.4 74.4 47.6Z" fill="#f2c75c" />
          <path d="M41.5 74.8C55.5 71.3 67.8 73 78.5 80.8V117.5C67.8 111.5 55.5 109.8 41.5 113.3ZM81.5 80.8C92.3 73 104.5 71.3 118.5 74.8V113.3C104.5 109.8 92.3 111.5 81.5 117.5Z" fill="#365e45" />
          <path className={styles.page} d="M81.5 81.8C93 74 103.5 72 115.5 74.8V110C103.5 108 93 111 81.5 117Z" fill="#86a17e" />
        </g>
      </svg>
      <p className={styles.heading}>
        <span>{characterName ? `${characterName}의 동화를` : "우리만의 동화를"}</span>{" "}
        <span>만들고 있어요</span>
      </p>
      <p className={styles.description}>완성되면 바로 보여드릴게요.</p>
    </div>
  );
}
