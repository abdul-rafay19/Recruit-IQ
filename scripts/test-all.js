// RecruitIQ — API Connection Tester
// Tests: Gemini, Gemini Embeddings, NVIDIA NIM, Supabase, Job Sources (Arbeitnow/Remotive), Hunter, Gmail SMTP/IMAP
// Usage: node scripts/test-all.js
import 'dotenv/config';

const results = {};

async function testGemini() {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      results.gemini = 'FAIL: Missing GEMINI_API_KEY in .env';
      return;
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with exactly: {"status":"ok"}' }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );
    const d = await res.json();
    if (!res.ok) {
      results.gemini = `FAIL (${res.status}): ${d.error?.message || JSON.stringify(d)}`;
      return;
    }
    const txt = d.candidates?.[0]?.content?.parts?.[0]?.text;
    results.gemini = txt?.includes('ok') ? 'PASS' : 'FAIL: unexpected response ' + txt;
  } catch (e) { results.gemini = 'FAIL: ' + e.message; }
}

async function testGeminiEmbedding() {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      results.gemini_embedding = 'FAIL: Missing GEMINI_API_KEY in .env';
      return;
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: 'test embedding' }] },
          outputDimensionality: 768
        })
      }
    );
    const d = await res.json();
    if (!res.ok) {
      results.gemini_embedding = `FAIL (${res.status}): ${d.error?.message || JSON.stringify(d)}`;
      return;
    }
    const dims = d.embedding?.values?.length;
    results.gemini_embedding = dims === 768 ? `PASS (${dims} dimensions)` : 'FAIL: ' + JSON.stringify(d).slice(0, 100);
  } catch (e) { results.gemini_embedding = 'FAIL: ' + e.message; }
}

async function testNim() {
  try {
    await withTimeout((async () => {
      const model = process.env.NIM_MODEL || 'meta/llama-3.3-70b-instruct';
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NIM_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
          max_tokens: 10
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        results.nim = `FAIL (${res.status}): ${errText.slice(0, 150)}`;
        return;
      }
      const d = await res.json();
      const txt = d.choices?.[0]?.message?.content;
      results.nim = txt ? `PASS (model: ${model})` : 'FAIL: ' + JSON.stringify(d).slice(0, 150);
    })(), 60000, 'NVIDIA NIM');
  } catch (e) { results.nim = 'FAIL: ' + e.message; }
}

async function testSupabase() {
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/jobs?select=count&limit=1`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });
    results.supabase = res.ok ? `PASS (status ${res.status})` : 'FAIL: ' + res.status;
  } catch (e) { results.supabase = 'FAIL: ' + e.message; }
}

async function testJobSources() {
  try {
    const { fetchJobsFromSources } = await import('./lib/job-sources.js');
    const jobs = await fetchJobsFromSources(['AI Engineer']);
    results.job_sources = jobs.length > 0 ? `PASS (${jobs.length} jobs fetched)` : 'FAIL: 0 jobs returned';
  } catch (e) { results.job_sources = 'FAIL: ' + e.message; }
}

async function testHunter() {
  try {
    const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=google.com&api_key=${process.env.HUNTER_API_KEY}&limit=1`);
    const text = await res.text();
    console.log(text);

    const d = JSON.parse(text);
    if (!res.ok) {
      results.hunter = `FAIL (${res.status}): ${d.errors?.[0]?.details || JSON.stringify(d).slice(0, 100)}`;
      return;
    }
    results.hunter = d.data?.emails ? `PASS (${d.data.emails.length} emails for google.com)` : 'FAIL: ' + JSON.stringify(d).slice(0, 100);
  } catch (e) { results.hunter = 'FAIL: ' + e.message; }
}

function withTimeout(promise, ms, name) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} timed out after ${ms / 1000}s. Check your network/API.`)), ms))
  ]);
}

async function testGmailSmtp() {
  try {
    await withTimeout((async () => {
      const nodemailer = (await import('nodemailer')).default;
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.YOUR_EMAIL, pass: process.env.GMAIL_APP_PASSWORD }
      });
      await transporter.verify();
      transporter.close();
    })(), 5000, 'Gmail SMTP');
    results.gmail_smtp = 'PASS';
  } catch (e) { results.gmail_smtp = 'FAIL: ' + e.message; }
}

async function testGmailImap() {
  try {
    await withTimeout((async () => {
      const { ImapFlow } = await import('imapflow');
      const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user: process.env.YOUR_EMAIL, pass: process.env.GMAIL_APP_PASSWORD },
        logger: false
      });
      await client.connect();
      await client.logout();
    })(), 5000, 'Gmail IMAP');
    results.gmail_imap = 'PASS';
  } catch (e) { results.gmail_imap = 'FAIL: ' + e.message; }
}

async function main() {
  console.log('Testing all RecruitIQ API connections...\n');
  const tests = [
    ['gemini', testGemini],
    ['gemini_embedding', testGeminiEmbedding],
    ['nim', testNim],
    ['supabase', testSupabase],
    ['job_sources', testJobSources],
    ['hunter', testHunter],
    ['gmail_smtp', testGmailSmtp],
    ['gmail_imap', testGmailImap]
  ];

  for (const [name, fn] of tests) {
    await fn();
    console.log(`  ${name.padEnd(16)}: ${results[name]}`);
  }

  const failed = Object.values(results).filter(v => v.startsWith('FAIL')).length;
  console.log(`\n${failed === 0 ? 'ALL TESTS PASSED' : failed + ' TEST(S) FAILED — fix before enabling the scheduled workflows'}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
