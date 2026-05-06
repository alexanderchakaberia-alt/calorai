import Groq from "groq-sdk";

const DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

function extractJsonObject(text) {
  const s = String(text ?? "").trim();
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : s;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI did not return valid JSON.");
  }
  const jsonText = candidate.slice(start, end + 1);
  return JSON.parse(jsonText);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing Groq API key in environment variables." });
    }

    const { imageBase64 } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ error: "Missing imageBase64 in request body." });
    }

    const dataUrl = imageBase64.startsWith("data:image/")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const groq = new Groq({ apiKey });
    const model = process.env.GROQ_VISION_MODEL || DEFAULT_VISION_MODEL;

    const systemPrompt = [
      "You are a nutrition assistant.",
      "Identify the food in the image and estimate portion size.",
      "Return ONLY valid JSON with these exact fields:",
      "food_name (string), portion (string), calories (number), protein (number), fat (number), carbs (number).",
      "No extra keys, no markdown, no commentary.",
    ].join("\n");

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this food photo and return the JSON now." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const content = completion?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJsonObject(content);

    return res.status(200).json(parsed);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    const message = err?.message ? String(err.message) : "Failed to analyze food image.";
    return res.status(500).json({ error: message });
  }
}

