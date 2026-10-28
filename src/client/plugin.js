/* dsh-ascii-sharks — client half.
 * Mounts the ascii-sharks canvas behind the whole Web UI and exposes the
 * tunables in Settings → ascii-sharks.
 * Engine: https://github.com/stackedlol/ascii-sharks (MIT).
 */

const { OceanEngine } = __req('./engine')

const STORAGE_KEY = 'dsh-ascii-sharks:settings'
const CANVAS_ID = 'dsh-ascii-sharks-canvas'
const STYLE_ATTR = 'dsh-ascii-sharks'

const KINDS = [
  ['classic', '經典'],
  ['hammerhead', '錘頭'],
  ['greathammer', '大錘頭'],
  ['tiger', '虎鯊'],
  ['mako', '尖吻鯖鯊'],
  ['thresher', '長尾鯊'],
  ['nurse', '護士鯊'],
  ['zebra', '斑竹鯊'],
]

const DEFAULTS = {
  enabled: true,
  brightness: 1.25,
  saturate: 1.15,
  sidebarAlpha: 0.86,
  centerScrim: 0.55,
  blur: 14,
  fps: 30,
  pointer: true,
  splash: true,
  kinds: ['mako', 'classic', 'hammerhead'],
  fishCount: 180,
  fishScale: 1,
  rippleScale: 0.7,
  sharkScale: 1,
  cardBlur: 24,
  cardTint: 0.18,
  thinkTide: 0.35,
  idleThrottle: true,
}

const listeners = new Set()
let settings = readSettings()
let engine = null
let canvas = null
let layer = null
let mounted = false
let kindsSignature = ''

/** The host paints dark mode as a body attribute; absence means light. */
function isDarkTheme() {
  return document.body.hasAttribute("data-ds-dark-theme")
}

function readSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return { ...DEFAULTS }
    return { ...DEFAULTS, ...parsed, kinds: Array.isArray(parsed.kinds) && parsed.kinds.length ? parsed.kinds : DEFAULTS.kinds }
  } catch {
    return { ...DEFAULTS }
  }
}

function saveSettings(next) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* private mode: keep the in-memory value */
  }
}

let sceneTimer = 0

function scheduleScene() {
  clearTimeout(sceneTimer)
  sceneTimer = setTimeout(() => {
    sceneTimer = 0
    syncScene()
  }, 280)
}

function setSettings(patch) {
  const prevFishCount = settings.fishCount
  settings = { ...settings, ...patch }
  saveSettings(settings)
  applyVars()
  if (settings.fishCount !== prevFishCount) scheduleScene()
  else syncScene()
  for (const fn of listeners) {
    try {
      fn(settings)
    } catch {
      /* a broken panel must not break the scene */
    }
  }
}

function resetSettings() {
  settings = { ...DEFAULTS }
  saveSettings(settings)
  applyVars()
  syncScene()
  for (const fn of listeners) {
    try {
      fn(settings)
    } catch {
      /* ignore */
    }
  }
}

let lastDark = null

/** Push the host theme into the renderer and the light CSS switch. */
function syncTheme() {
  const dark = isDarkTheme()
  if (dark !== lastDark) {
    lastDark = dark
    document.body.toggleAttribute("data-ass-light", !dark)
    if (engine) engine.setTheme(dark)
  }
}

function applyVars() {
  const root = document.documentElement
  root.style.setProperty('--ass-brightness', String(settings.brightness))
  root.style.setProperty('--ass-saturate', String(settings.saturate))
  root.style.setProperty('--ass-sidebar', String(settings.sidebarAlpha))
  root.style.setProperty('--ass-scrim', String(settings.centerScrim))
  root.style.setProperty('--ass-blur', `${settings.blur}px`)
  root.style.setProperty('--ass-card-blur', `${settings.cardBlur}px`)
  root.style.setProperty('--ass-card-tint', String(settings.cardTint))
}

function specs() {
  return settings.kinds.map((kind, i) => ({
    kind: KINDS.some(([k]) => k === kind) ? kind : 'classic',
    size: Math.max(0.5, 0.78 - i * 0.14),
  }))
}

