// Generates market.json for this plugin, pinned to the current main commit.
//
//   node tools/market.mjs
//
// The market index requires a full 40-hex commit for git sources, so this has to
// run *after* the release commit is pushed. If the repo is not reachable yet it
// still writes the file with a placeholder and tells you to re-run.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

const REPO = 'louqing2763/dsh-ascii-sharks'
const REPO_URL = `https://github.com/${REPO}`
const BRANCH = 'main'

async function headCommit() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${BRANCH}`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'dsh-ascii-sharks' },
    })
    if (!res.ok) return null
    const json = await res.json()
    return typeof json.sha === 'string' && /^[0-9a-f]{40}$/.test(json.sha) ? json.sha : null
  } catch {
    return null
  }
}

const sha = await headCommit()
if (sha === null) {
  console.warn('[market] could not read the commit from GitHub — writing a placeholder.')
  console.warn('[market] push the repo, then run this again before pointing the market at it.')
}

const market = {
  format: 1,
  title: { en: 'dsh-ascii-sharks', zh: 'ASCII 海洋' },
  description: {
    en: 'An ASCII ocean behind the DeepSeek Harness UI: rasterised fish and sharks, a tide that follows the conversation, liquid-glass message surfaces.',
    zh: '放在 DeepSeek Harness 介面後面的 ASCII 海洋：逐格光柵化的魚群與鯊魚、隨對話起伏的潮汐、液態玻璃的訊息表面。',
  },
  metadata: {
    categories: {
      ui: { title: { en: 'Interface', zh: '介面' } },
    },
  },
  plugins: [
    {
      name: pkg.name,
      title: { en: 'ASCII Sharks', zh: 'ASCII 海洋' },
      description: {
        en: 'An ASCII ocean behind the UI, with sharks that hunt while the agent is thinking and frosted-glass message surfaces.',
        zh: '介面後面的 ASCII 海洋；思考時鯊魚追獵魚群，訊息表面是一塊塊毛玻璃。',
      },
      icon: './icon.svg',
      author: 'louqing2763',
      homepage: pkg.homepage,
      repository: { url: REPO_URL },
      metadata: {
        category: 'ui',
        keywords: ['ascii', 'background', 'ocean', 'canvas', 'glass', 'ambient'],
      },
      versions: [
        {
          version: pkg.version,
          publishTimestamp: Math.floor(Date.now() / 1000),
          source: {
            type: 'git',
            url: REPO_URL,
            commit: sha ?? '0000000000000000000000000000000000000000',
          },
          engines: { dsh: '>=0.2.0' },
        },
      ],
    },
  ],
}

const out = path.join(root, 'market.json')
fs.writeFileSync(out, JSON.stringify(market, null, 2) + '\n')
console.log('[market] wrote', out, 'commit =', market.plugins[0].versions[0].source.commit)
