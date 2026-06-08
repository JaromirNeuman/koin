import type { NextRequest } from "next/server";

export const runtime = "edge";

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

const SYSTEM_PROMPT = `Jsi „Koin AI", osobní finanční asistent v aplikaci pro správu rozpočtu.
Odpovídáš česky, stručně, prakticky a přátelsky. Zaměřuješ se na rozpočet, výdaje, úspory a cíle.

Aktuální data uživatele (únor 2026):
- Příjem: €4 300
- Výdaje: €2 340
- Úspory: €1 960 (45,6 % příjmu)
- Největší kategorie: bydlení/nájem €750, jídlo, doprava, zábava
- Riziko: nepravidelné výdaje za auto

Když navrhuješ částky, používej formát s eurem (např. €120). Drž odpovědi stručné.

Formátování (Markdown): pro výčty používej odrážky "- " nebo číslovaný seznam "1. " (každá položka na vlastním řádku, ne v jednom odstavci). Klíčové pojmy a částky zvýrazni **tučně**. Bez nadpisů a tabulek.`;

const MODEL =
  process.env.OPENAI_MODEL ?? process.env.OPENAI_ESTIMATOR_MODEL ?? "gpt-4o-mini";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  // No key configured → tell the client to fall back to demo mode.
  if (!apiKey || apiKey === "your-openai-api-key") {
    return Response.json({ error: "missing_key" }, { status: 503 });
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? (body.messages as ChatMessage[]) : [];
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const sanitized = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content }));

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        temperature: 0.4,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...sanitized],
      }),
    });
  } catch {
    return Response.json({ error: "network_error" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return Response.json({ error: "upstream_error", status: upstream.status, detail }, { status: 502 });
  }

  // Transform OpenAI's SSE stream into a plain-text token stream.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const json = JSON.parse(data);
              const delta: string | undefined = json?.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              /* ignore keep-alive / partial frames */
            }
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