function syncScene() {
  if (!mounted) return
  if (!settings.enabled) {
    stopScene()
    return
  }
  pushStoke()
  const signature = settings.kinds.join(',') + '|' + settings.fishCount
  if (engine && signature === kindsSignature) {
    engine.setFps(settings.fps)
    engine.setPointerEnabled(settings.pointer)
    engine.setFishScale(settings.fishScale)
    engine.setSharkScale(settings.sharkScale)
    engine.setIdleThrottle(settings.idleThrottle)
    engine.setRippleScale(settings.rippleScale)
    try {
      markSurfaces()
    } catch {
      /* ignore */
    }
    return
  }
  stopScene()
  startScene()
}

function startScene() {
  if (engine || !document.body) return
  try {
    layer = document.createElement('div')
    layer.id = 'dsh-ascii-sharks-layer'
    layer.setAttribute('aria-hidden', 'true')
    const sea = document.createElement('div')
    sea.className = 'ass-sea'
    canvas = document.createElement('canvas')
    canvas.id = CANVAS_ID
    canvas.style.fontFamily = 'var(--ds-font-family-code, ui-monospace, Menlo, monospace)'
    layer.append(sea, canvas)
    document.body.append(layer)
    kindsSignature = settings.kinds.join(',') + '|' + settings.fishCount
    engine = new OceanEngine(canvas, {
      sharks: specs(),
      fishCount: settings.fishCount > 0 ? settings.fishCount : undefined,
      fishScale: settings.fishScale,
      sharkScale: settings.sharkScale,
      idleThrottle: settings.idleThrottle,
      dark: lastDark !== false,
      rippleScale: settings.rippleScale,
      fps: settings.fps,
      pointer: settings.pointer,
      splash: settings.splash,
      transparent: true,
    })
  } catch (error) {
    console.warn('[dsh-ascii-sharks] canvas failed to start:', error)
    stopScene()
  }
}

function stopScene() {
  try {
    if (engine) engine.destroy()
  } catch {
    /* ignore */
  }
  engine = null
  canvas = null
  kindsSignature = ''
  if (layer && layer.parentNode) layer.parentNode.removeChild(layer)
  layer = null
}

