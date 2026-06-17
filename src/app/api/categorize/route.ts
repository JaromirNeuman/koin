import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

const MODEL =
  process.env.OPENAI_MODEL ?? process.env.OPENAI_ESTIMATOR_MODEL ?? "gpt-4o-mini";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your-openai-api-key") {
    return Response.json({ error: "missing_key" }, { status: 503 });
  }

  let items: string[] = [];
  let categories: string[] = [];
  try {
    const body = await req.json();
    items = Array.isArray(body?.items) ? body.items.slice(0, 60).map(String) : [];
    categories = Array.isArray(body?.categories) ? body.categories.map(String) : [];
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  if (items.length === 0) {
    return Response.json({ result: [] });
  }

  const system =
    "Jsi klasifikátor bankovních transakcí. Ke každému popisu přiřaď jednu výstižnou kategorii. " +
    "Pokud se hodí některá z existujících kategorií, použij přesně její název. " +
    "Pokud žádná nesedí, navrhni novou stručnou kategorii (1–2 slova, česky, velké první písmeno, např. „Jídlo\", „Doprava\", „Zábava\"). " +
    "Nepoužívej „Bez kategorie\". " +
    'Odpověz POUZE validním JSON ve tvaru {"result":["Kategorie", ...]} se stejným počtem položek a ve stejném pořadí jako vstup. Žádný další text.';
  const userPrompt = `Existující kategorie: ${
    categories.length ? JSON.stringify(categories) : "(žádné)"
  }\nPopisy transakcí:\n${items.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;

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
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  } catch {
    return Response.json({ error: "network_error" }, { status: 502 });
  }

  if (!upstream.ok) {
    return Response.json({ error: "upstream_error" }, { status: 502 });
  }

  const data = await upstream.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "{}";

  let parsedResult: unknown[] = [];
  try {
    const jsonText = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed?.result)) parsedResult = parsed.result;
  } catch {
    /* fall through to defaults */
  }

  const result = items.map((_, i) => {
    const val = String(parsedResult[i] ?? "").trim().slice(0, 40);
    return val || "Ostatní";
  });

  return Response.json({ result });
}
