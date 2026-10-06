import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import selectedFiles from "../../scripts/dinosaur-image-selection.json";
import { dinosaurImages } from "../lib/dinosaur-images";
import { characters, defaultSelection } from "../lib/story-options";
import { selectionSchema } from "../lib/story-schema";

it("all 60 unique selectable characters are accepted by the server schema", () => {
  expect(characters).toHaveLength(60);
  for (const field of ["id", "name", "storyName"] as const) {
    expect(new Set(characters.map((character) => character[field])).size).toBe(60);
  }
  expect(characters.filter((character) => character.category === "herbivore")).toHaveLength(30);
  expect(characters.filter((character) => character.category === "carnivore")).toHaveLength(24);
  expect(characters.filter((character) => character.category === "marine")).toHaveLength(6);
  for (const character of characters) {
    expect(selectionSchema.safeParse({ ...defaultSelection(), characterIds: [character.id] }).success, character.id).toBe(true);
  }
});

it("every card has a checked-in image matching its reviewed source, license and checksum", () => {
  const ids = characters.map((character) => character.id).sort();
  expect(Object.keys(dinosaurImages).sort()).toEqual(ids);
  expect(Object.keys(selectedFiles).sort()).toEqual(ids);
  for (const character of characters) {
    const artwork = dinosaurImages[character.id];
    expect(artwork.title, character.id).toBe(selectedFiles[character.id]);
    expect(artwork.src).toMatch(/^\/dinosaurs\/[a-z]+\.(png|jpg|webp)$/);
    const data = readFileSync(resolve("public", artwork.src.slice(1)));
    expect(data.length).toBeLessThan(3_000_000);
    expect(createHash("sha256").update(data).digest("hex"), character.id).toBe(artwork.sha256);
    expect(artwork.width).toBeGreaterThan(0); expect(artwork.height).toBeGreaterThan(0);
    expect(artwork.author.trim()).not.toBe("");
    expect(artwork.source).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\/File:/);
    expect(artwork.license).toMatch(/^(CC BY(?:-SA)? (?:2\.0|2\.5|3\.0|4\.0)|CC0|Public domain)$/);
    if (artwork.license !== "Public domain") {
      expect(artwork.licenseUrl).toMatch(/^https?:\/\/creativecommons.org\//);
    }
    expect(artwork.changes.trim()).not.toBe("");
  }
});
