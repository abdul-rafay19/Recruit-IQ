// RecruitIQ — Email Personalisation
// Retrieval: Gemini embeddings + pgvector (match_resume_chunks)
// Writing:   NVIDIA NIM (Llama 3.3 70B by default)
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { geminiEmbed } from './lib/gemini.js';
import { nimJSON } from './lib/nim.js';

const SYSTEM = `You write cold outreach emails for an AI engineer applying to tech jobs.
Follow every rule exactly and return ONLY valid JSON — no markdown fences, no commentary before or after.`;

function buildUserPrompt({ resumeContext, contactName, contactRole, company, job }) {
  return `SENDER BACKGROUND (from resume):
${resumeContext}

RECIPIENT:
Name: ${contactName || 'Hiring Team'}
Role: ${contactRole || 'Recruiter'}
Company: ${company}

JOB:
Title: ${job.title}
Location: ${job.location} | Remote: ${job.is_remote}
Description (excerpt): ${(job.description || '').slice(0, 600)}

RULES — FOLLOW ALL WITHOUT EXCEPTION:
1. Body: MAXIMUM 150 words — count them — stay under.
2. BANNED opening phrases: "I am writing to express...", "I hope this email finds you...",
   "I am passionate about...", "I believe I would be a great fit...", "I am reaching out because..."
3. Opening line: reference something specific about THIS company OR this role's tech stack.
4. Middle: mention exactly ONE project that matches their stack — name the tech, name a result.
5. Closing: ONE specific ask — "15-minute call" or "happy to share more".
6. Signature: Name, LinkedIn, GitHub, Portfolio.
7. Tone: confident engineer, concise, respectful of reader's time.
8. NEVER mention being a student.

SUBJECT LINES — exactly 3 variants, under 60 characters each. Never start with
"Application for", "Interested in", "Following up", "Re:", or "I am a".

Return ONLY this JSON shape:
{"subject_variants": ["s1","s2","s3"], "body_html": "<p>Hi ...</p><p>...</p>", "body_plain": "Hi ...\\n\\n...\\n\\nBest,\\n..."}`;
}

async function main() {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*, contacts(id, email, name, role)')
    .eq('status', 'qualified')
    .limit(25);
  if (error) throw error;

  let drafts = 0;
  const errors = [];

  for (const job of jobs || []) {
    const contact = job.contacts?.[0];
    if (!contact) continue;

    const { data: already } = await supabase.from('outreach').select('id').eq('job_id', job.id).limit(1);
    if (already?.length) continue; // already drafted/sent

    try {
      const vector = await geminiEmbed(job.description || job.title);
      const { data: chunks, error: rpcErr } = await supabase.rpc('match_resume_chunks', {
        query_embedding: `[${vector.join(',')}]`,
        match_count: 5
      });
      if (rpcErr) throw rpcErr;
      const resumeContext = (chunks || []).map(c => c.content).join('\n\n');

      const userPrompt = buildUserPrompt({
        resumeContext,
        contactName: contact.name,
        contactRole: contact.role,
        company: job.company,
        job
      });
      const result = await nimJSON(SYSTEM, userPrompt, 0.7);

      await supabase.from('outreach').insert({
        job_id: job.id,
        contact_id: contact.id,
        subject: result.subject_variants[0],
        body: result.body_html,
        body_plain: result.body_plain,
        status: 'draft'
      });
      drafts++;
    } catch (e) {
      errors.push({ job_id: job.id, error: e.message });
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(JSON.stringify({
    task_completed: 'GENERATE_EMAILS',
    timestamp: new Date().toISOString(),
    results: { drafts_created: drafts },
    errors
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
