const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.CLAUDE_API_KEY?.trim());
}

export function getClaudeModel(): string {
  return process.env.CLAUDE_MODEL?.trim() || "claude-sonnet-4-6";
}

type ClaudeMessageResponse = {
  content?: { type: string; text?: string }[];
};

export async function claudeComplete(options: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string | null> {
  const apiKey = process.env.CLAUDE_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const response = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: getClaudeModel(),
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.5,
        system: options.system,
        messages: [{ role: "user", content: options.user }],
      }),
    });

    if (!response.ok) {
      console.error("[Claude] API error:", response.status, await response.text());
      return null;
    }

    const data = (await response.json()) as ClaudeMessageResponse;
    const textBlock = data.content?.find((block) => block.type === "text");
    return textBlock?.text?.trim() ?? null;
  } catch (error) {
    console.error("[Claude] request failed:", error);
    return null;
  }
}

function stripJsonFence(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export async function claudeJSON<T>(options: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<T | null> {
  const text = await claudeComplete({
    ...options,
    system: `${options.system}\n\nRespond with valid JSON only. No markdown fences or commentary.`,
  });

  if (!text) return null;

  try {
    return JSON.parse(stripJsonFence(text)) as T;
  } catch {
    console.error("[Claude] JSON parse failed:", text.slice(0, 300));
    return null;
  }
}
