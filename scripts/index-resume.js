// RecruitIQ — Resume Chunk Embedder. Run once, and re-run whenever you update your resume.
// Usage: node scripts/index-resume.js
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { geminiEmbed } from './lib/gemini.js';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Loading resume chunks from Supabase...');
  const { data: chunks, error } = await supabase
    .from('resume_chunks')
    .select('id, content, chunk_type')
    .is('embedding', null);
  if (error) { console.error('Supabase error:', error); return; }

  console.log(`Found ${chunks.length} chunks to embed.`);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[${i + 1}/${chunks.length}] Embedding: ${chunk.chunk_type}...`);
    try {
      const vector = await geminiEmbed(chunk.content);
      const vectorStr = `[${vector.join(',')}]`;
      const { error: upErr } = await supabase.from('resume_chunks').update({ embedding: vectorStr }).eq('id', chunk.id);
      if (upErr) console.error('  Update error:', upErr);
      else console.log(`  Embedded (${vector.length} dims)`);
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
    await sleep(1500); // stay under Gemini's free-tier rate limit
  }
  console.log('\nAll chunks embedded. RAG is ready.');
}

main();
