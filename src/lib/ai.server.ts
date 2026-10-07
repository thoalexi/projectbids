import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import type { z } from "zod/v4";

const RUN_ID = "X-Lovable-AIG-Run-ID";

/** One structured AI call through the Lovable AI Gateway (streamed, strict JSON schema). */
export async function aiJson<T>(schema: z.ZodType<T>, instructions: string, prompt: string): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI isn't set up for this site yet.");
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
      return res;
    },
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions,
    prompt,
    output: Output.object({ schema }),
    maxRetries: 0,
    onError: ({ error }) => {
      failure = error;
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  try {
    return (await result.output) as T;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e) && e.text) {
      try {
        return schema.parse(JSON.parse(e.text));
      } catch {
        /* fall through */
      }
    }
    const status = (failure ?? e) as { statusCode?: number };
    console.error("AI call failed", failure ?? e);
    if (status?.statusCode === 402) throw new Error("AI credits have run out. Add credits in workspace settings.");
    if (status?.statusCode === 429) throw new Error("The AI is busy right now. Try again in a minute.");
    throw new Error("The AI couldn't finish this. Try again.");
  }
}
