/**
 * Calls NVIDIA NIM's OpenAI-compatible /chat/completions endpoint with automatic retries
 * and parses a JSON object out of the response.
 */
export async function nimJSON(systemPrompt, userPrompt, temperature = 0.7, retries = 3) {
  const apiKey = process.env.NIM_API_KEY;
  const model = process.env.NIM_MODEL || 'meta/llama-3.3-70b-instruct';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          top_p: 0.9,
          max_tokens: 1024
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status >= 500 && attempt < retries) {
          console.warn(`NIM attempt ${attempt} failed (${res.status}). Retrying...`);
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw new Error(`NIM HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('NIM: no content in response: ' + JSON.stringify(data).slice(0, 300));

      const cleaned = text.replace(/```json|```/g, '').trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error('NIM: could not parse JSON from: ' + cleaned.slice(0, 300));
      }
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}
