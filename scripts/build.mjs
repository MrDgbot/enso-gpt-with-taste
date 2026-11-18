// Render prompts/ from NB-Corp/gpt-with-taste's recipe/.
//   node scripts/build.mjs                 clone upstream master and build
//   node scripts/build.mjs <checkout>      build from a local checkout
//   --bump                                 bump the patch version when prompts change
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const UPSTREAM = 'https://github.com/NB-Corp/gpt-with-taste.git';
const MAX_TEXT_BYTES = 256 * 1024;
const root = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const bump = args.includes('--bump');
let src = args.find((a) => !a.startsWith('--'));
let cloned;
if (!src) {
  cloned = src = mkdtempSync(join(tmpdir(), 'gpt-with-taste-'));
  execFileSync('git', ['clone', '-q', '--depth', '1', UPSTREAM, src], {stdio: 'inherit'});
}

try {
  const recipe = join(src, 'recipe');
  const upstream = JSON.parse(readFileSync(join(recipe, 'manifest.json'), 'utf8'));
  const text = (key) => {
    const file = upstream.texts?.[key];
    if (!file) throw new Error(`upstream manifest has no texts.${key}`);
    const body = readFileSync(join(recipe, file), 'utf8').trim();
    if (!body) throw new Error(`upstream ${file} is empty`);
    return body;
  };
  const block = (tag, body) => `<${tag}>\n${body}\n</${tag}>`;
  const prompts = {
    'main.md': [block('gpt-with-taste', text('main')),
      block('gpt-with-taste-user-steer', text('userSteer')),
      block('gpt-with-taste-agent-steer', text('agentSteer'))],
    'sub.md': [block('gpt-with-taste', text('sub')), block('gpt-with-taste-sub-steer', text('subSteer'))],
    'independent.md': [block('gpt-with-taste', text('independent'))],
  };

  let changed = false;
  for (const [name, parts] of Object.entries(prompts)) {
    const path = join(root, 'prompts', name);
    const next = `${parts.join('\n\n')}\n`;
    if (Buffer.byteLength(next) > MAX_TEXT_BYTES) throw new Error(`${name} exceeds EnsoCode's 256 KB preset text limit`);
    let prev = '';
    try { prev = readFileSync(path, 'utf8'); } catch {}
    if (prev !== next) { writeFileSync(path, next); changed = true; }
  }

  if (!changed) {
    console.log('prompts unchanged');
  } else {
    const commit = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
    writeFileSync(join(root, 'PROVENANCE.md'),
      `Prompts rendered from NB-Corp/gpt-with-taste ${upstream.version} at commit ${commit} (MIT, see THIRD_PARTY_LICENSE).\n`);
    writeFileSync(join(root, 'THIRD_PARTY_LICENSE'), readFileSync(join(src, 'LICENSE')));
    const manifestPath = join(root, 'enso-plugin.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (bump) {
      const [major, minor, patch] = manifest.version.split('.').map(Number);
      manifest.version = `${major}.${minor}.${patch + 1}`;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
    console.log(`prompts updated from ${commit}; version ${manifest.version}`);
  }
} finally {
  if (cloned) rmSync(cloned, {recursive: true, force: true});
}
