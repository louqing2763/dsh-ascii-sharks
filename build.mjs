import fs from 'node:fs'
import path from 'node:path'
import { stripTypeScriptTypes } from 'node:module'

const ROOT = path.resolve('.')
const SRC = path.join(ROOT, 'src')
const OUT = path.join(ROOT, 'lib', 'client.js')
const MODULES = ['math', 'species', 'world', 'renderer', 'engine']

function transform(code, file) {
  const exported = []
  let out = stripTypeScriptTypes(code, { mode: 'transform' })

  // import { a, b } from "./x";   (default imports are not used upstream)
  out = out.replace(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?/g, (_m, names, id) => {
    const list = names
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .filter((n) => !n.startsWith('type '))
      .join(', ')
    return `const { ${list} } = __req(${JSON.stringify(id)});`
  })

  // export class/function/const/let
  out = out.replace(/export\s+(class|function|async\s+function|const|let|var)\s+([A-Za-z0-9_$]+)/g, (_m, kw, name) => {
    exported.push(name)
    return `${kw} ${name}`
  })

  const leftovers = out.split('\n').filter((line) => /^\s*(import|export)\b/.test(line))
  if (leftovers.length) {
    throw new Error(`${file}: unhandled module syntax:\n${leftovers.join('\n')}`)
  }
  return { code: out, exported }
}

function buildModule(name) {
  const file = path.join(SRC, `${name}.ts`)
  const { code, exported } = transform(fs.readFileSync(file, 'utf8'), file)
  const exportMap = `module.exports = { ${exported.join(', ')} };`
  return `__defs["./${name}"] = function (module, exports, __req) {\n${code}\n${exportMap}\n};`
}

const pluginBody = fs.readFileSync(path.join(SRC, 'client', 'plugin.js'), 'utf8')

const bundle = `/* dsh-ascii-sharks ${new Date().toISOString()} — built from src/ (ascii-sharks by stackedlol, MIT) */
window.__ModuleLoader__.load({
  id: 'dsh-ascii-sharks',
  factory(require) {
    "use strict";
    var React = require('react');
    var __defs = Object.create(null);
    var __cache = Object.create(null);
    function __req(id) {
      if (id.charAt(0) !== '.') return require(id);
      var hit = __cache[id];
      if (hit) return hit.exports;
      var def = __defs[id];
      if (!def) throw new Error('dsh-ascii-sharks: missing module ' + id);
      var mod = { exports: {} };
      __cache[id] = mod;
      def(mod, mod.exports, __req);
      return mod.exports;
    }
${MODULES.map(buildModule).join('\n')}
${pluginBody}
  },
});
`

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, bundle)
console.log('wrote', OUT, (bundle.length / 1024).toFixed(1) + ' KB')