const CSS = `
:root {
  --ass-brightness: 1.25;
  --ass-saturate: 1.15;
  --ass-sidebar: .86;
  --ass-scrim: .55;
  --ass-card-blur: 12px;
  --ass-card-tint: .30;
  --ass-blur: 14px;
}

html {
  /* paint the same water behind everything, so any unpainted strip at the
     window edge is sea rather than black. */
  background-color: #0a1728 !important;
  background-image: linear-gradient(180deg, #0a1626 0%, #0d2036 52%, #081326 80%, #03060c 100%) !important;
  background-attachment: fixed !important;
}
/* Borrowed from dsh-deep-whale: the skin paints the backdrop on BODY itself
   (with isolation: isolate) instead of relying on a z-index:-1 layer. Body
   covers the whole document box, so there is no edge for the page colour to
   leak through. */
body {
  background-color: #0a1728 !important;
  background-image: linear-gradient(180deg, #0a1626 0%, #0d2036 52%, #081326 80%, #03060c 100%) !important;
  background-attachment: fixed !important;
  isolation: isolate;
}
#root { background: transparent !important; }

#dsh-ascii-sharks-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100lvh;
  min-height: 100vh;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  filter: brightness(var(--ass-brightness)) saturate(var(--ass-saturate));
}
#dsh-ascii-sharks-layer .ass-sea {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(120% 72% at 50% -12%, rgba(44, 92, 148, .78), transparent 64%),
    radial-gradient(70% 50% at 84% 74%, rgba(22, 66, 112, .60), transparent 74%),
    /* The host paints an opaque strip along the bottom edge. Rather than
       fighting it, sink into it: the water gets deep right at the window
       edge, so there is no hard line where the two meet. */
    linear-gradient(180deg, #0a1626 0%, #0d2036 52%, #081326 80%, #03060c 100%);
}
#dsh-ascii-sharks-layer canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

body[data-${STYLE_ATTR}] div:has(> [data-shell-overlay]) {
  background: transparent !important;
}

body[data-${STYLE_ATTR}] div:has(> [data-slot='main']) {
  background: linear-gradient(180deg,
    rgba(6, 10, 18, var(--ass-scrim)) 0%,
    rgba(6, 10, 18, calc(var(--ass-scrim) * .45)) 45%,
    rgba(6, 10, 18, var(--ass-scrim)) 100%) !important;
}

body[data-${STYLE_ATTR}] div:has(> [data-slot='sidebar']) {
  /* the column paints nothing; the sidebar surface inside does */
  background: transparent !important;
  border-right: none !important;
}

body[data-${STYLE_ATTR}] [data-slot='sidebar'] > * {
  background: linear-gradient(180deg,
    rgba(7, 11, 18, var(--ass-sidebar)) 0%,
    rgba(7, 11, 18, calc(var(--ass-sidebar) * .68)) 42%,
    rgba(7, 11, 18, calc(var(--ass-sidebar) * .30)) 100%) !important;
  backdrop-filter: blur(var(--ass-blur)) saturate(115%);
  -webkit-backdrop-filter: blur(var(--ass-blur)) saturate(115%);
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, .07);
}

/* The conversation panel paints its own bg-base over the whole column, which is
   why the sea only showed on the Plugins page. Opening the panel root and the
   chat region is what lets the water through; cards keep their own fills. */
body[data-${STYLE_ATTR}] [data-slot='main'] > * {
  background-color: transparent !important;
}

/* The conversation root sits one level below the main slot and paints
   bg-base itself; data-phase is its stable hook. */
body[data-${STYLE_ATTR}] [data-phase] {
  /* no panel-wide glass any more: each message carries its own surface, so
     the sea stays sharp in the gaps between them. */
  background-color: transparent !important;
}

body[data-${STYLE_ATTR}] [data-conversation-region='chat'],
body[data-${STYLE_ATTR}] [data-conversation-content] {
  background-color: transparent !important;
}

body[data-${STYLE_ATTR}] [data-conversation-scroll],
body[data-${STYLE_ATTR}] [data-slot='conversation.session.header'],
body[data-${STYLE_ATTR}] [data-slot='conversation.session.header'] > * {
  background: transparent !important;
}


/* Assistant answers: frosted card with a raised edge. The attribute is
   added at runtime by markSurfaces(), because node kinds are host-owned. */
/* Liquid glass: one recipe, three surfaces (answer / user bubble / composer).
   The backdrop here is mostly a dark sea, so the tint, the rim light and the
   saturation lift do the visible work; blur alone reads as "nothing". */
body[data-${STYLE_ATTR}] [data-ass-glass],
body[data-${STYLE_ATTR}] [data-user-glass],
body[data-${STYLE_ATTR}] [data-composer-glass],
body[data-${STYLE_ATTR}] [data-surface-glass] {
  position: relative;
  border-radius: 18px;
  background-color: rgba(12, 18, 28, var(--ass-card-tint)) !important;
  background-image:
    linear-gradient(135deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.05) 26%, rgba(255,255,255,0) 52%),
    linear-gradient(0deg, rgba(255,255,255,.04), rgba(255,255,255,0) 30%) !important;
  backdrop-filter: blur(var(--ass-card-blur)) saturate(1.45) brightness(1.1);
  -webkit-backdrop-filter: blur(var(--ass-card-blur)) saturate(1.45) brightness(1.1);
  border: 1px solid rgba(255, 255, 255, .14) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .42),
    inset 0 -1px 0 rgba(0, 0, 0, .45),
    inset 0 -24px 40px rgba(0, 0, 0, .18),
    0 18px 44px rgba(0, 0, 0, .45);
}

/* The host names these with a hashed prefix but a stable suffix.
   .userRow / .userStack are layout only; .bubble carries the fill. */
body[data-${STYLE_ATTR}] [class*='_userRow'],
body[data-${STYLE_ATTR}] [class*='_userStack'] {
  background-color: transparent !important;
  background-image: none !important;
}

body[data-${STYLE_ATTR}] [class*='_bubble'] {
  border-radius: 18px;
  background-color: rgba(12, 18, 28, var(--ass-card-tint)) !important;
  background-image:
    linear-gradient(135deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.05) 26%, rgba(255,255,255,0) 52%),
    linear-gradient(0deg, rgba(255,255,255,.04), rgba(255,255,255,0) 30%) !important;
  backdrop-filter: blur(var(--ass-card-blur)) saturate(1.45) brightness(1.1);
  -webkit-backdrop-filter: blur(var(--ass-card-blur)) saturate(1.45) brightness(1.1);
  border: 1px solid rgba(255, 255, 255, .14) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .42),
    inset 0 -1px 0 rgba(0, 0, 0, .45),
    0 18px 44px rgba(0, 0, 0, .45);
}

/* The host fades the bottom of the transcript into its own bg-base. With a
   transparent frame that gradient reads as a black band, and it survives even
   with this plugin disabled. Drop the fade: the sea is the backdrop now. */
body[data-${STYLE_ATTR}] [class*='_fade'] {
  background-image: none !important;
  background-color: transparent !important;
}

body[data-${STYLE_ATTR}] [data-ass-clear] {
  background-color: transparent !important;
  background-image: none !important;
}

body[data-${STYLE_ATTR}] [data-user-plain] {
  /* the outer wrapper around a user bubble: keep the layout, drop the box */
  background-color: transparent !important;
  background-image: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

body[data-${STYLE_ATTR}] [data-user-bubble] {
  /* the host bubble had its own opaque fill; the glass replaces it */
  background-color: transparent !important;
  border-color: transparent !important;
  box-shadow: inherit;
}

body[data-${STYLE_ATTR}] [data-ass-glass] { padding: 14px 16px; }
body[data-${STYLE_ATTR}] [data-composer-glass] { padding: 12px 14px; }

/* ---- daylight: the host marks its dark theme with body[data-ds-dark-theme],
   so the inverse tells us to flip the water instead of the ink only. ---- */
body[data-${STYLE_ATTR}][data-ass-light] {
  background-color: #cfe6f7 !important;
  background-image: linear-gradient(180deg, #dbeeff 0%, #b6d9f2 58%, #8fc3e6 100%) !important;
}
body[data-${STYLE_ATTR}][data-ass-light] #dsh-ascii-sharks-layer .ass-sea {
  background-image:
    radial-gradient(120% 72% at 50% -12%, rgba(255, 255, 255, .55), transparent 62%),
    radial-gradient(70% 50% at 84% 74%, rgba(120, 180, 220, .34), transparent 74%),
    linear-gradient(180deg, #d6ebfd 0%, #b3d7f1 58%, #8ec2e6 100%) !important;
}
/* A 1.25x brightening filter is for night water; in daylight it erases the
   depth. Re-declare the vars on body so the layer inherits light values and
   the brightness slider still applies on top. */
body[data-${STYLE_ATTR}][data-ass-light] {
  --ass-brightness: .98;
  --ass-saturate: 1.04;
}
body[data-${STYLE_ATTR}][data-ass-light] div:has(> [data-slot="main"]) {
  background-image: linear-gradient(180deg,
    rgba(255, 255, 255, .42) 0%,
    rgba(255, 255, 255, .12) 40%,
    rgba(255, 255, 255, .34) 100%) !important;
}
body[data-${STYLE_ATTR}][data-ass-light] [data-ass-glass],
body[data-${STYLE_ATTR}][data-ass-light] [data-user-glass],
body[data-${STYLE_ATTR}][data-ass-light] [data-composer-glass] {
  background-color: rgba(255, 255, 255, .58) !important;
  border-color: rgba(255, 255, 255, .88) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .95),
    inset 0 -1px 0 rgba(120, 170, 205, .18),
    0 10px 28px rgba(40, 90, 130, .16) !important;
}
body[data-${STYLE_ATTR}][data-ass-light] [class*="_bubble"] {
  background-color: rgba(255, 255, 255, .72) !important;
  border-color: rgba(150, 190, 220, .35) !important;
}
body[data-${STYLE_ATTR}][data-ass-light] pre {
  background-color: rgba(247, 252, 255, .92) !important;
  border-color: rgba(60, 110, 150, .18) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .9), 0 6px 16px rgba(40, 90, 130, .10) !important;
}

/* ---- deeper water: the rest of the surfaces ---- */

/* 1. the trajectory turn rail, drawn as a depth scale */
body[data-${STYLE_ATTR}] [class*='_turnRail'] {
  width: 3px;
  border-radius: 999px;
  background-color: transparent !important;
  background-image:
    linear-gradient(180deg,
      rgba(214, 240, 255, .55) 0%,
      rgba(96, 176, 226, .30) 40%,
      rgba(6, 14, 26, .78) 100%),
    repeating-linear-gradient(180deg,
      rgba(222, 245, 255, .75) 0 2px,
      transparent 2px 18px);
  box-shadow: 0 0 10px rgba(120, 190, 235, .28);
}

/* 2. code blocks: deep water instead of flat black */
body[data-${STYLE_ATTR}] pre {
  background-color: rgba(6, 12, 22, .74) !important;
  border: 1px solid rgba(120, 190, 235, .18) !important;
  border-radius: 10px;
  box-shadow:
    inset 0 1px 0 rgba(180, 220, 250, .10),
    inset 0 -18px 30px rgba(0, 0, 0, .18),
    0 6px 18px rgba(0, 0, 0, .28);
}

/* 3. the reasoning summary line reads as a sonar label */
body[data-${STYLE_ATTR}] [class*='_summary'] {
  color: rgba(178, 214, 238, .88) !important;
  text-shadow: 0 0 12px rgba(120, 200, 245, .25);
}


/* 5. stats pills pick up the water colour instead of neutral grey */
body[data-${STYLE_ATTR}] [class*='_pill'],
body[data-${STYLE_ATTR}] [class*='_label'] {
  color: rgba(182, 216, 240, .80) !important;
}

/* 6. the accent, scoped to the plugin: every button/link/selection follows.
   Disable the plugin and the host palette comes back untouched. */
body[data-${STYLE_ATTR}] {
  --dsw-alias-brand-primary: #5fc8e8;
  --dsw-alias-state-business-primary: #5fc8e8;
  --dsw-alias-label-deep-diving: #8fd8f2;
}

/* ---- settings page ---- */
.ass-page { padding: 2px 0 28px; color: var(--dsw-alias-label-primary, #e8ecf4); }
.ass-title { margin: 0 0 3px; font-size: 16px; font-weight: 600; }
.ass-desc { margin: 0 0 18px; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-tertiary, #8b93a3); }
.ass-card {
  margin-bottom: 12px; padding: 6px 16px;
  background: var(--dsw-alias-bg-layer-2, rgba(255,255,255,.04));
  border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.09));
  border-radius: 12px;
}
.ass-row { display: flex; align-items: center; gap: 16px; padding: 9px 0; }
.ass-row + .ass-row { border-top: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.06)); }
.ass-label { flex: 1; font-size: 13px; }
.ass-hint { display: block; margin-top: 2px; font-size: 11px; color: var(--dsw-alias-label-tertiary, #8b93a3); }
.ass-val { min-width: 48px; text-align: right; font: 12px ui-monospace, Consolas, monospace; color: var(--dsw-alias-label-secondary, #9aa3b2); }
.ass-range { width: 190px; accent-color: var(--dsw-alias-brand-primary, #4d6bfe); }
.ass-check { width: 16px; height: 16px; accent-color: var(--dsw-alias-brand-primary, #4d6bfe); }
.ass-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0 10px; }
.ass-chip {
  padding: 4px 11px; border-radius: 999px; cursor: pointer; font-size: 12px;
  color: var(--dsw-alias-label-secondary, #9aa3b2);
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.14));
}
.ass-chip.on {
  color: var(--dsw-alias-brand-primary, #7b90ff);
  border-color: var(--dsw-alias-brand-primary, #4d6bfe);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4d6bfe) 14%, transparent);
}
.ass-foot { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.ass-btn {
  padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 12px;
  color: var(--dsw-alias-label-secondary, #9aa3b2);
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.14));
}
.ass-btn:hover { color: var(--dsw-alias-label-primary, #e8ecf4); }
.ass-state { font-size: 12px; color: var(--dsw-alias-label-tertiary, #8b93a3); }
`

