// RecruitIQ Dashboard — Premium Dark Glassmorphism Page
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 0;

export default async function Dashboard() {
  const { data: stats } = await supabase.from('analytics_summary').select('*').maybeSingle();
  const { data: emails } = await supabase.from('outreach_details').select('*').limit(25);
  const { data: quota } = await supabase
    .from('daily_quota')
    .select('*')
    .eq('date', new Date().toISOString().split('T')[0])
    .maybeSingle();

  const sentToday = quota?.sent_count || 0;
  const limitToday = quota?.max_limit || 20;
  const pct = limitToday ? Math.min(Math.round((sentToday / limitToday) * 100), 100) : 0;

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #38BDF8, #818CF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              RecruitIQ
            </h1>
            <span style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8', padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
              v2.0 Autonomous
            </span>
          </div>
          <p style={{ color: '#94A3B8', marginTop: '6px', fontSize: '0.95rem' }}>
            AI Job Outreach Pipeline & Real-Time Analytics
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 16px', borderRadius: '999px' }}>
          <div className="pulse-dot" />
          <span style={{ fontSize: '0.85rem', color: '#CBD5E1', fontWeight: 500 }}>Engine Active</span>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'Jobs Discovered', value: stats?.jobs_total || 0, color: '#38BDF8', icon: '🔍' },
          { label: 'Qualified Jobs', value: stats?.jobs_qualified || 0, color: '#34D399', icon: '🎯' },
          { label: 'Emails Sent', value: stats?.emails_sent || 0, color: '#818CF8', icon: '✉️' },
          { label: 'Total Replied', value: stats?.emails_replied || 0, color: '#FBBF24', icon: '💬' },
          { label: 'Positive Matches', value: stats?.positive_replies || 0, color: '#34D399', icon: '🔥' },
          { label: `Today: ${sentToday}/${limitToday}`, value: `${pct}%`, color: pct >= 90 ? '#FB7185' : '#38BDF8', icon: '⚡' }
        ].map(card => (
          <div key={card.label} className="glass-card" style={{ padding: '1.5rem 1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 500 }}>{card.label}</span>
              <span style={{ fontSize: '1.1rem' }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: card.color, letterSpacing: '-0.02em' }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quota Progress Banner */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#F8FAFC' }}>
            Daily Sending Quota Guardrail
          </span>
          <span style={{ color: '#94A3B8', fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace' }}>
            {sentToday} / {limitToday} emails ({limitToday - sentToday} remaining)
          </span>
        </div>
        <div style={{ background: 'rgba(15, 23, 42, 0.8)', borderRadius: 99, height: 10, overflow: 'hidden', padding: 2 }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: pct >= 90 ? 'linear-gradient(90deg, #FBBF24, #FB7185)' : 'linear-gradient(90deg, #38BDF8, #818CF8)',
              borderRadius: 99,
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      </div>

      {/* Outreach Activity Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#F8FAFC' }}>
              Recent Job Outreach
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.8rem', marginTop: 2 }}>
              Live record of sent cold emails and AI-classified recruiter replies
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
                {['Company', 'Job Title', 'Contact', 'Status', 'Reply Category', 'Sent Date', 'Suggested Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!emails || emails.length === 0) ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    No outreach records yet. Run your first pipeline workflow to get started!
                  </td>
                </tr>
              ) : (
                emails.map((e: any) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#F8FAFC' }}>{e.company || '—'}</td>
                    <td style={{ padding: '14px 16px', color: '#CBD5E1', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.job_title || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>
                      {e.contact_email || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge badge-${e.status || 'draft'}`}>
                        {e.status || 'draft'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {e.reply_category ? (
                        <span className={`badge badge-${e.reply_category.toLowerCase()}`}>
                          {e.reply_category}
                        </span>
                      ) : (
                        <span style={{ color: '#475569' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {e.sent_at ? new Date(e.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#38BDF8', fontSize: '0.8rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.suggested_action || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
