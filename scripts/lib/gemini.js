const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function fetchWithTimeout(url, options, ms = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Gemini request timed out after ${ms / 1000}s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls Gemini and parses a strict-JSON response.
 * Used for: relevance scoring, reply classification.
 */
export async function geminiJSON(prompt, temperature = 0.1) {
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, responseMimeType: 'application/json' }
      })
    }
  );
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini: no text in response: ' + JSON.stringify(data).slice(0, 300));
  return JSON.parse(text);
}

/**
 * Calls Gemini's embedding model. Returns a 768-dim vector.
 * Used for: resume chunk embeddings + job description embeddings (RAG retrieval).
 */
export async function geminiEmbed(text) {
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        outputDimensionality: 768
      })
    }
  );
  const data = await res.json();
  if (!data.embedding?.values) throw new Error('Gemini embed failed: ' + JSON.stringify(data).slice(0, 300));
  return data.embedding.values; // 768 numbers
}
