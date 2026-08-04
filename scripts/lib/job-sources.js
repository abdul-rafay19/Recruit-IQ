/**
 * RecruitIQ — Multi-Source Job Discovery Engine
 * Aggregates tech and AI/ML jobs from multiple free APIs (Arbeitnow, Remotive).
 * Zero key required, highly reliable, and self-cleaning.
 */

export async function fetchJobsFromSources(queries = []) {
  const jobs = [];

  // Source 1: Arbeitnow (Free Job Board API)
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api');
    if (res.ok) {
      const data = await res.json();
      const rawJobs = data.data || [];
      for (const j of rawJobs) {
        jobs.push({
          job_title: j.title,
          employer_name: j.company_name,
          employer_website: j.url ? new URL(j.url).hostname : null,
          job_city: j.location || null,
          job_country: j.remote ? 'Remote' : (j.location || 'Global'),
          job_description: j.description ? j.description.replace(/<[^>]*>?/gm, '') : '',
          job_apply_link: j.url,
          job_is_remote: true,
          job_id: `arbeitnow-${j.slug || j.title}`
        });
      }
    }
  } catch (e) {
    console.warn('Arbeitnow fetch notice:', e.message);
  }

  // Source 2: Remotive (Free Remote Software Dev Jobs API)
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=25');
    if (res.ok) {
      const data = await res.json();
      const rawJobs = data.jobs || [];
      for (const j of rawJobs) {
        jobs.push({
          job_title: j.title,
          employer_name: j.company_name,
          employer_website: j.url ? new URL(j.url).hostname : null,
          job_city: j.candidate_required_location || 'Remote',
          job_country: 'Remote',
          job_description: j.description ? j.description.replace(/<[^>]*>?/gm, '') : '',
          job_apply_link: j.url,
          job_is_remote: true,
          job_id: `remotive-${j.id}`
        });
      }
    }
  } catch (e) {
    console.warn('Remotive fetch notice:', e.message);
  }

  // Filter jobs against search query keywords (e.g. AI, Engineer, Python, ML, LLM, Developer)
  const keywords = ['ai', 'ml', 'machine learning', 'llm', 'python', 'engineer', 'developer', 'data', 'backend', 'full stack'];
  const filtered = jobs.filter(j => {
    const text = `${j.job_title} ${j.job_description}`.toLowerCase();
    return keywords.some(kw => text.includes(kw));
  });

  return filtered.length > 0 ? filtered : jobs.slice(0, 15);
}
