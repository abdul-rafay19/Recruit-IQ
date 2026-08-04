// RecruitIQ — Send ONE Email Per Run
//
// Why this design: sending 20 emails with a 5-15 min sleep INSIDE one job would
// burn 3-6+ hours of a single GitHub Actions run. That's free on a public repo,
// but on a private repo it can blow through the 2000 free minutes/month in days.
// Instead, this script sends at most one email and exits in seconds. The
// human-like spacing comes from how OFTEN GitHub Actions calls this script
// (see .github/workflows/send-emails.yml), not from sleeping inside it.
//
// SAFETY RULES (never bypass): 20/day hard cap, Mon-Fri only, business-hours window.
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { sendEmail } from './lib/gmail.js';

const DAILY_LIMIT = parseInt(process.env.DAILY_EMAIL_LIMIT || '20', 10);
// Business-hours window in UTC. Defaults roughly cover 9am-6pm Pakistan Time
// (UTC+5) -> 04:00-13:00 UTC. Adjust to match the timezone of the recruiters
// you're mostly emailing, not necessarily your own.
const WINDOW_START_UTC = parseInt(process.env.SEND_WINDOW_START_HOUR_UTC || '4', 10);
const WINDOW_END_UTC = parseInt(process.env.SEND_WINDOW_END_HOUR_UTC || '13', 10);

function isBusinessDay() {
  const day = new Date().getUTCDay(); // 0=Sun ... 6=Sat
  return day >= 1 && day <= 5;
}

function isWithinWindow() {
  const hour = new Date().getUTCHours();
  return hour >= WINDOW_START_UTC && hour < WINDOW_END_UTC;
}

async function getQuota() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('daily_quota').select('*').eq('date', today).maybeSingle();
  if (data) return data;
  const { data: created } = await supabase
    .from('daily_quota')
    .insert({ date: today, sent_count: 0, max_limit: DAILY_LIMIT })
    .select()
    .single();
  return created;
}

async function main() {
  if (!isBusinessDay()) {
    console.log(JSON.stringify({ task_completed: 'SEND_ONE_EMAIL', stopped: true, reason: 'weekend' }));
    return;
  }
  if (!isWithinWindow()) {
    console.log(JSON.stringify({ task_completed: 'SEND_ONE_EMAIL', stopped: true, reason: 'outside_send_window' }));
    return;
  }

  const quota = await getQuota();
  if (quota.sent_count >= quota.max_limit) {
    console.log(JSON.stringify({ task_completed: 'SEND_ONE_EMAIL', stopped: true, reason: 'daily_limit_reached' }));
    return;
  }

  const { data: draft, error } = await supabase
    .from('outreach')
    .select('*, jobs(id), contacts(email)')
    .eq('status', 'draft')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  if (!draft) {
    console.log(JSON.stringify({ task_completed: 'SEND_ONE_EMAIL', stopped: true, reason: 'no_drafts_waiting' }));
    return;
  }

  // Small jitter so sends within the window don't land at an identical
  // :00/:20/:40 mark every time — cheap since the job itself is short-lived.
  const jitterMs = Math.random() * 4 * 60_000; // 0-4 min
  await new Promise(r => setTimeout(r, jitterMs));

  try {
    const result = await sendEmail({
      to: draft.contacts.email,
      subject: draft.subject,
      html: draft.body,
      text: draft.body_plain,
      attachments: [{ filename: 'CV.pdf', path: process.env.CV_PUBLIC_URL }]
    });
    if (!result.id) throw new Error(JSON.stringify(result));

    await supabase.from('outreach').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      message_id: result.id
    }).eq('id', draft.id);
    await supabase.rpc('increment_daily_quota');
    await supabase.from('jobs').update({ status: 'outreached' }).eq('id', draft.job_id);

    console.log(JSON.stringify({
      task_completed: 'SEND_ONE_EMAIL',
      timestamp: new Date().toISOString(),
      results: { sent: true, outreach_id: draft.id, remaining_quota: quota.max_limit - quota.sent_count - 1 }
    }, null, 2));
  } catch (e) {
    console.log(JSON.stringify({
      task_completed: 'SEND_ONE_EMAIL',
      timestamp: new Date().toISOString(),
      results: { sent: false },
      errors: [{ outreach_id: draft.id, error: e.message }]
    }, null, 2));
    process.exitCode = 1;
  }
}

main().catch(e => { console.error(e); process.exit(1); });
