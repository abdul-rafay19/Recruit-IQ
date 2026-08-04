// RecruitIQ — Contact Finder (Hunter.io + pattern fallback)
import 'dotenv/config';
import { supabase } from './lib/supabase.js';

const PATTERNS = ['careers', 'hiring', 'hr', 'talent', 'jobs'];

async function huntEmails(domain) {
  const res = await fetch(
    `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${process.env.HUNTER_API_KEY}&limit=3`
  );
  const data = await res.json();
  return data.data?.emails || [];
}

async function main() {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, company_domain, company')
    .eq('status', 'qualified')
    .limit(10);
  if (error) throw error;

  let hunterFound = 0, patternGuessed = 0;
  const errors = [];

  for (const job of jobs || []) {
    const { data: existing } = await supabase.from('contacts').select('id').eq('job_id', job.id).limit(1);
    if (existing?.length) continue; // already has a contact
    if (!job.company_domain) continue; // nothing to search on

    try {
      const emails = await huntEmails(job.company_domain);
      let row;
      if (emails.length) {
        const best = emails[0];
        row = {
          job_id: job.id,
          email: best.value,
          name: [best.first_name, best.last_name].filter(Boolean).join(' ') || null,
          role: best.position || null,
          company_domain: job.company_domain,
          source: 'hunter',
          confidence: 'high'
        };
        hunterFound++;
      } else {
        row = {
          job_id: job.id,
          email: `${PATTERNS[0]}@${job.company_domain}`,
          company_domain: job.company_domain,
          source: 'pattern_guess',
          confidence: 'medium'
        };
        patternGuessed++;
      }
      await supabase.from('contacts').insert(row);
    } catch (e) {
      errors.push({ job_id: job.id, error: e.message });
    }
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log(JSON.stringify({
    task_completed: 'FIND_CONTACTS',
    timestamp: new Date().toISOString(),
    results: { hunter_found: hunterFound, pattern_guessed: patternGuessed },
    errors
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
