import "server-only";
import OpenAI from "openai";
import { ApiFailure } from "./api-errors";

export function openAI() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new ApiFailure("API_NOT_CONFIGURED");
  return new OpenAI({ apiKey, baseURL: "https://api.openai.com/v1", maxRetries: 0, logLevel: "off" });
}