function injectCss() {
  const tagId = 'dsh-ascii-sharks/panel.css'
  if (document.querySelector(`style[data-plugin-css="${tagId}"]`)) return
  const tag = document.createElement('style')
  tag.dataset.pluginCss = tagId
  tag.textContent = CSS
  document.head.append(tag)
}

/* ---------- assistant cards ---------- */

const GLASS_ATTR = 'data-ass-glass'

/**
 * Tag prose rows (assistant answers, not the user bubble, not the tool group)
 * with an attribute our CSS can style. Node kinds are host-owned strings, so
 * this decides from the live DOM instead of hard-coding one kind name.
 */
/**
 * Nearest rounded, filled ancestor of the message text. Attachment chips are
 * also rounded and filled, so anchoring on the text node avoids picking them.
 */
function findTextBubble(row) {
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
  let textNode = null
  let node = walker.nextNode()
  while (node) {
    if ((node.nodeValue || '').trim().length > 1) {
      textNode = node
      break
    }
    node = walker.nextNode()
  }
  let el = textNode ? textNode.parentElement : null
  for (let depth = 0; depth < 6 && el && el !== row && el !== row.parentElement; depth++, el = el.parentElement) {
    const cs = getComputedStyle(el)
    const radius = parseFloat(cs.borderTopLeftRadius) || 0
    if (radius >= 8 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') return el
  }
  return null
}
function opaque(el) {
  const bg = getComputedStyle(el).backgroundColor || ''
  const m = bg.match(/^rgba?\((\d+), \s*(\d+), \s*(\d+)(?:, \s*([\d.]+))?\)$/)
  if (!m) return false
  const alpha = m[4] === undefined ? 1 : Number(m[4])
  if (alpha < 0.95) return false
  const lum = (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3
  return lum < 90
}

/**
 * Tag the surfaces we want to turn into liquid glass. Everything is decided
 * from the live DOM: node kinds and class names are host-owned and change.
 */
function markSurfaces() {

  const rows = document.querySelectorAll('[data-chat-flow-kind]')
  for (const row of rows) {
    const kind = row.getAttribute('data-chat-flow-kind') || ''
    if (kind.startsWith('user')) continue
    if (!kind.startsWith('user') && row.querySelector('p, pre, h1, h2, h3, h4, blockquote, ul, ol') && !row.hasAttribute(GLASS_ATTR)) {
      row.setAttribute(GLASS_ATTR, '')
    }
    // tool / summary slabs inside the row keep their own opaque fill
    if (row.hasAttribute('data-glass-scanned')) continue
    row.setAttribute('data-glass-scanned', '')
    const slabs = row.querySelectorAll('div')
    let tagged = 0
    for (const el of slabs) {
      if (tagged >= 2) break
      if (el.hasAttribute('data-surface-glass')) continue
      const rect = el.getBoundingClientRect()
      if (rect.width < 180 || rect.height < 24) continue
      if (!opaque(el)) continue
      // Code blocks, tables and media keep their own surface: glassing them
      // makes the text sit on moving water.
      if (el.querySelector('pre, code, table, img, video, canvas, svg')) continue
      if (el.matches("pre, code, table")) continue
      el.setAttribute('data-surface-glass', '')
      tagged++
    }
  }

  // The stats pills at the very bottom sit on a host-painted strip. Tag the
  // row and its ancestors so CSS can punch that surface out.
  const stats = document.querySelector("[class*='_anchor']")
  if (stats) {
    let node = stats
    for (let i = 0; i < 4 && node && node !== document.body; i++, node = node.parentElement) {
      if (getComputedStyle(node).backgroundColor !== 'rgba(0, 0, 0, 0)') node.setAttribute('data-ass-clear', '')
    }
  }

  // composer: walk up from the actual editable until the rounded card shows up
  const input = document.querySelector("[data-phase] textarea, [data-phase] [contenteditable='true']")
  if (input) {
    let el = input
    for (let depth = 0; depth < 7 && el && el !== document.body; depth++, el = el.parentElement) {
      const cs = getComputedStyle(el)
      const radius = parseFloat(cs.borderTopLeftRadius) || 0
      if (radius >= 10 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        if (!el.hasAttribute('data-composer-glass')) el.setAttribute('data-composer-glass', '')
        break
      }
    }
  }
}

/**
 * How hard is the conversation working right now? 1 = a reasoning row is
 * streaming, 0.55 = the turn is running (tools etc.), 0 = idle.
 * Reads presence only, never the reasoning text.
 */
function readStoke() {
  if (document.querySelector('[data-streaming]')) return 1
  if (document.querySelector("[class*='_running']")) return 0.55
  return 0
}

function pushStoke() {
  if (!engine) return
  try {
    engine.setStoke(readStoke() * settings.thinkTide)
  } catch {
    /* ignore */
  }
}

function watchSurfaces() {
  let timer = 0
  const observer = new MutationObserver(() => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      try {
        markSurfaces()
        pushStoke()
      syncTheme()
      } catch {
        /* never let decoration break the page */
      }
    }, 180)
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-streaming'],
  })
  timer = setTimeout(markSurfaces, 300)
  // A cheap heartbeat: two querySelector calls, and it guarantees the tide
  // falls back even if a host update changes the DOM in a way we do not watch.
  const heartbeat = setInterval(() => {
    try {
      pushStoke()
    } catch {
      /* ignore */
    }
  }, 1500)
  return () => {
    clearTimeout(timer)
    clearInterval(heartbeat)
    observer.disconnect()
    document.querySelectorAll(`[${GLASS_ATTR}]`).forEach((node) => node.removeAttribute(GLASS_ATTR))
document.querySelectorAll('[data-user-glass]').forEach((node) => node.removeAttribute('data-user-glass'))
document.querySelectorAll('[data-user-bubble]').forEach((node) => node.removeAttribute('data-user-bubble'))
document.querySelectorAll('[data-user-plain]').forEach((node) => node.removeAttribute('data-user-plain'))
document.querySelectorAll('[data-ass-clear]').forEach((node) => node.removeAttribute('data-ass-clear'))
document.querySelectorAll('[data-composer-glass]').forEach((node) => node.removeAttribute('data-composer-glass'))
document.querySelectorAll('[data-surface-glass]').forEach((node) => node.removeAttribute('data-surface-glass'))
document.querySelectorAll('[data-glass-scanned]').forEach((node) => node.removeAttribute('data-glass-scanned'))
  }
}


