// RecruitIQ — Multi-Source Job Discovery
// Runs every 6 hours via GitHub Actions. Queries free public job APIs, dedupes, saves to Supabase.
import 'dotenv/config';
import crypto from 'crypto';
import { supabase } from './lib/supabase.js';
import { fetchJobsFromSources } from './lib/job-sources.js';

const QUERIES = [
  'AI Engineer Pakistan remote',
  'LLM Engineer Generative AI remote',
  'Machine Learning Engineer Python remote'
];

function hash(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function main() {
  let inserted = 0, seen = 0;

  const jobs = await fetchJobsFromSources(QUERIES);
  seen = jobs.length;

  for (const job of jobs) {
    const url_hash = hash((job.job_apply_link || '') + (job.job_id || ''));
    const rawDomain = job.employer_website || '';
    const domain = rawDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '') || null;

    const row = {
      url_hash,
      title: job.job_title,
      company: job.employer_name,
      company_domain: domain,
      location: job.job_city ? `${job.job_city}, ${job.job_country}` : job.job_country,
      description: (job.job_description || '').slice(0, 3000),
      apply_url: job.job_apply_link,
      is_remote: !!job.job_is_remote,
      is_pakistan: job.job_country === 'PK' || job.job_country === 'Pakistan',
      status: 'new'
    };

    const { error, count } = await supabase
      .from('jobs')
      .upsert(row, { onConflict: 'url_hash', ignoreDuplicates: true, count: 'exact' });

    if (error) {
      console.error('Insert error:', error.message);
      continue;
    }
    if (count) inserted += count;
  }

  console.log(JSON.stringify({
    task_completed: 'DISCOVER_JOBS',
    timestamp: new Date().toISOString(),
    results: { inserted, skipped_duplicates: Math.max(seen - inserted, 0), total_found: seen },
    errors: []
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
