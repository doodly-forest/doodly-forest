import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import dinosaurFiles from "../../scripts/dinosaur-image-selection.json";
import { characterImages } from "../lib/character-images";
import { characters, charactersForWorld, characterCategories, defaultSelection } from "../lib/story-options";
import { selectionSchema } from "../lib/story-schema";

it("all 82 unique selectable characters are accepted within their world by the server schema", () => {
  expect(characters).toHaveLength(82);
  expect(charactersForWorld("dinosaur")).toHaveLength(60);
  expect(charactersForWorld("vehicle")).toHaveLength(22);
  for (const field of ["id", "name", "storyName"] as const) {
    expect(new Set(characters.map((character) => character[field])).size).toBe(82);
  }
  expect(characters.filter((character) => character.category === "herbivore")).toHaveLength(30);
  expect(characters.filter((character) => character.category === "carnivore")).toHaveLength(24);
  expect(characters.filter((character) => character.category === "marine")).toHaveLength(6);
  expect(characters.filter((character) => character.category === "everyday")).toHaveLength(7);
  expect(characters.filter((character) => character.category === "construction")).toHaveLength(10);
  expect(characters.filter((character) => character.category === "helpers")).toHaveLength(5);
  for (const character of characters) {
    expect(characterCategories.find((category) => category.id === character.category)?.world).toBe(character.world);
    expect(selectionSchema.safeParse({ ...defaultSelection(), world: character.world, characterIds: [character.id] }).success, character.id).toBe(true);
    const otherWorld = character.world === "vehicle" ? "dinosaur" : "vehicle";
    expect(selectionSchema.safeParse({ ...defaultSelection(), world: otherWorld, characterIds: [character.id] }).success, character.id).toBe(false);
  }
});

it("every card has a checked-in image with a valid checksum and correct origin", () => {
  const ids = characters.map((character) => character.id).sort();
  const selectedFiles: Record<string, string> = dinosaurFiles;
  expect(Object.keys(characterImages).sort()).toEqual(ids);
  expect(Object.keys(selectedFiles).sort()).toEqual(charactersForWorld("dinosaur").map((character) => character.id).sort());
  for (const character of characters) {
    const artwork = characterImages[character.id];
    expect(artwork.src).toMatch(new RegExp(`^/${character.world === "vehicle" ? "vehicles" : "dinosaurs"}/${character.id}\\.${character.world === "vehicle" ? "svg" : "(png|jpg|webp)"}$`));
    const data = readFileSync(resolve("public", artwork.src.slice(1)));
    expect(data.length).toBeLessThan(3_000_000);
    expect(createHash("sha256").update(data).digest("hex"), character.id).toBe(artwork.sha256);
    expect(artwork.width).toBeGreaterThan(0); expect(artwork.height).toBeGreaterThan(0);
    expect(artwork.author.trim()).not.toBe("");
    expect(artwork.kind).toBe(character.world === "vehicle" ? "original" : "commons");
    if (artwork.kind === "commons") {
      expect(artwork.title, character.id).toBe(selectedFiles[character.id]);
      expect(artwork.source).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\/File:/);
      expect(artwork.license).toMatch(/^(CC BY(?:-SA)? (?:2\.0|2\.5|3\.0|4\.0)|CC0|Public domain)$/);
      if (artwork.license !== "Public domain") expect(artwork.licenseUrl).toMatch(/^https?:\/\/creativecommons.org\//);
    } else {
      expect(data.toString()).toContain(`<title id="title">${character.name} 일러스트</title>`);
    }
    expect(artwork.changes.trim()).not.toBe("");
  }
});
