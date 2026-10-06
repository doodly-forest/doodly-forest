import manifest from "./dinosaur-images.json";

export type DinosaurImage = {
  src: string;
  width: number;
  height: number;
  title: string;
  author: string;
  source: string;
  license: string;
  licenseUrl: string;
  credit: string;
  changes: string;
  retrievedAt: string;
  sha256: string;
};

export const dinosaurImages: Readonly<Record<string, DinosaurImage>> = manifest;
