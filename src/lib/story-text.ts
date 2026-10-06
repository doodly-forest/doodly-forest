export type StoryContent = { title: string; paragraphs: string[] };
export function narrationText(content: StoryContent) {
  return [content.title, ...content.paragraphs].join("\n\n");
}
export function formatDuration(seconds: number) {
  const rounded = Math.floor(seconds);
  return `${Math.floor(rounded / 60).toString().padStart(2, "0")}:${(rounded % 60).toString().padStart(2, "0")}`;
}
