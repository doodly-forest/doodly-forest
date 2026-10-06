import "server-only";
import { ApiFailure } from "./api-errors";

export type AIProvider = "gemini" | "openai";

// Select one provider for all stages. A missing key never triggers a fallback.
export function aiProvider(): AIProvider {
  const provider = modelSetting("AI_PROVIDER", "gemini");
  if (provider !== "gemini" && provider !== "openai") throw new ApiFailure("API_NOT_CONFIGURED");
  return provider;
}

export function modelSetting(name: string, fallback: string) {
  const value = (process.env[name] ?? fallback).trim();
  if (!value) throw new ApiFailure("API_NOT_CONFIGURED");
  return value;
}