/* ---------- settings page ---------- */

const ROWS = [
  ['brightness', '海面亮度', 0.35, 1.45, 0.05, '太亮會蓋掉文字，太暗看不到海'],
  ['saturate', '色彩飽和', 0.5, 1.5, 0.05, '1 以下偏灰藍，1 以上偏青'],
  ['sidebarAlpha', '左欄不透明度', 0.08, 0.96, 0.02, '越低越透，底部固定比頂部透'],
  ['centerScrim', '文字區濃度', 0, 0.85, 0.05, '聊天區底下那層暗暈；調高最好讀'],
  ['blur', '左欄模糊', 0, 24, 1, '0 = 關閉，最省 GPU'],
  ['fishScale', '魚的體型', 0.5, 2, 0.05, '只影響魚，鯊魚不變'],
  ['fishCount', '魚群數量', 0, 420, 20, '0 = 自動（依視窗大小）'],
  ['sharkScale', '鯊魚體型', 0.4, 1.6, 0.05, '以吻端為基準伸縮，不影響魚'],
  ['cardBlur', '對話氣泡模糊', 0, 24, 1, '我的回覆那塊毛玻璃；0 = 關'],
  ['cardTint', '對話氣泡底色', 0, 0.7, 0.02, '越高越像實心卡片'],
  ['thinkTide', '思考聯動', 0, 1, 0.05, '我在想的時候海面起浪；0 = 關掉'],
  ['rippleScale', '漣漪大小', 0.2, 2, 0.05, '點水面時漣漪散得多遠；調小比較清爽'],
]

