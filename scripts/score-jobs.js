// RecruitIQ — Relevance Scoring (Gemini)
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { geminiJSON } from './lib/gemini.js';

async function getCandidateContext() {
  const { data } = await supabase
    .from('resume_chunks')
    .select('content, chunk_type')
    .in('chunk_type', ['summary', 'skills', 'experience']);
  
  if (data && data.length > 0) {
    return data.map(d => `${d.chunk_type.toUpperCase()}: ${d.content}`).join('\n\n');
  }

  // Generic fallback if resume_chunks not populated yet
  return `CANDIDATE PROFILE:
Name: ${process.env.YOUR_NAME || 'Candidate'}
Skills: Python, SQL, Machine Learning, Deep Learning, LLMs, RAG, Agentic AI, FastAPI, NVIDIA NIM, Streamlit
Location: Global/Remote preferred
Level: Junior/Mid-level AI/ML Engineer (0-2 years experience)`;
}

function buildPrompt(job, candidateContext) {
  return `You are scoring tech & AI job postings for relevance to a candidate.

CANDIDATE PROFILE SUMMARY:
${candidateContext}

JOB TO SCORE:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Remote: ${job.is_remote}
Description: ${job.description}

SCORING RUBRIC (total 100 points):
[Technical Match — 40pts] Full match (RAG, LLM, Python, AI automation)=36-40; Strong (ML, NLP, CV, DL)=28-35; Partial=15-27; Weak=0-14
[Accessibility & Remote — 25pts] Fully remote=23-25; Remote w/ tz flexibility=18-22; Match location=15-20; In-office mismatched location=0
[Experience Level Fit — 20pts] 0-2yr fit=18-20; 2-3yr=13-17; 3-5yr=8-12; Senior 5+=0-7
[Growth & Company Quality — 15pts] AI-first startup=13-15; Established w/ AI team=9-12; Traditional=5-8; Unclear=0-4

Respond ONLY with valid JSON, no markdown:
{"score": 82, "verdict": "qualified", "reasoning": "...", "match_highlights": ["RAG","Python"], "concerns": ["..."], "accessibility": "remote"}`;
}

async function main() {
  const { data: jobs, error } = await supabase.from('jobs').select('*').eq('status', 'new').limit(20);
  if (error) throw error;

  const candidateContext = await getCandidateContext();
  let qualified = 0, rejected = 0;
  const errors = [];

  for (const job of jobs || []) {
    try {
      const result = await geminiJSON(buildPrompt(job, candidateContext), 0.1);
      const status = result.score >= (parseInt(process.env.MIN_RELEVANCE_SCORE || '70', 10)) ? 'qualified' : 'rejected';
      await supabase.from('jobs').update({
        relevance_score: result.score,
        status,
        score_reasoning: result.reasoning,
        match_highlights: result.match_highlights
      }).eq('id', job.id);
      status === 'qualified' ? qualified++ : rejected++;
    } catch (e) {
      errors.push({ job_id: job.id, error: e.message });
    }
    await new Promise(r => setTimeout(r, 2000)); // stay under Gemini rate limit
  }

  console.log(JSON.stringify({
    task_completed: 'SCORE_JOBS',
    timestamp: new Date().toISOString(),
    results: { qualified, rejected, total_scored: (jobs || []).length },
    errors
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
