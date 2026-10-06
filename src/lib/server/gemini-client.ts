import "server-only";
import { GoogleGenAI } from "@google/genai";
import { ApiFailure } from "./api-errors";

export function gemini() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new ApiFailure("API_NOT_CONFIGURED");
  return new GoogleGenAI({
    apiKey,
    enterprise: false,
    httpOptions: {
      baseUrl: "https://generativelanguage.googleapis.com",
      apiVersion: "v1beta",
      retryOptions: { attempts: 1 },
    },
  });
}
