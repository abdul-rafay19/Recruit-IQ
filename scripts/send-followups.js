// RecruitIQ — Follow-ups (Day 5 + Day 10), runs weekday mornings via GitHub Actions cron
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { nimJSON } from './lib/nim.js';
import { sendEmail } from './lib/gmail.js';

async function fetchDue(days, followUpCount) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('outreach')
    .select('*, jobs(title, company), contacts(email, name)')
    .eq('status', 'sent')
    .eq('follow_up_count', followUpCount)
    .is('replied_at', null)
    .lt('sent_at', cutoff)
    .limit(10);
  return data || [];
}

async function day5Email(o) {
  const system = 'Write a short Day-5 cold-outreach follow-up email. Return ONLY valid JSON.';
  const user = `Original outreach was about: ${o.jobs.title} at ${o.jobs.company}. Days since sent: 5. No reply received.
Rules:
1. Open with a natural reference to the previous email ("following up on my note from last week").
2. Add ONE new micro-value: a quick project update, a relevant insight, or a new link.
3. Do NOT apologise for following up.
4. Do NOT write "I just wanted to check in".
5. Body under 70 words — hard limit.
6. Simple CTA: "Happy to connect if timing works".
Return ONLY JSON: {"subject": "Re: ... — quick follow-up", "body_html": "<p>Hi ...</p>", "body_plain": "Hi ...\\n\\nBest,\\n..."}`;
  return nimJSON(system, user, 0.7);
}

async function day10Email(o) {
  const system = 'Write a final bump cold-outreach email. Return ONLY valid JSON.';
  const user = `This is the last follow-up for: ${o.jobs.title} at ${o.jobs.company}.
Rules:
1. Acknowledge this is your last note.
2. Keep the door open warmly and professionally.
3. Body under 40 words — strict.
4. Leave a positive lasting impression.
Return ONLY JSON: {"subject": "Re: ... — last note", "body_html": "<p>Hi ...</p>", "body_plain": "Hi ...\\n\\nBest,\\n..."}`;
  return nimJSON(system, user, 0.7);
}

async function main() {
  let day5Sent = 0, day10Sent = 0, closed = 0;
  const errors = [];

  for (const o of await fetchDue(5, 0)) {
    try {
      const email = await day5Email(o);
      const result = await sendEmail({
        to: o.contacts.email, subject: email.subject, html: email.body_html, text: email.body_plain
      });
      if (!result.id) throw new Error(JSON.stringify(result));
      await supabase.from('outreach').update({
        follow_up_count: 1, last_follow_up_at: new Date().toISOString()
      }).eq('id', o.id);
      day5Sent++;
    } catch (e) {
      errors.push({ outreach_id: o.id, stage: 'day5', error: e.message });
    }
    await new Promise(r => setTimeout(r, 60_000));
  }

  for (const o of await fetchDue(10, 1)) {
    try {
      const email = await day10Email(o);
      const result = await sendEmail({
        to: o.contacts.email, subject: email.subject, html: email.body_html, text: email.body_plain
      });
      if (!result.id) throw new Error(JSON.stringify(result));
      await supabase.from('outreach').update({
        follow_up_count: 2, status: 'closed', last_follow_up_at: new Date().toISOString()
      }).eq('id', o.id);
      day10Sent++; closed++;
    } catch (e) {
      errors.push({ outreach_id: o.id, stage: 'day10', error: e.message });
    }
    await new Promise(r => setTimeout(r, 60_000));
  }

  console.log(JSON.stringify({
    task_completed: 'SEND_FOLLOWUPS',
    timestamp: new Date().toISOString(),
    results: { day5_sent: day5Sent, day10_sent: day10Sent, total_closed: closed },
    errors
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
