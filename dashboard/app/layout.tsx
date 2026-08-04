import './globals.css';

export const metadata = {
  title: 'RecruitIQ — Autonomous AI Job Outreach Engine',
  description: 'Real-time dashboard for AI job discovery, scoring, outreach analytics, and recruiter reply tracking.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
