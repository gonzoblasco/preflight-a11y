import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { scanPage, closeBrowser } from './src/lib/scan.js';

const html = await readFile('./test/fixtures/ai-generated.html', 'utf8');
const server = createServer((_q, r) => { r.writeHead(200, {'content-type':'text/html'}); r.end(html); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { port } = server.address();
const result = await scanPage(`http://127.0.0.1:${port}`);
server.close();

await writeFile('.knowledge/phase-0.2/prompt.md', result.fixPrompt.text, 'utf8');
await writeFile('.knowledge/phase-0.2/source.html', html, 'utf8');
await writeFile('.knowledge/phase-0.2/baseline.json', JSON.stringify({
  score: result.score,
  findings: result.findings.map((f) => ({ id: f.id, impact: f.impact, nodes: f.nodes.length })),
}, null, 2), 'utf8');

console.log(`baseline: ${result.score.value}/100 ${result.score.grade} · ${result.findings.length} findings · ${result.score.blocking} blocking`);
console.log(`prompt:   ${result.fixPrompt.text.length} chars, ${result.fixPrompt.steps.length} steps`);
console.log(result.findings.map((f) => `  - ${f.id} (${f.impact}) x${f.nodes.length}`).join('\n'));
await closeBrowser();
