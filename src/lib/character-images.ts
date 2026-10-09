import { dinosaurImages, type DinosaurImage } from "./dinosaur-images";
import vehicleImages from "./vehicle-images.json";

export type CharacterImage = (DinosaurImage & { kind: "commons" }) | {
  kind: "original";
  src: string;
  width: number;
  height: number;
  title: string;
  author: string;
  changes: string;
  sha256: string;
};

export const characterImages: Readonly<Record<string, CharacterImage>> = {
  ...Object.fromEntries(Object.entries(dinosaurImages).map(([id, image]) => [id, { ...image, kind: "commons" as const }])),
  ...Object.fromEntries(Object.entries(vehicleImages).map(([id, image]) => [id, { ...image, kind: "original" as const }])),
};
