// RecruitIQ — Reply Detection
// Replaces the old Resend inbound-webhook approach. Since we send via Gmail
// SMTP directly, there's no webhook to receive replies — instead this polls
// the Gmail inbox over IMAP on a schedule, matches replies to outreach
// records by sender email, classifies with Gemini, and updates Supabase.
//
// Requires: IMAP enabled in Gmail (Settings -> Forwarding and POP/IMAP ->
// Enable IMAP), and the same App Password used for sending.
import 'dotenv/config';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { supabase } from './lib/supabase.js';
import { geminiJSON } from './lib/gemini.js';

async function classify(replyText) {
  const prompt = `Classify this email reply from a recruiter/hiring manager.
Context: reply is in response to a cold outreach email for an AI Engineering role.

Reply text:
${replyText.slice(0, 3000)}

Categories:
POSITIVE = interest in moving forward, scheduling a call, interview invite, wanting more info in an interested way
NEGATIVE = clear rejection, position filled, budget cut, not hiring
INFO_REQUEST = asking for portfolio, salary, work authorisation, availability, references, more samples
SPAM = auto-reply, out-of-office, unsubscribe request
UNCLEAR = genuinely ambiguous, needs human review

Respond ONLY with JSON:
{"category": "POSITIVE", "confidence": 0.96, "summary": "...", "suggested_action": "...", "urgency": "high"}`;
  return geminiJSON(prompt, 0.1);
}

async function main() {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: process.env.YOUR_EMAIL, pass: process.env.GMAIL_APP_PASSWORD },
    logger: false
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');

  let processed = 0, unmatched = 0;
  const errors = [];

  try {
    const uids = await client.search({ seen: false });

    for (const uid of uids || []) {
      let fromEmail, bodyText;
      try {
        const msg = await client.fetchOne(uid, { source: true });
        const parsed = await simpleParser(msg.source);
        fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase();
        bodyText = parsed.text || '';
      } catch (e) {
        errors.push({ uid, stage: 'parse', error: e.message });
        continue;
      }
      if (!fromEmail) continue;

      // Match this reply to the most recent un-replied outreach sent to this address.
      const { data: outreach, error: findErr } = await supabase
        .from('outreach')
        .select('id, contacts!inner(email)')
        .eq('contacts.email', fromEmail)
        .eq('status', 'sent')
        .is('replied_at', null)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findErr || !outreach) {
        unmatched++;
        await client.messageFlagsAdd(uid, ['\\Seen']); // don't reprocess non-matches every run
        continue;
      }

      try {
        const result = await classify(bodyText);
        await supabase.from('outreach').update({
          status: 'replied',
          reply_category: result.category,
          reply_text: bodyText.slice(0, 2000),
          reply_summary: result.summary,
          suggested_action: result.suggested_action,
          replied_at: new Date().toISOString()
        }).eq('id', outreach.id);
        processed++;
      } catch (e) {
        errors.push({ from: fromEmail, stage: 'classify', error: e.message });
      }
      await client.messageFlagsAdd(uid, ['\\Seen']);
    }
  } finally {
    lock.release();
    await client.logout();
  }

  console.log(JSON.stringify({
    task_completed: 'CHECK_REPLIES',
    timestamp: new Date().toISOString(),
    results: { processed, unmatched },
    errors
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