function Panel() {
  const [state, setLocal] = React.useState(settings)

  React.useEffect(() => {
    const fn = (next) => setLocal(next)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  const update = (patch) => setSettings(patch)

  const slider = ([key, label, min, max, step, hint]) =>
    React.createElement(
      'div',
      { className: 'ass-row', key },
      React.createElement(
        'div',
        { className: 'ass-label' },
        label,
        React.createElement('span', { className: 'ass-hint' }, hint),
      ),
      React.createElement('input', {
        className: 'ass-range',
        type: 'range',
        min,
        max,
        step,
        value: state[key],
        onChange: (event) => update({ [key]: Number(event.target.value) }),
      }),
      React.createElement('span', { className: 'ass-val' }, String(state[key])),
    )

  const toggle = (key, label, hint) =>
    React.createElement(
      'div',
      { className: 'ass-row', key },
      React.createElement(
        'div',
        { className: 'ass-label' },
        label,
        React.createElement('span', { className: 'ass-hint' }, hint),
      ),
      React.createElement('input', {
        className: 'ass-check',
        type: 'checkbox',
        checked: Boolean(state[key]),
        onChange: (event) => update({ [key]: event.target.checked }),
      }),
    )

  const chips = KINDS.map(([kind, label]) => {
    const on = state.kinds.includes(kind)
    return React.createElement(
      'button',
      {
        key: kind,
        type: 'button',
        className: on ? 'ass-chip on' : 'ass-chip',
        onClick: () => {
          const next = on ? state.kinds.filter((k) => k !== kind) : [...state.kinds, kind]
          update({ kinds: next.length ? next : [kind] })
        },
      },
      label,
    )
  })

  return React.createElement(
    'div',
    { className: 'ass-page' },
    React.createElement('h2', { className: 'ass-title' }, 'ascii-sharks'),
    React.createElement(
      'p',
      { className: 'ass-desc' },
      '把 ascii-sharks 的 ASCII 海洋放到介面後面。設定即時生效，存在這個瀏覽器的 localStorage；關掉外掛會完整還原畫面。',
    ),
    React.createElement('div', { className: 'ass-card' }, toggle('enabled', '啟用背景', '關掉就完全移除 canvas 與樣式')),
    React.createElement('div', { className: 'ass-card' }, ROWS.map(slider)),
    React.createElement(
      'div',
      { className: 'ass-card' },
      React.createElement('div', { className: 'ass-row' }, React.createElement('div', { className: 'ass-label' }, '鯊魚種類',
        React.createElement('span', { className: 'ass-hint' }, '可多選；第一個體型最大，之後遞減'))),
      React.createElement('div', { className: 'ass-chips' }, chips),
    ),
    React.createElement(
      'div',
      { className: 'ass-card' },
      toggle('idleThrottle', '閒置降頻', '停下來 4 秒後降到 12fps；覺得動畫變頓就關掉'),
      toggle('pointer', '滑鼠驚嚇魚群', '指標靠近時魚會散開'),
      toggle('splash', '點擊濺水', '在畫面上點一下會有漣漪'),
    ),
    React.createElement(
      'div',
      { className: 'ass-card' },
      React.createElement(
        'div',
        { className: 'ass-row' },
        React.createElement('div', { className: 'ass-label' }, '更新率',
          React.createElement('span', { className: 'ass-hint' }, '背景用 30fps 通常看不出差別')),
        React.createElement(
          'select',
          {
            className: 'ass-btn',
            value: String(state.fps),
            onChange: (event) => update({ fps: Number(event.target.value) }),
          },
          [15, 30, 60].map((fps) => React.createElement('option', { key: fps, value: String(fps) }, `${fps} fps`)),
        ),
      ),
    ),
    React.createElement(
      'div',
      { className: 'ass-foot' },
      React.createElement('button', { type: 'button', className: 'ass-btn', onClick: resetSettings }, '回復預設'),
      React.createElement('span', { className: 'ass-state' }, state.enabled ? '背景執行中' : '背景已停用'),
    ),
  )
}

/* ---------- plugin ---------- */

function apply(ctx) {
  ctx.effect(() => {
    injectCss()
    applyVars()
    document.body.setAttribute(`data-${STYLE_ATTR}`, '')
    syncTheme()
    mounted = true
    if (settings.enabled) startScene()
    const disposeAnswers = watchSurfaces()


    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY) return
      settings = readSettings()
      applyVars()
      syncScene()
      for (const fn of listeners) fn(settings)
    }
    window.addEventListener('storage', onStorage)

    // DSH may replace the whole frame when a session starts; make sure the
    // canvas is still ours and still behind the content.
    return () => {
      window.removeEventListener('storage', onStorage)
      disposeAnswers()
      mounted = false
      stopScene()
      document.body.removeAttribute(`data-${STYLE_ATTR}`)
      document.querySelectorAll(`style[data-plugin-css="dsh-ascii-sharks/panel.css"]`).forEach((n) => n.remove())
      const root = document.documentElement
      for (const name of ['--ass-brightness', '--ass-saturate', '--ass-sidebar', '--ass-scrim', '--ass-blur', '--ass-card-blur', '--ass-card-tint']) {
        root.style.removeProperty(name)
      }
      listeners.clear()
    }
  }, 'dsh-ascii-sharks: ocean canvas + glass css')

  if (ctx.slots && typeof ctx.slots.inject === 'function') {
    ctx.slots.inject('settings.section', () =>
      ctx.slots.register(
        { name: 'settings.section', id: 'ascii-sharks', order: 40, label: 'ascii-sharks' },
        Panel,
      ),
    )
  }

  // Debug handle: window.__dshAsciiSharks.set({ brightness: 1.2 })
  window.__dshAsciiSharks = {
    engine: () => engine,
    get: () => ({ ...settings }),
    set: (patch) => setSettings(patch),
    reset: resetSettings,
  }
}

return { inject: ['slots'], apply }
