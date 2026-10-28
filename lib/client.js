/* dsh-ascii-sharks 2026-10-28T00:38:43.929Z — built from src/ (ascii-sharks by stackedlol, MIT) */
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
__defs["./math"] = function (module, exports, __req) {
const TAU = Math.PI * 2;
const clamp = (v, lo, hi)=>v < lo ? lo : v > hi ? hi : v;
const rand = (lo, hi)=>lo + Math.random() * (hi - lo);
const randInt = (lo, hi)=>Math.floor(rand(lo, hi + 1));
function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
}
function angleDiff(a, b) {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
}
function hash3(x, y, z) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}
const K1 = 1 / 260;
const K2 = 1 / 310;
const K3 = 1 / 190;
const CURRENT_SCALE = 3400;
function current(x, y, t, out) {
    const a = x * K1 + t * 0.07;
    const b = y * K2 - t * 0.05;
    const c = (x + y) * K3 + t * 0.11;
    out.x = (-K2 * Math.sin(a) * Math.sin(b) + 0.5 * K3 * Math.cos(c)) * CURRENT_SCALE;
    out.y = (-K1 * Math.cos(a) * Math.cos(b) - 0.5 * K3 * Math.cos(c)) * CURRENT_SCALE;
    return out;
}

module.exports = { TAU, clamp, rand, randInt, smoothstep, angleDiff, hash3, current };
};
__defs["./species"] = function (module, exports, __req) {
const SPECIES = [
    {
        name: "sardine",
        cruise: 36,
        maxSpeed: 64,
        minSpeed: 18,
        weight: 3,
        schoolSize: [
            18,
            28
        ],
        spacing: [
            1.8,
            1.1
        ],
        align: 1.6,
        cohesion: 1.6,
        jitter: 40,
        mill: 70,
        verticalDrag: 0.5
    },
    {
        name: "anchovy",
        cruise: 46,
        maxSpeed: 78,
        minSpeed: 22,
        weight: 3,
        schoolSize: [
            20,
            32
        ],
        spacing: [
            1.5,
            1
        ],
        align: 3.2,
        cohesion: 0.45,
        jitter: 30,
        mill: 0,
        verticalDrag: 1.4
    },
    {
        name: "silverside",
        cruise: 40,
        maxSpeed: 70,
        minSpeed: 20,
        weight: 3,
        schoolSize: [
            12,
            20
        ],
        spacing: [
            2,
            1.1
        ],
        align: 2.4,
        cohesion: 1.1,
        jitter: 35,
        mill: 0,
        verticalDrag: 1.6
    },
    {
        name: "mackerel",
        cruise: 32,
        maxSpeed: 60,
        minSpeed: 16,
        weight: 2,
        schoolSize: [
            5,
            9
        ],
        spacing: [
            2.6,
            1.3
        ],
        align: 2,
        cohesion: 0.9,
        jitter: 25,
        mill: 0,
        verticalDrag: 2
    },
    {
        name: "goby",
        cruise: 26,
        maxSpeed: 56,
        minSpeed: 10,
        weight: 1,
        schoolSize: [
            8,
            12
        ],
        spacing: [
            1.4,
            1.1
        ],
        align: 0.35,
        cohesion: 1.4,
        jitter: 110,
        mill: 0,
        verticalDrag: 0.3
    }
];
const TOTAL_WEIGHT = SPECIES.reduce((sum, s)=>sum + s.weight, 0);
function pickSpecies() {
    let r = Math.random() * TOTAL_WEIGHT;
    for(let i = 0; i < SPECIES.length; i++){
        r -= SPECIES[i].weight;
        if (r <= 0) return i;
    }
    return 0;
}

module.exports = { SPECIES, pickSpecies };
};
__defs["./world"] = function (module, exports, __req) {
const { angleDiff, clamp, current, rand, randInt, TAU } = __req("./math");
const { pickSpecies, SPECIES } = __req("./species");
const SHARK_NODES = 20;
const DEFAULT_SHARKS = [
    {
        kind: "classic",
        size: 1
    },
    {
        kind: "classic",
        size: 0.7
    },
    {
        kind: "classic",
        size: 0.84
    },
    {
        kind: "classic",
        size: 0.77
    }
];
const FISH_SEPARATION_K = 420;
const FISH_ALIGN_K = 1.4;
const FISH_COHESION_K = 1;
const FISH_FLEE_K = 1100;
const BLIND_COS = -0.6;
class World {
    sharkSpecs;
    fishCount;
    width = 0;
    height = 0;
    time = 0;
    fish = [];
    sharks = [];
    events = [];
    pointer = {
        x: 0,
        y: 0,
        active: false
    };
    perception = 60;
    sepX = [];
    sepY = [];
    foreignSep = 40;
    bucketCols = 0;
    bucketRows = 0;
    bucketHead = new Int32Array(0);
    bucketCount = new Uint16Array(0);
    bucketNext = new Int32Array(0);
    lastSpawn = 0;
    arousal = 0;
    tmp = {
        x: 0,
        y: 0
    };
    constructor(sharkSpecs = DEFAULT_SHARKS, fishCount){
        this.sharkSpecs = sharkSpecs;
        this.fishCount = fishCount;
    }
    setArousal(value) {
        this.arousal = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    }
    scaleSharks(ratio) {
        if (!Number.isFinite(ratio) || ratio <= 0 || ratio === 1) return;
        for (const shark of this.sharks){
            shark.length *= ratio;
            const nodes = shark.nodes;
            const hx = nodes[0];
            const hy = nodes[1];
            for(let i = 0; i < nodes.length; i += 2){
                nodes[i] = hx + (nodes[i] - hx) * ratio;
                nodes[i + 1] = hy + (nodes[i + 1] - hy) * ratio;
            }
        }
    }
    resize(width, height, cellW, cellH) {
        const first = this.width === 0;
        this.width = width;
        this.height = height;
        this.sepX = SPECIES.map((sp)=>sp.spacing[0] * cellW);
        this.sepY = SPECIES.map((sp)=>sp.spacing[1] * cellH);
        this.perception = Math.max(cellH * 3, cellW * 5.5);
        this.foreignSep = cellW * 3;
        if (first || this.fish.length === 0) {
            this.seed();
            return;
        }
        for (const f of this.fish){
            f.x = clamp(f.x, 0, width);
            f.y = clamp(f.y, 0, height);
        }
    }
    seed() {
        const { width: W, height: H } = this;
        const minSide = Math.min(W, H);
        const baseLength = clamp(minSide * 0.44, 170, 430);
        const sharkCount = this.sharkSpecs.length;
        this.sharks = [];
        for(let i = 0; i < sharkCount; i++){
            const { kind, size } = this.sharkSpecs[i];
            const length = baseLength * size;
            const orbitRadius = minSide * rand(0.28, 0.4);
            const a = i / sharkCount * TAU + rand(-0.4, 0.4);
            const orbitDir = i % 2 === 0 ? 1 : -1;
            const x = W / 2 + Math.cos(a) * orbitRadius * (W / minSide) * 0.9;
            const y = H / 2 + Math.sin(a) * orbitRadius;
            const heading = a + orbitDir * Math.PI / 2;
            const nodes = new Float32Array(SHARK_NODES * 2);
            const seg = length / (SHARK_NODES - 1);
            for(let n = 0; n < SHARK_NODES; n++){
                nodes[n * 2] = x - Math.cos(heading) * seg * n;
                nodes[n * 2 + 1] = y - Math.sin(heading) * seg * n;
            }
            this.sharks.push({
                id: i + 1,
                kind,
                length,
                nodes,
                heading,
                speed: 30,
                phase: rand(0, TAU),
                turn: 0,
                hunger: rand(0.25, 0.75),
                wander: 0,
                orbitDir,
                orbitRadius,
                target: null,
                retargetAt: 0,
                depth: size
            });
        }
        this.sharks.sort((a, b)=>a.length - b.length);
        const total = this.fishCount ?? clamp(Math.round(W * H / 4400), 85, 340);
        this.fish = [];
        while(this.fish.length < total){
            const species = pickSpecies();
            const sp = SPECIES[species];
            const size = Math.min(randInt(sp.schoolSize[0], sp.schoolSize[1]), total - this.fish.length);
            const millDir = Math.random() < 0.5 ? 1 : -1;
            const cx = rand(W * 0.06, W * 0.94);
            const cy = rand(H * 0.08, H * 0.92);
            const dir = (Math.random() < 0.5 ? 0 : Math.PI) + rand(-0.5, 0.5);
            for(let k = 0; k < size; k++){
                this.fish.push({
                    x: cx + rand(-1, 1) * this.sepX[species] * Math.sqrt(size),
                    y: cy + rand(-1, 1) * this.sepY[species] * Math.sqrt(size) * 0.6,
                    vx: Math.cos(dir) * sp.cruise,
                    vy: Math.sin(dir) * sp.cruise,
                    species,
                    alarm: 0,
                    alive: true,
                    respawnAt: 0,
                    phase: rand(0, TAU),
                    turn: 0,
                    depth: rand(0.55, 1),
                    millDir
                });
            }
        }
        this.bucketNext = new Int32Array(this.fish.length);
    }
    splash(x, y) {
        this.events.push({
            kind: "splash",
            x,
            y
        });
        const r = 240;
        for (const f of this.fish){
            if (!f.alive) continue;
            const dx = f.x - x;
            const dy = f.y - y;
            const d = Math.hypot(dx, dy);
            if (d > r || d < 1e-3) continue;
            const k = (1 - d / r) * 260;
            f.vx += dx / d * k;
            f.vy += dy / d * k;
            f.alarm = 1;
        }
    }
    step(dt) {
        this.time += dt;
        this.rebuildHash();
        this.stepFish(dt);
        this.stepSharks(dt);
        this.respawn();
    }
    rebuildHash() {
        const size = this.perception;
        const pad = 2;
        this.bucketCols = Math.ceil(this.width / size) + pad * 2;
        this.bucketRows = Math.ceil(this.height / size) + pad * 2;
        const n = this.bucketCols * this.bucketRows;
        if (this.bucketHead.length !== n) {
            this.bucketHead = new Int32Array(n);
            this.bucketCount = new Uint16Array(n);
        }
        this.bucketHead.fill(-1);
        this.bucketCount.fill(0);
        if (this.bucketNext.length !== this.fish.length) {
            this.bucketNext = new Int32Array(this.fish.length);
        }
        for(let i = 0; i < this.fish.length; i++){
            const f = this.fish[i];
            if (!f.alive) continue;
            const b = this.bucketOf(f.x, f.y);
            this.bucketNext[i] = this.bucketHead[b];
            this.bucketHead[b] = i;
            this.bucketCount[b]++;
        }
    }
    bucketOf(x, y) {
        const size = this.perception;
        const c = clamp(Math.floor(x / size) + 2, 0, this.bucketCols - 1);
        const r = clamp(Math.floor(y / size) + 2, 0, this.bucketRows - 1);
        return r * this.bucketCols + c;
    }
    stepFish(dt) {
        const { fish, sharks, pointer, width: W, height: H, time } = this;
        const R = this.perception;
        const R2 = R * R;
        const foreignSep = this.foreignSep;
        const size = this.perception;
        const cols = this.bucketCols;
        const rows = this.bucketRows;
        const head = this.bucketHead;
        const next = this.bucketNext;
        const cur = this.tmp;
        const calmDecay = Math.exp(-dt * 0.7);
        const contagion = Math.min(1, dt * 6);
        for(let i = 0; i < fish.length; i++){
            const f = fish[i];
            if (!f.alive) continue;
            const sp = SPECIES[f.species];
            const spread = 1 + 1.8 * f.alarm;
            const sepX = this.sepX[f.species] * spread;
            const sepY = this.sepY[f.species] * spread;
            const speed = Math.hypot(f.vx, f.vy) || 1;
            const hx = f.vx / speed;
            const hy = f.vy / speed;
            let ax = 0;
            let ay = 0;
            let sx = 0;
            let sy = 0;
            let avx = 0;
            let avy = 0;
            let cx = 0;
            let cy = 0;
            let n = 0;
            let neighbourAlarm = 0;
            const bc = clamp(Math.floor(f.x / size) + 2, 0, cols - 1);
            const br = clamp(Math.floor(f.y / size) + 2, 0, rows - 1);
            for(let r = Math.max(0, br - 1); r <= Math.min(rows - 1, br + 1); r++){
                for(let c = Math.max(0, bc - 1); c <= Math.min(cols - 1, bc + 1); c++){
                    let j = head[r * cols + c];
                    while(j !== -1){
                        if (j !== i) {
                            const o = fish[j];
                            const dx = o.x - f.x;
                            const dy = o.y - f.y;
                            const d2 = dx * dx + dy * dy;
                            if (d2 < R2 && d2 > 1e-6) {
                                const d = Math.sqrt(d2);
                                if ((dx * hx + dy * hy) / d > BLIND_COS) {
                                    const qx = dx / sepX;
                                    const qy = dy / sepY;
                                    const q2 = qx * qx + qy * qy;
                                    if (q2 < 1) {
                                        const q = Math.sqrt(q2) || 1e-3;
                                        const k = (1 - q) / q;
                                        sx -= qx * k;
                                        sy -= qy * k;
                                    }
                                    if (o.species === f.species) {
                                        avx += o.vx;
                                        avy += o.vy;
                                        cx += dx;
                                        cy += dy;
                                        n++;
                                    } else if (d < foreignSep) {
                                        const k = (1 - d / foreignSep) / d * 0.6;
                                        sx -= dx * k;
                                        sy -= dy * k;
                                    }
                                    if (o.alarm > neighbourAlarm) neighbourAlarm = o.alarm;
                                }
                            }
                        }
                        j = next[j];
                    }
                }
            }
            ax += sx * FISH_SEPARATION_K;
            ay += sy * FISH_SEPARATION_K;
            if (n > 0) {
                const alignK = FISH_ALIGN_K * sp.align;
                const cohesionK = FISH_COHESION_K * sp.cohesion * (1 - 0.8 * f.alarm);
                ax += (avx / n - f.vx) * alignK + cx / n * cohesionK;
                ay += (avy / n - f.vy) * alignK + cy / n * cohesionK;
                if (sp.mill > 0) {
                    const cl = Math.hypot(cx, cy) || 1;
                    ax += -cy / cl * f.millDir * sp.mill * (1 - f.alarm);
                    ay += cx / cl * f.millDir * sp.mill * (1 - f.alarm);
                }
            }
            let fear = 0;
            for (const sh of sharks){
                const fearR = sh.length * 0.6 + 60;
                let best = Infinity;
                let bx = 0;
                let by = 0;
                for(let k = 0; k <= 12; k += 3){
                    const nx = sh.nodes[k * 2];
                    const ny = sh.nodes[k * 2 + 1];
                    const d2 = (f.x - nx) ** 2 + (f.y - ny) ** 2;
                    if (d2 < best) {
                        best = d2;
                        bx = nx;
                        by = ny;
                    }
                }
                const d = Math.sqrt(best);
                if (d >= fearR || d < 1e-3) continue;
                let w = 1 - d / fearR;
                w *= w;
                const awayX = (f.x - bx) / d;
                const awayY = (f.y - by) / d;
                const shx = Math.cos(sh.heading);
                const shy = Math.sin(sh.heading);
                const side = shx * (f.y - sh.nodes[1]) - shy * (f.x - sh.nodes[0]) >= 0 ? 1 : -1;
                ax += (awayX * 0.7 - shy * side * 0.9) * FISH_FLEE_K * w;
                ay += (awayY * 0.7 + shx * side * 0.9) * FISH_FLEE_K * w;
                fear = Math.max(fear, Math.sqrt(w));
            }
            if (pointer.active) {
                const pr = 130;
                const dx = f.x - pointer.x;
                const dy = f.y - pointer.y;
                const d = Math.hypot(dx, dy);
                if (d < pr && d > 1e-3) {
                    const w = (1 - d / pr) ** 2;
                    ax += dx / d * FISH_FLEE_K * w;
                    ay += dy / d * FISH_FLEE_K * w;
                    fear = Math.max(fear, Math.sqrt(w) * 0.8);
                }
            }
            let alarm = Math.max(f.alarm * calmDecay, fear);
            const relayed = neighbourAlarm * 0.86;
            if (relayed > alarm) alarm += (relayed - alarm) * contagion;
            f.alarm = alarm;
            const m = 36;
            if (f.x < m) ax += (m - f.x) * 7;
            else if (f.x > W - m) ax -= (f.x - (W - m)) * 7;
            if (f.y < m) ay += (m - f.y) * 7;
            else if (f.y > H - m) ay -= (f.y - (H - m)) * 7;
            current(f.x, f.y, time, cur);
            ax += cur.x * 0.5 + (Math.random() - 0.5) * sp.jitter;
            ay += cur.y * 0.5 + (Math.random() - 0.5) * sp.jitter;
            ay -= f.vy * sp.verticalDrag * (1 - 0.7 * f.alarm);
            const preferred = sp.cruise * (1 + 1.3 * f.alarm);
            ax += (preferred - speed) * hx * 1.6;
            ay += (preferred - speed) * hy * 1.6;
            const before = Math.atan2(f.vy, f.vx);
            f.vx += ax * dt;
            f.vy += ay * dt;
            const maxSpeed = sp.maxSpeed * (1 + 1.8 * f.alarm);
            const s = Math.hypot(f.vx, f.vy);
            if (s > maxSpeed) {
                f.vx *= maxSpeed / s;
                f.vy *= maxSpeed / s;
            } else if (s < sp.minSpeed && s > 1e-3) {
                f.vx *= sp.minSpeed / s;
                f.vy *= sp.minSpeed / s;
            }
            f.turn += (angleDiff(before, Math.atan2(f.vy, f.vx)) / dt - f.turn) * Math.min(1, dt * 8);
            f.phase += dt * (7 + Math.hypot(f.vx, f.vy) * 0.12);
            f.x = clamp(f.x + f.vx * dt, -60, W + 60);
            f.y = clamp(f.y + f.vy * dt, -60, H + 60);
        }
    }
    stepSharks(dt) {
        const { sharks, width: W, height: H, time } = this;
        const minSide = Math.min(W, H);
        const cxW = W / 2;
        const cyW = H / 2;
        for (const sh of sharks){
            const L = sh.length;
            const nodes = sh.nodes;
            const hx = nodes[0];
            const hy = nodes[1];
            sh.hunger = Math.min(1, sh.hunger + dt * 0.03 * (1 + this.arousal * 5));
            let dx = Math.cos(sh.heading);
            let dy = Math.sin(sh.heading);
            sh.wander = clamp(sh.wander + (Math.random() - 0.5) * dt * 3.2, -1.1, 1.1);
            dx += Math.cos(sh.heading + sh.wander) * 0.45;
            dy += Math.sin(sh.heading + sh.wander) * 0.45;
            if (time >= sh.retargetAt) {
                sh.target = this.findPrey(sh);
                if (sh.target && this.arousal > 0.25) {
                    const c = this.schoolCentroid(sh.target, this.arousal);
                    sh.aimX = c.x;
                    sh.aimY = c.y;
                } else {
                    sh.aimX = undefined;
                    sh.aimY = undefined;
                }
                sh.retargetAt = time + 0.45 / (1 + this.arousal * 2);
            }
            const t = sh.target;
            let hunting = false;
            let closing = 0;
            if (t && t.alive && sh.hunger > 0.3 - this.arousal * 0.25) {
                const aimed = sh.aimX !== undefined && sh.aimY !== undefined;
                const tx = (aimed ? sh.aimX : t.x + t.vx * 0.35) - hx;
                const ty = (aimed ? sh.aimY : t.y + t.vy * 0.35) - hy;
                const d = Math.hypot(tx, ty) || 1;
                const w = (1.4 + 2.6 * sh.hunger) * (1 + this.arousal * 0.9);
                dx += tx / d * w;
                dy += ty / d * w;
                hunting = true;
                closing = clamp(1 - d / (L * 0.9), 0, 1);
            } else {
                const rx = (hx - cxW) / (W / minSide);
                const ry = hy - cyW;
                const r = Math.hypot(rx, ry) || 1;
                const radius = sh.orbitRadius * (1 + 0.15 * Math.sin(time * 0.05 + sh.id));
                const radial = clamp((radius - r) / radius, -1, 1);
                dx += (-ry / r * sh.orbitDir + rx / r * radial * 0.9) * 0.55;
                dy += (rx / r * sh.orbitDir + ry / r * radial * 0.9) * 0.55;
            }
            for (const other of sharks){
                if (other === sh) continue;
                for(let k = 0; k < SHARK_NODES; k += 4){
                    const ox = hx - other.nodes[k * 2];
                    const oy = hy - other.nodes[k * 2 + 1];
                    const d = Math.hypot(ox, oy);
                    const range = (L + other.length) * 0.45;
                    if (d < range && d > 1e-3) {
                        const w = (1 - d / range) * 3;
                        dx += ox / d * w;
                        dy += oy / d * w;
                    }
                }
            }
            const ex = (hx - cxW) / (W * 0.3);
            const ey = (hy - cyW) / (H * 0.16);
            const e2 = ex * ex + ey * ey;
            if (e2 < 1) {
                const e = Math.sqrt(e2) || 1e-3;
                const w = (1 - e) * (hunting ? 1 : 2.5);
                dx += ex / e * w;
                dy += ey / e * w;
            }
            const over = Math.max(-hx, hx - W, -hy, hy - H);
            if (over > -L * 0.05) {
                const w = clamp((over + L * 0.05) / (L * 0.35), 0, 1) * 3.5;
                const toX = cxW - hx;
                const toY = cyW - hy;
                const d = Math.hypot(toX, toY) || 1;
                dx += toX / d * w;
                dy += toY / d * w;
            }
            const desired = Math.atan2(dy, dx);
            const agility = Math.min(hunting ? 1.7 + closing + this.arousal * 0.9 : 0.8, sh.speed / (L * 0.22));
            const maxTurn = agility * dt;
            const turned = clamp(angleDiff(sh.heading, desired), -maxTurn, maxTurn);
            sh.heading += turned;
            sh.turn += (turned / dt - sh.turn) * Math.min(1, dt * 3);
            const cruise = 30 + L * 0.04;
            const targetSpeed = (hunting ? cruise * (1.45 + closing * 1.5) : cruise) * (1 + this.arousal * 0.45);
            sh.speed += (targetSpeed - sh.speed) * Math.min(1, dt * 1.1);
            sh.phase += dt * (2 + sh.speed / 24);
            nodes[0] += Math.cos(sh.heading) * sh.speed * dt;
            nodes[1] += Math.sin(sh.heading) * sh.speed * dt;
            const seg = L / (SHARK_NODES - 1);
            const maxBend = 0.16;
            let prevAngle = sh.heading + Math.PI;
            for(let k = 1; k < SHARK_NODES; k++){
                const px = nodes[(k - 1) * 2];
                const py = nodes[(k - 1) * 2 + 1];
                let angle = Math.atan2(nodes[k * 2 + 1] - py, nodes[k * 2] - px);
                angle = prevAngle + clamp(angleDiff(prevAngle, angle), -maxBend, maxBend);
                nodes[k * 2] = px + Math.cos(angle) * seg;
                nodes[k * 2 + 1] = py + Math.sin(angle) * seg;
                prevAngle = angle;
            }
            if (sh.hunger > 0.15) {
                const mouthR = L * 0.05 + 8;
                const mx = nodes[0];
                const my = nodes[1];
                for (const f of this.fish){
                    if (!f.alive) continue;
                    if ((f.x - mx) ** 2 + (f.y - my) ** 2 < mouthR * mouthR) {
                        f.alive = false;
                        f.respawnAt = time + rand(3, 8);
                        sh.hunger = Math.max(0, sh.hunger - 0.16);
                        this.events.push({
                            kind: "eat",
                            x: f.x,
                            y: f.y
                        });
                    }
                }
            }
        }
    }
    findPrey(sh) {
        const range = sh.length * 0.9 + 160;
        const hx = sh.nodes[0];
        const hy = sh.nodes[1];
        const fx = Math.cos(sh.heading);
        const fy = Math.sin(sh.heading);
        let best = null;
        let bestScore = Infinity;
        let currentScore = Infinity;
        for (const f of this.fish){
            if (!f.alive) continue;
            const dx = f.x - hx;
            const dy = f.y - hy;
            const d = Math.hypot(dx, dy);
            if (d > range || d < 1e-3) continue;
            const cos = (dx * fx + dy * fy) / d;
            if (cos < 0.2) continue;
            const crowd = this.bucketCount[this.bucketOf(f.x, f.y)];
            const crowdWeight = 0.07 - this.arousal * 0.34;
            const crowdFactor = Math.max(0.2, 1 + crowd * crowdWeight);
            const bias = 1 + sh.id * 37 % 11 / 42;
            const score = d * (1 + (1 - cos) * 0.8) * crowdFactor * bias;
            if (score < bestScore) {
                bestScore = score;
                best = f;
            }
            if (f === sh.target) currentScore = score;
        }
        if (sh.target && currentScore < bestScore * (1.3 - this.arousal * 0.6)) return sh.target;
        return best;
    }
    schoolCentroid(seed, arousal) {
        const radius = this.perception * (1.1 + arousal * 1.2);
        const r2 = radius * radius;
        let sx = 0;
        let sy = 0;
        let n = 0;
        for (const f of this.fish){
            if (!f.alive || f.species !== seed.species) continue;
            const dx = f.x - seed.x;
            const dy = f.y - seed.y;
            if (dx * dx + dy * dy > r2) continue;
            sx += f.x;
            sy += f.y;
            n++;
        }
        if (n < 3) return {
            x: seed.x,
            y: seed.y
        };
        return {
            x: sx / n,
            y: sy / n
        };
    }
    respawn() {
        const { time, width: W, height: H } = this;
        const due = [];
        for (const f of this.fish)if (!f.alive && f.respawnAt <= time) due.push(f);
        if (due.length === 0) return;
        if (due.length < 6 && time - this.lastSpawn < 9 * (1 + this.arousal * 1.8)) return;
        this.lastSpawn = time;
        const side = randInt(0, 3);
        const along = rand(0.15, 0.85);
        const x = side === 0 ? -20 : side === 1 ? W + 20 : along * W;
        const y = side === 2 ? -20 : side === 3 ? H + 20 : along * H;
        const inward = Math.atan2(H / 2 - y, W / 2 - x) + rand(-0.5, 0.5);
        const species = pickSpecies();
        const sp = SPECIES[species];
        const millDir = Math.random() < 0.5 ? 1 : -1;
        for (const f of due.slice(0, sp.schoolSize[1])){
            f.alive = true;
            f.species = species;
            f.alarm = 0;
            f.turn = 0;
            f.millDir = millDir;
            f.x = x + rand(-1, 1) * this.perception;
            f.y = y + rand(-1, 1) * this.perception;
            f.vx = Math.cos(inward) * sp.cruise * 1.4;
            f.vy = Math.sin(inward) * sp.cruise * 1.4;
        }
    }
}

module.exports = { SHARK_NODES, World };
};
__defs["./renderer"] = function (module, exports, __req) {
const { clamp, hash3, smoothstep } = __req("./math");
const { SHARK_NODES } = __req("./world");
const ALPHA_LEVELS = 6;
const FISH_ALPHAS = [
    0.28,
    0.42,
    0.58,
    0.74,
    0.9
];
const DOT_RGB = [
    [
        48,
        52,
        235
    ],
    [
        52,
        205,
        60
    ],
    [
        228,
        50,
        44
    ],
    [
        190,
        212,
        255
    ],
    [
        110,
        230,
        255
    ]
];
const DOT_BASE_ALPHA = [
    1,
    1,
    1,
    1,
    1
];
const WAKE = DOT_RGB.length - 1;
const ACCENTS = [
    "#e0892c",
    "#e03a32",
    "#b44ae0",
    "#33c8cc",
    "#3cb54a",
    "#3150e8",
    "#d9c14a"
];
const DOT_RGB_LIGHT = DOT_RGB.map(([r, g, b])=>[
        Math.round(r * 0.30 + 18),
        Math.round(g * 0.34 + 30),
        Math.round(b * 0.42 + 62)
    ]);
const RIPPLE_GLYPHS = "~-.:'";
const DROP_GLYPHS = "*+o";
const SPLASH_LIFE = 2.0;
const SKIN_RAMP = ":;t%SX8#@";
const FIN_GLYPHS = "%;tS:";
const RIDGE_GLYPHS = "@8%";
const EDGE_HEAVY = ":;";
const EDGE_LIGHT = ".',`";
const FLAG_BODY = 1;
const FLAG_EDGE = 2;
const FLAG_FIN = 3;
const FLAG_RIDGE = 4;
const FLAG_EYE = 5;
const FLAG_MARK = 6;
const MARK_GLYPHS = "#%@";
const SUBSAMPLES = [
    0.25,
    0.3,
    0.75,
    0.3,
    0.25,
    0.72,
    0.75,
    0.72
];
function classicHalfWidth(s) {
    if (s < 0.13) return 0.09 * Math.pow(Math.sin(s / 0.13 * Math.PI / 2), 0.95);
    if (s < 0.3) return 0.09 + 0.016 * smoothstep(0.13, 0.3, s);
    if (s < 0.84) return 0.019 + 0.087 * Math.pow(1 - (s - 0.3) / 0.54, 1.25);
    const k = (s - 0.84) / 0.16;
    return 0.019 * (1 - k) + 0.012 * Math.sin(k * Math.PI);
}
const SHAPES = {
    classic: {
        halfWidth: classicHalfWidth,
        pectoral: [
            0.15,
            0.43,
            0.55,
            0.26
        ],
        falcate: true,
        pelvic: [
            0.57,
            0.65,
            0.69,
            0.085
        ],
        caudal: 0.085,
        dorsal: [
            0.33,
            0.47
        ],
        secondDorsal: [
            0.71,
            0.76
        ],
        eye: [
            0.1,
            0.14
        ],
        gills: [
            0.19,
            0.29
        ],
        tint: [
            0.92,
            0.97,
            1.05
        ]
    },
    hammerhead: {
        halfWidth: (s)=>{
            if (s < 0.06) return 0.045;
            if (s < 0.3) return 0.045 + 0.061 * smoothstep(0.06, 0.3, s);
            return classicHalfWidth(s) * 0.92;
        },
        head: {
            span: 0.17,
            sweep: 0.035,
            depth: 0.09,
            notch: 0
        },
        pectoral: [
            0.17,
            0.4,
            0.5,
            0.22
        ],
        falcate: true,
        pelvic: [
            0.56,
            0.63,
            0.67,
            0.075
        ],
        caudal: 0.11,
        dorsal: [
            0.28,
            0.44
        ],
        secondDorsal: [
            0.7,
            0.74
        ],
        eye: null,
        gills: [
            0.16,
            0.26
        ],
        tint: [
            0.96,
            0.98,
            0.9
        ]
    },
    tiger: {
        halfWidth: (s)=>{
            if (s < 0.13) return 0.1 * Math.pow(Math.sin(s / 0.13 * Math.PI / 2), 0.45);
            if (s < 0.3) return 0.1 + 0.014 * smoothstep(0.13, 0.3, s);
            if (s < 0.84) return 0.019 + 0.095 * Math.pow(1 - (s - 0.3) / 0.54, 1.2);
            const k = (s - 0.84) / 0.16;
            return 0.019 * (1 - k) + 0.012 * Math.sin(k * Math.PI);
        },
        pectoral: [
            0.15,
            0.42,
            0.53,
            0.25
        ],
        falcate: true,
        pelvic: [
            0.57,
            0.65,
            0.69,
            0.085
        ],
        caudal: 0.095,
        dorsal: [
            0.33,
            0.46
        ],
        secondDorsal: [
            0.71,
            0.75
        ],
        eye: [
            0.08,
            0.12
        ],
        gills: [
            0.19,
            0.28
        ],
        tint: [
            1.02,
            0.95,
            0.84
        ]
    },
    zebra: {
        halfWidth: (s)=>{
            if (s < 0.1) return 0.075 * Math.pow(Math.sin(s / 0.1 * Math.PI / 2), 0.7);
            if (s < 0.28) return 0.075 + 0.025 * smoothstep(0.1, 0.28, s);
            if (s < 0.55) return 0.022 + 0.078 * Math.pow(1 - (s - 0.28) / 0.27, 1.1);
            const k = (s - 0.55) / 0.45;
            return 0.022 * (1 - k * k) + 0.012 * Math.sin(k * Math.PI);
        },
        pectoral: [
            0.12,
            0.3,
            0.36,
            0.19
        ],
        falcate: false,
        pelvic: [
            0.42,
            0.48,
            0.51,
            0.065
        ],
        caudal: 0,
        dorsal: [
            0.36,
            0.44
        ],
        secondDorsal: [
            0.49,
            0.53
        ],
        eye: [
            0.06,
            0.09
        ],
        gills: [
            0.13,
            0.2
        ],
        tint: [
            1.08,
            0.97,
            0.74
        ]
    },
    greathammer: {
        halfWidth: (s)=>{
            if (s < 0.05) return 0.04;
            if (s < 0.3) return 0.04 + 0.07 * smoothstep(0.05, 0.3, s);
            return classicHalfWidth(s) * 0.95;
        },
        head: {
            span: 0.21,
            sweep: 0.006,
            depth: 0.085,
            notch: 0.014
        },
        pectoral: [
            0.16,
            0.38,
            0.49,
            0.24
        ],
        falcate: true,
        pelvic: [
            0.55,
            0.62,
            0.67,
            0.085
        ],
        caudal: 0.13,
        dorsal: [
            0.24,
            0.45
        ],
        secondDorsal: [
            0.68,
            0.74
        ],
        eye: null,
        gills: [
            0.15,
            0.25
        ],
        tint: [
            0.86,
            0.93,
            1.02
        ]
    },
    mako: {
        halfWidth: (s)=>{
            if (s < 0.17) return 0.088 * Math.pow(Math.sin(s / 0.17 * Math.PI / 2), 1.5);
            if (s < 0.32) return 0.088 + 0.012 * smoothstep(0.17, 0.32, s);
            if (s < 0.86) return 0.014 + 0.086 * Math.pow(1 - (s - 0.32) / 0.54, 1.45);
            const k = (s - 0.86) / 0.14;
            return 0.014 * (1 - k) + 0.01 * Math.sin(k * Math.PI);
        },
        pectoral: [
            0.18,
            0.4,
            0.5,
            0.21
        ],
        falcate: true,
        pelvic: [
            0.58,
            0.64,
            0.68,
            0.06
        ],
        caudal: 0.13,
        dorsal: [
            0.34,
            0.45
        ],
        secondDorsal: [
            0.76,
            0.79
        ],
        eye: [
            0.11,
            0.15
        ],
        gills: [
            0.2,
            0.3
        ],
        tint: [
            0.78,
            0.9,
            1.2
        ]
    },
    thresher: {
        halfWidth: (s)=>{
            if (s < 0.08) return 0.07 * Math.pow(Math.sin(s / 0.08 * Math.PI / 2), 0.75);
            if (s < 0.2) return 0.07 + 0.02 * smoothstep(0.08, 0.2, s);
            if (s < 0.48) return 0.012 + 0.078 * Math.pow(1 - (s - 0.2) / 0.28, 1.3);
            const k = (s - 0.48) / 0.52;
            return 0.012 * (1 - k) + 0.006 * Math.sin(k * Math.PI * 0.9) + 0.002;
        },
        pectoral: [
            0.12,
            0.27,
            0.36,
            0.2
        ],
        falcate: true,
        pelvic: [
            0.37,
            0.41,
            0.44,
            0.045
        ],
        caudal: 0,
        dorsal: [
            0.24,
            0.32
        ],
        secondDorsal: [
            0.45,
            0.47
        ],
        eye: [
            0.05,
            0.1
        ],
        gills: [
            0.11,
            0.18
        ],
        tint: [
            1.0,
            0.9,
            1.08
        ]
    },
    nurse: {
        halfWidth: (s)=>{
            if (s < 0.08) return 0.085 * Math.pow(Math.sin(s / 0.08 * Math.PI / 2), 0.4);
            if (s < 0.3) return 0.085 + 0.02 * smoothstep(0.08, 0.3, s);
            if (s < 0.72) return 0.022 + 0.083 * Math.pow(1 - (s - 0.3) / 0.42, 1.1);
            const k = (s - 0.72) / 0.28;
            return 0.022 * (1 - k * k) + 0.014 * Math.sin(k * Math.PI);
        },
        pectoral: [
            0.16,
            0.34,
            0.4,
            0.17
        ],
        falcate: false,
        pelvic: [
            0.45,
            0.52,
            0.55,
            0.075
        ],
        caudal: 0,
        dorsal: [
            0.5,
            0.58
        ],
        secondDorsal: [
            0.63,
            0.69
        ],
        eye: [
            0.05,
            0.075
        ],
        gills: [
            0.14,
            0.22
        ],
        tint: [
            1.1,
            0.96,
            0.76
        ]
    }
};
const KINDS = Object.keys(SHAPES);
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
    const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
    const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
    const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
}
function paintGrid(g, W, H, cw, ch, dpr, light = false) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.strokeStyle = light ? "rgba(30, 62, 96, 0.075)" : "rgba(255,255,255,0.055)";
    g.lineWidth = 1;
    g.beginPath();
    for(let c = 0; c <= Math.ceil(W / cw); c++){
        const x = Math.round(c * cw * dpr) + 0.5;
        g.moveTo(x, 0);
        g.lineTo(x, H * dpr);
    }
    for(let r = 0; r <= Math.ceil(H / ch); r++){
        const y = Math.round(r * ch * dpr) + 0.5;
        g.moveTo(0, y);
        g.lineTo(W * dpr, y);
    }
    g.stroke();
}
const BOAT_RAMP = ":;t%S";
const BOAT_EDGE = [
    ".",
    ":",
    ";",
    "t"
];
function tri(px, py, ax, ay, bx, by, cx, cy) {
    const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
    const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
    const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
}
function boatGlyph(shade) {
    const i = Math.min(BOAT_RAMP.length - 1, Math.max(0, Math.floor((1 - shade) * BOAT_RAMP.length + 0.5)));
    return BOAT_RAMP[i];
}
function decisiveEdge(across) {
    const i = Math.min(BOAT_EDGE.length - 1, Math.floor(across * BOAT_EDGE.length));
    return BOAT_EDGE[i];
}
class AsciiRenderer {
    canvas;
    ctx;
    bg;
    transparent = false;
    fishScale = 1;
    stoke = 0;
    dpr = 1;
    width = 0;
    height = 0;
    cw = 12;
    ch = 18;
    cols = 0;
    rows = 0;
    fontFamily = "ui-monospace, Menlo, monospace";
    dotKind = new Uint8Array(0);
    dotPhase = new Float32Array(0);
    dotFreq = new Float32Array(0);
    energy = new Float32Array(0);
    energyTmp = new Float32Array(0);
    heat = new Float32Array(0);
    bucketOf = new Uint8Array(0);
    bucketOrder = new Int32Array(0);
    bucketCounts = new Int32Array(DOT_RGB.length * ALPHA_LEVELS + 1);
    dotStyles = [];
    sharkFlag = new Uint8Array(0);
    sharkShade = new Float32Array(0);
    sharkKey = new Uint32Array(0);
    sharkDepth = new Float32Array(0);
    sharkKind = new Uint8Array(0);
    sharkShadow = new Uint8Array(0);
    spine = new Float32Array(SHARK_NODES * 2);
    arc = new Float32Array(SHARK_NODES);
    arcTotal = 1;
    shape = SHAPES.classic;
    sharkId = 0;
    finTipLeft = 0;
    finTipRight = 0;
    hitFlag = 0;
    hitShade = 0;
    hitS = 0;
    hitV = 0;
    hitDist = 0;
    fishStamp = new Uint32Array(0);
    frameId = 0;
    fishBuckets = FISH_ALPHAS.map(()=>[]);
    fishStyles = FISH_ALPHAS.map((a)=>`rgba(230,238,255,${a})`);
    dark = true;
    splashes = [];
    rippleScale = 0.7;
    constructor(canvas, options = {}){
        this.canvas = canvas;
        this.transparent = options.transparent === true;
        const ctx = canvas.getContext("2d", {
            alpha: this.transparent
        });
        if (!ctx) throw new Error("2D canvas unavailable");
        this.ctx = ctx;
        this.bg = document.createElement("canvas");
        this.buildInk();
    }
    buildInk() {
        const [r, g, b] = this.dark ? [
            230,
            238,
            255
        ] : [
            38,
            64,
            110
        ];
        this.fishStyles = FISH_ALPHAS.map((a)=>this.dark ? `rgba(${r},${g},${b},${a})` : `rgba(${r},${g},${b},${(a * 0.85).toFixed(2)})`);
        this.dotStyles = [];
        const palette = this.dark ? DOT_RGB : DOT_RGB_LIGHT;
        for(let c = 0; c < palette.length; c++){
            const [cr, cg, cb] = palette[c];
            for(let l = 0; l < ALPHA_LEVELS; l++){
                const a = DOT_BASE_ALPHA[c] * (l + 1) / ALPHA_LEVELS;
                this.dotStyles.push(`rgba(${cr},${cg},${cb},${a.toFixed(3)})`);
            }
        }
    }
    setRippleScale(scale) {
        this.rippleScale = clamp(scale, 0.2, 2.5);
    }
    setTheme(dark) {
        const next = dark !== false;
        if (next === this.dark) return;
        this.dark = next;
        this.buildInk();
    }
    get cellWidth() {
        return this.cw;
    }
    get cellHeight() {
        return this.ch;
    }
    setFontFamily(family) {
        if (family) this.fontFamily = family;
    }
    setStoke(value) {
        this.stoke = clamp(value, 0, 1);
    }
    setFishScale(scale) {
        this.fishScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    }
    resize(width, height, dpr) {
        const prevCols = this.cols;
        const prevRows = this.rows;
        this.width = width;
        this.height = height;
        this.dpr = dpr;
        this.cw = clamp(Math.round(width / 124), 8, 13);
        this.ch = Math.round(this.cw * 1.45);
        this.cols = Math.ceil(width / this.cw);
        this.rows = Math.ceil(height / this.ch);
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.bg.width = this.canvas.width;
        this.bg.height = this.canvas.height;
        const n = this.cols * this.rows;
        if (this.cols !== prevCols || this.rows !== prevRows) {
            this.dotKind = new Uint8Array(n);
            this.dotPhase = new Float32Array(n);
            this.dotFreq = new Float32Array(n);
            this.energy = new Float32Array(n);
            this.energyTmp = new Float32Array(n);
            this.heat = new Float32Array(n);
            this.bucketOf = new Uint8Array(n);
            this.bucketOrder = new Int32Array(n);
            this.sharkFlag = new Uint8Array(n);
            this.sharkShade = new Float32Array(n);
            this.sharkKey = new Uint32Array(n);
            this.sharkDepth = new Float32Array(n);
            this.sharkKind = new Uint8Array(n);
            this.sharkShadow = new Uint8Array(n);
            this.fishStamp = new Uint32Array(n);
        }
        for(let i = 0; i < n; i++){
            const col = i % this.cols;
            const row = i / this.cols | 0;
            this.dotKind[i] = 0;
            this.dotPhase[i] = hash3(col, row, 23) * Math.PI * 2;
            this.dotFreq[i] = 0.3 + hash3(col, row, 37) * 1.1;
        }
        this.paintBackground();
    }
    paintBackground() {
        const g = this.bg.getContext("2d");
        if (!g) return;
        const { width: W, height: H, dpr, cw, ch } = this;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, this.bg.width, this.bg.height);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!this.transparent) {
            g.fillStyle = "#000";
            g.fillRect(0, 0, W, H);
        }
        paintGrid(g, W, H, cw, ch, dpr, !this.dark);
    }
    render(world, dt) {
        const { ctx, dpr, cols, ch } = this;
        if (cols === 0) return;
        const t = world.time;
        this.consumeEvents(world);
        this.rasterizeSharks(world.sharks, t);
        this.depositWake(world);
        this.diffuse(dt);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (this.transparent) {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        ctx.drawImage(this.bg, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.markFish(world);
        this.drawDots(t);
        ctx.font = `600 ${Math.round(ch * 0.74)}px ${this.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        this.drawSplashes(world.time);
        this.drawHeat();
        this.drawFish();
        this.drawSharks(t);
    }
    cellIndex(x, y) {
        const c = Math.floor(x / this.cw);
        const r = Math.floor(y / this.ch);
        if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
        return r * this.cols + c;
    }
    stamp(field, x, y, radius, amount) {
        const c0 = Math.floor(x / this.cw);
        const r0 = Math.floor(y / this.ch);
        for(let r = r0 - radius; r <= r0 + radius; r++){
            for(let c = c0 - radius; c <= c0 + radius; c++){
                if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
                const d = Math.hypot(c - c0, (r - r0) * 1.4);
                if (d > radius + 0.5) continue;
                const i = r * this.cols + c;
                field[i] = Math.min(1.6, field[i] + amount * (1 - d / (radius + 1)));
            }
        }
    }
    consumeEvents(world) {
        for (const e of world.events){
            if (e.kind === "eat") {
                this.stamp(this.heat, e.x, e.y, 2, 1);
                this.stamp(this.energy, e.x, e.y, 3, 0.9);
            } else {
                this.stamp(this.energy, e.x, e.y, 6, 1.4);
                this.splashes.push({
                    x: e.x,
                    y: e.y,
                    t: world.time
                });
                if (this.splashes.length > 12) this.splashes.splice(0, this.splashes.length - 12);
            }
        }
        world.events.length = 0;
    }
    depositWake(world) {
        const { energy } = this;
        for (const f of world.fish){
            if (!f.alive) continue;
            const i = this.cellIndex(f.x, f.y);
            if (i >= 0) energy[i] = Math.min(1.6, energy[i] + 0.012 + f.alarm * 0.03);
        }
        for (const sh of world.sharks ?? []){
            for(let k = SHARK_NODES - 6; k < SHARK_NODES; k++){
                const i = this.cellIndex(sh.nodes[k * 2], sh.nodes[k * 2 + 1]);
                if (i >= 0) energy[i] = Math.min(1.6, energy[i] + (0.05 + sh.speed * 0.0012) * (1 + this.stoke * 2.2));
            }
        }
        if (world.pointer.active) {
            this.stamp(energy, world.pointer.x, world.pointer.y, 1, 0.08);
        }
    }
    diffuse(dt) {
        const { cols, rows, energy, energyTmp: tmp, heat } = this;
        const decay = Math.exp(-dt * 1.5);
        for(let r = 0; r < rows; r++){
            for(let c = 0; c < cols; c++){
                const i = r * cols + c;
                const l = c > 0 ? energy[i - 1] : energy[i];
                const rt = c < cols - 1 ? energy[i + 1] : energy[i];
                const u = r > 0 ? energy[i - cols] : energy[i];
                const d = r < rows - 1 ? energy[i + cols] : energy[i];
                tmp[i] = (energy[i] * 4 + l + rt + u + d) * 0.125 * decay;
            }
        }
        this.energy = tmp;
        this.energyTmp = energy;
        const heatDecay = Math.exp(-dt * 2.2);
        for(let i = 0; i < heat.length; i++)heat[i] *= heatDecay;
    }
    sampleShark(px, py, L) {
        const { spine, arc } = this;
        const N = SHARK_NODES;
        let best = Infinity;
        let bestS = 0;
        let bestSign = 1;
        let bestNx = 0;
        let bestNy = 0;
        for(let k = 0; k < N - 1; k++){
            const ax = spine[k * 2];
            const ay = spine[k * 2 + 1];
            const sx = spine[(k + 1) * 2] - ax;
            const sy = spine[(k + 1) * 2 + 1] - ay;
            const len2 = sx * sx + sy * sy || 1;
            const u = clamp(((px - ax) * sx + (py - ay) * sy) / len2, 0, 1);
            const qx = ax + sx * u;
            const qy = ay + sy * u;
            const d2 = (px - qx) ** 2 + (py - qy) ** 2;
            if (d2 < best) {
                best = d2;
                const len = Math.sqrt(len2);
                bestS = (arc[k] + u * len) / this.arcTotal;
                bestSign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1;
                bestNx = -sy / len * bestSign;
                bestNy = sx / len * bestSign;
            }
        }
        const a = Math.sqrt(best);
        const s = bestS;
        const u = s * L;
        const shape = this.shape;
        const w = shape.halfWidth(s) * L;
        this.hitDist = a;
        this.hitS = s;
        this.hitV = a * bestSign;
        const head = this.shape.head;
        if (head && u < L * (head.sweep + head.depth + head.notch)) {
            const span = L * head.span;
            const r = a / span;
            const front = L * head.sweep * r * r + L * head.notch * Math.max(0, 1 - r / 0.14);
            const depth = L * head.depth * (1 - 0.2 * r * r * r * r);
            if (r <= 1 && u >= front && u <= front + depth) {
                this.hitFlag = r > 0.84 ? FLAG_EYE : FLAG_BODY;
                this.hitShade = r > 0.84 ? 0 : 0.62 - 0.2 * r + (u < front + L * 0.012 ? 0.1 : 0);
                return true;
            }
        }
        if (a <= w) {
            const across = a / (w || 1);
            const facing = (bestNx * -0.6 + bestNy * -0.8) * across;
            let shade = 0.58 - across * across * 0.42 + facing * 0.26;
            let flag = FLAG_BODY;
            if (s > shape.dorsal[0] && s < shape.dorsal[1] && across < 0.3) {
                flag = FLAG_RIDGE;
                shade = 1;
            } else if (s > shape.secondDorsal[0] && s < shape.secondDorsal[1] && across < 0.4) {
                shade = Math.max(shade, 0.82);
            } else if (shape.eye && s > shape.eye[0] && s < shape.eye[1] && across > 0.6) {
                flag = FLAG_EYE;
                shade = 0;
            } else if (s > shape.gills[0] && s < shape.gills[1] && across > 0.58) {
                if (Math.floor((s - shape.gills[0]) / (shape.gills[1] - shape.gills[0]) * 5) % 2 === 0) shade *= 0.45;
            } else if (s < 0.05) {
                shade = Math.max(shade, 0.7);
            } else if (shape === SHAPES.zebra && s > 0.08 && s < 0.55 && (across < 0.1 || Math.abs(across - 0.6) < 0.08)) {
                shade = Math.max(shade, 0.8);
            } else if (this.marked(s, a * bestSign, L, across)) {
                flag = FLAG_MARK;
            }
            this.hitFlag = flag;
            this.hitShade = shade;
            return true;
        }
        const tip = bestSign > 0 ? this.finTipRight : this.finTipLeft;
        const [p0, p1, p2] = shape.pectoral;
        if (inTriangle(u, a, L * p0, 0, L * p1, 0, L * p2, tip) && !(shape.falcate && inTriangle(u, a, L * p1, 0, L * (p1 + (p2 - p1) * 0.33), tip * 0.55, L * p2, tip))) {
            this.hitFlag = this.marked(s, a * bestSign, L, 0) ? FLAG_MARK : FLAG_FIN;
            this.hitShade = 0.38 + 0.22 * (1 - clamp(a / tip, 0, 1));
            return true;
        }
        const [v0, v1, v2, vr] = shape.pelvic;
        if (inTriangle(u, a, L * v0, 0, L * v1, 0, L * v2, L * vr) || shape.caudal > 0 && inTriangle(u, a, L * 0.86, 0, L * 0.95, 0, L, L * shape.caudal)) {
            this.hitFlag = FLAG_FIN;
            this.hitShade = 0.36;
            return true;
        }
        return false;
    }
    marked(s, v, L, across) {
        if (this.shape === SHAPES.tiger) {
            if (s < 0.2 || s > 0.9 || across > 0.85) return false;
            const wobble = 0.35 * Math.sin(v / L * 25 + s * 5);
            const bar = Math.sin(s * Math.PI * 2 * 9 + wobble);
            return bar > 0.65 - 0.5 * smoothstep(0.2, 0.42, s) + 0.4 * smoothstep(0.8, 0.9, s);
        }
        if (this.shape === SHAPES.zebra) {
            if (s < 0.07) return false;
            const gu = s * L / (L * 0.06);
            const gv = v / (L * 0.045);
            const cu = Math.floor(gu);
            const cv = Math.floor(gv);
            const jx = hash3(cu, cv, this.sharkId) * 0.5 + 0.25;
            const jy = hash3(cu, cv, this.sharkId + 11) * 0.5 + 0.25;
            return (gu - cu - jx) ** 2 + (gv - cv - jy) ** 2 < 0.08;
        }
        return false;
    }
    rasterizeSharks(sharks, t) {
        const { sharkFlag, sharkShade, sharkKey, sharkDepth, sharkKind, sharkShadow, spine, arc, cw, ch, cols, rows } = this;
        sharkFlag.fill(0);
        sharkShadow.fill(0);
        for (const sh of sharks){
            const L = sh.length;
            const N = SHARK_NODES;
            const n = sh.nodes;
            const swim = clamp(sh.speed / 60, 0.4, 1.4);
            this.shape = SHAPES[sh.kind];
            this.sharkId = sh.id;
            const kindIndex = KINDS.indexOf(sh.kind);
            for(let k = 0; k < N; k++){
                const s = k / (N - 1);
                const a = Math.max(0, k - 1);
                const b = Math.min(N - 1, k + 1);
                let tx = n[a * 2] - n[b * 2];
                let ty = n[a * 2 + 1] - n[b * 2 + 1];
                const tl = Math.hypot(tx, ty) || 1;
                tx /= tl;
                ty /= tl;
                const amp = L * 0.05 * (0.1 + 0.9 * Math.pow(s, 1.8)) * swim;
                const off = amp * Math.sin(sh.phase - s * 5.2);
                spine[k * 2] = n[k * 2] - ty * off;
                spine[k * 2 + 1] = n[k * 2 + 1] + tx * off;
            }
            arc[0] = 0;
            for(let k = 1; k < N; k++){
                arc[k] = arc[k - 1] + Math.hypot(spine[k * 2] - spine[(k - 1) * 2], spine[k * 2 + 1] - spine[(k - 1) * 2 + 1]);
            }
            this.arcTotal = arc[N - 1] || 1;
            const bank = clamp(sh.turn * 0.45, -0.35, 0.35);
            const flex = 1 + 0.06 * Math.sin(sh.phase * 0.5);
            const reachFin = this.shape.pectoral[3];
            this.finTipRight = L * reachFin * flex * (1 - bank);
            this.finTipLeft = L * reachFin * flex * (1 + bank);
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for(let k = 0; k < N; k++){
                minX = Math.min(minX, spine[k * 2]);
                maxX = Math.max(maxX, spine[k * 2]);
                minY = Math.min(minY, spine[k * 2 + 1]);
                maxY = Math.max(maxY, spine[k * 2 + 1]);
            }
            const reach = L * 0.36;
            const c0 = Math.max(0, Math.floor((minX - reach) / cw));
            const c1 = Math.min(cols - 1, Math.floor((maxX + reach) / cw));
            const r0 = Math.max(0, Math.floor((minY - reach) / ch));
            const r1 = Math.min(rows - 1, Math.floor((maxY + reach) / ch));
            if (c0 > c1 || r0 > r1) continue;
            const skipBeyond = reach + Math.hypot(cw, ch);
            const shadowDc = Math.round(L * 0.035 / cw) + 1;
            const shadowDr = Math.round(L * 0.02 / ch) + 1;
            for(let r = r0; r <= r1; r++){
                for(let c = c0; c <= c1; c++){
                    const x = c * cw;
                    const y = r * ch;
                    const centerHit = this.sampleShark(x + cw / 2, y + ch / 2, L);
                    if (!centerHit && this.hitDist > skipBeyond) continue;
                    const flag = this.hitFlag;
                    const shade = this.hitShade;
                    const s = this.hitS;
                    const v = this.hitV;
                    let hits = centerHit ? 1 : 0;
                    for(let k = 0; k < SUBSAMPLES.length; k += 2){
                        if (this.sampleShark(x + SUBSAMPLES[k] * cw, y + SUBSAMPLES[k + 1] * ch, L)) hits++;
                    }
                    if (hits === 0) continue;
                    const coverage = hits / 5;
                    const i = r * cols + c;
                    const key = hash3(Math.round(s * 52), Math.round(v / (cw * 0.9)), sh.id) * 4294967295 >>> 0;
                    sharkKey[i] = key;
                    sharkDepth[i] = sh.depth;
                    sharkKind[i] = kindIndex;
                    if (centerHit && coverage >= 0.6) {
                        sharkFlag[i] = flag;
                        const flicker = (hash3(c, r, Math.floor(t * 6)) - 0.5) * 0.06;
                        sharkShade[i] = clamp(shade + flicker, 0, 1);
                        const sc = c + shadowDc;
                        const sr = r + shadowDr;
                        if (sc < cols && sr < rows) sharkShadow[sr * cols + sc] = 1;
                    } else {
                        sharkFlag[i] = FLAG_EDGE;
                        sharkShade[i] = coverage;
                    }
                }
            }
        }
    }
    drawSharks(t) {
        const { ctx, cols, rows, cw, ch, sharkFlag, sharkShade, sharkKey, sharkDepth, sharkKind } = this;
        const n = cols * rows;
        for(let i = 0; i < n; i++){
            const flag = sharkFlag[i];
            if (!flag) continue;
            const col = i % cols;
            const row = i / cols | 0;
            const x = col * cw;
            const y = row * ch;
            const key = sharkKey[i];
            const shade = sharkShade[i];
            const dim = 0.7 + 0.3 * sharkDepth[i];
            const [tr, tg, tb] = SHAPES[KINDS[sharkKind[i]]].tint;
            const tick = Math.floor(t * 2.4 + key % 997 / 97);
            const roll = hash3(key, tick, 7);
            if (flag === FLAG_EDGE) {
                const set = shade >= 0.5 ? EDGE_HEAVY : EDGE_LIGHT;
                const g = (70 + shade * 80) * dim;
                ctx.fillStyle = roll < 0.07 ? ACCENTS[key % ACCENTS.length] : `rgb(${Math.round(g * tr)},${Math.round(g * tg)},${Math.min(255, Math.round(g * tb + 6))})`;
                ctx.fillText(set[(key >>> 8) % set.length], x + cw / 2, y + ch / 2 + 1);
                continue;
            }
            let level;
            let glyph;
            if (flag === FLAG_RIDGE) {
                level = 226;
                glyph = RIDGE_GLYPHS[(key >>> 8) % RIDGE_GLYPHS.length];
            } else if (flag === FLAG_EYE) {
                level = 12;
                glyph = "o";
            } else if (flag === FLAG_MARK) {
                level = 24 + shade * 22;
                glyph = MARK_GLYPHS[(key >>> 8) % MARK_GLYPHS.length];
            } else if (flag === FLAG_FIN) {
                level = 40 + shade * 120;
                glyph = FIN_GLYPHS[(key >>> 8) % FIN_GLYPHS.length];
            } else {
                level = 46 + shade * 160;
                const jitter = (key >>> 4) % 3 - 1;
                glyph = SKIN_RAMP[clamp(Math.floor((1 - shade) * 8.99) + jitter, 0, SKIN_RAMP.length - 1)];
            }
            level *= dim;
            ctx.fillStyle = `rgb(${Math.min(255, Math.round(level * tr))},${Math.min(255, Math.round(level * tg))},${Math.min(255, Math.round(level * tb + 4))})`;
            ctx.fillRect(x + 1, y + 1, cw - 1, ch - 1);
            let color;
            if (flag === FLAG_EYE) color = this.dark ? "#9aa0ad" : "#3c4652";
            else if (flag === FLAG_MARK) color = `rgb(${Math.round(70 * tr)},${Math.round(70 * tg)},${Math.round(70 * tb)})`;
            else if (roll < 0.09) color = ACCENTS[key % ACCENTS.length];
            else if (roll < 0.13) color = "#ffffff";
            else color = this.dark ? shade > 0.55 ? "#0e0f13" : "#1b1d24" : shade > 0.55 ? "#f3f9ff" : "#dfeaf6";
            ctx.fillStyle = color;
            ctx.fillText(glyph, x + cw / 2, y + ch / 2 + 1);
        }
    }
    markFish(world) {
        const { fishStamp, fishBuckets, sharkFlag } = this;
        const frame = ++this.frameId;
        for (const bucket of fishBuckets)bucket.length = 0;
        for(let pass = 0; pass < 2; pass++){
            for (const f of world.fish){
                if (!f.alive || (f.depth > 0.78 ? 0 : 1) !== pass) continue;
                const i = this.cellIndex(f.x, f.y);
                if (i < 0 || fishStamp[i] === frame || sharkFlag[i]) continue;
                fishStamp[i] = frame;
                const glint = clamp(Math.abs(f.turn) / 3.5, 0, 1);
                const v = 0.3 + 0.4 * (f.depth - 0.55) / 0.45 + 0.3 * Math.max(glint, f.alarm);
                fishBuckets[clamp(Math.floor(v * FISH_ALPHAS.length), 0, FISH_ALPHAS.length - 1)].push(i);
            }
        }
    }
    drawFish() {
        const { ctx, cw, ch, cols, fishBuckets } = this;
        const previousFont = ctx.font;
        if (this.fishScale !== 1) {
            ctx.font = `600 ${Math.max(6, Math.round(ch * 0.74 * this.fishScale))}px ${this.fontFamily}`;
        }
        for(let b = 0; b < fishBuckets.length; b++){
            const bucket = fishBuckets[b];
            if (!bucket.length) continue;
            ctx.fillStyle = this.fishStyles[b];
            for (const i of bucket){
                ctx.fillText("-", i % cols * cw + cw / 2, (i / cols | 0) * ch + ch / 2 + 1);
            }
        }
        ctx.font = previousFont;
    }
    drawSplashes(t) {
        const { ctx, cw, ch, cols, rows } = this;
        if (this.splashes.length === 0 || cols === 0) return;
        ctx.font = `600 ${Math.round(ch * 0.7)}px ${this.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for(let si = this.splashes.length - 1; si >= 0; si--){
            const s = this.splashes[si];
            const age = t - s.t;
            if (age > SPLASH_LIFE) {
                this.splashes.splice(si, 1);
                continue;
            }
            if (age < 0) continue;
            const fade = 1 - age / SPLASH_LIFE;
            for(let ring = 0; ring < 3; ring++){
                const ringAge = age - ring * 0.11;
                if (ringAge <= 0) continue;
                const radiusPx = ringAge * 250 * this.rippleScale;
                const rCols = radiusPx / cw;
                const rRows = radiusPx / ch;
                const steps = Math.max(10, Math.round(Math.PI * 2 * Math.max(rCols, 1) * 0.9));
                for(let k = 0; k < steps; k++){
                    const a = k / steps * Math.PI * 2;
                    const cx = Math.round((s.x + Math.cos(a) * radiusPx) / cw);
                    const cy = Math.round((s.y + Math.sin(a) * radiusPx) / ch);
                    const innerX = Math.round((s.x + Math.cos(a) * radiusPx * 0.94) / cw);
                    const innerY = Math.round((s.y + Math.sin(a) * radiusPx * 0.94) / ch);
                    const alpha = (this.dark ? 0.55 : 0.42) * fade * (ring === 0 ? 1 : 1 - ring * 0.22);
                    ctx.fillStyle = this.dark ? `rgba(190, 232, 255, ${alpha.toFixed(3)})` : `rgba(30, 92, 140, ${alpha.toFixed(3)})`;
                    for (const [gc, gr] of [
                        [
                            cx,
                            cy
                        ],
                        [
                            innerX,
                            innerY
                        ]
                    ]){
                        if (gc < 0 || gr < 0 || gc >= cols || gr >= rows) continue;
                        ctx.fillText(RIPPLE_GLYPHS[ring], gc * cw + cw / 2, gr * ch + ch / 2 + 1);
                    }
                }
            }
            if (age < 0.55) {
                const dFade = 1 - age / 0.55;
                for(let d = 0; d < 5; d++){
                    const ang = d / 5 * Math.PI * 2 + s.x * 0.01;
                    const dist = age * 90 + 6;
                    const dc = Math.round((s.x + Math.cos(ang) * dist) / cw);
                    const dr = Math.round((s.y + Math.sin(ang) * dist) / ch);
                    if (dc < 0 || dr < 0 || dc >= cols || dr >= rows) continue;
                    const alpha = (this.dark ? 0.8 : 0.6) * dFade;
                    ctx.fillStyle = this.dark ? `rgba(226, 246, 255, ${alpha.toFixed(3)})` : `rgba(24, 78, 120, ${alpha.toFixed(3)})`;
                    ctx.fillText(DROP_GLYPHS[d % DROP_GLYPHS.length], dc * cw + cw / 2, dr * ch + ch / 2 + 1);
                }
            }
        }
    }
    drawHeat() {
        const { ctx, heat, cols, cw, ch } = this;
        for(let i = 0; i < heat.length; i++){
            const h = heat[i];
            if (h < 0.08) continue;
            const col = i % cols;
            const row = i / cols | 0;
            ctx.fillStyle = h > 0.5 ? `rgba(255,120,60,${h.toFixed(2)})` : `rgba(220,40,40,${(h * 1.6).toFixed(2)})`;
            ctx.fillText(h > 0.6 ? "*" : "·", col * cw + cw / 2, row * ch + ch / 2 + 1);
        }
    }
    drawDots(t) {
        const { ctx, cols, rows, cw, ch, dotKind, dotPhase, dotFreq, energy, sharkFlag, sharkShadow, fishStamp, frameId } = this;
        const { bucketOf, bucketOrder, bucketCounts } = this;
        const n = cols * rows;
        const SKIP = bucketCounts.length - 1;
        bucketCounts.fill(0);
        for(let i = 0; i < n; i++){
            const e = energy[i];
            const kind = dotKind[i];
            if (sharkFlag[i] || fishStamp[i] === frameId || kind === 0 && e < 0.45) {
                bucketOf[i] = SKIP;
                continue;
            }
            let bucket;
            if (e > 0.45) {
                const level = clamp(Math.floor((e - 0.45) * 5), 0, ALPHA_LEVELS - 1);
                bucket = WAKE * ALPHA_LEVELS + level;
            } else {
                const col = i % cols;
                const row = i / cols | 0;
                const twinkle = 0.5 + 0.5 * Math.sin(t * dotFreq[i] + dotPhase[i]);
                const caustic = 0.85 + 0.15 * Math.sin(col * 0.11 + t * 0.35) * Math.sin(row * 0.17 - t * 0.27);
                let v = clamp((0.55 + 0.45 * twinkle) * caustic + e * 2, 0, 1);
                if (sharkShadow[i]) v *= 0.2;
                bucket = (kind - 1) * ALPHA_LEVELS + clamp(Math.floor(v * ALPHA_LEVELS), 0, ALPHA_LEVELS - 1);
            }
            bucketOf[i] = bucket;
            bucketCounts[bucket]++;
        }
        const starts = new Int32Array(bucketCounts.length);
        for(let b = 1; b < bucketCounts.length; b++)starts[b] = starts[b - 1] + bucketCounts[b - 1];
        const cursor = starts.slice();
        for(let i = 0; i < n; i++){
            const b = bucketOf[i];
            if (b !== SKIP) bucketOrder[cursor[b]++] = i;
        }
        const small = Math.max(2, Math.round(cw * 0.19));
        const large = small + 1;
        for(let b = 0; b < SKIP; b++){
            const count = bucketCounts[b];
            if (!count) continue;
            ctx.fillStyle = this.dotStyles[b];
            const size = b >= WAKE * ALPHA_LEVELS ? large : small;
            const start = starts[b];
            for(let k = start; k < start + count; k++){
                const i = bucketOrder[k];
                const col = i % cols;
                const row = i / cols | 0;
                ctx.fillRect(Math.round(col * cw + cw * 0.66 - size / 2), Math.round(row * ch + ch * 0.64 - size / 2), size, size);
            }
        }
    }
}

module.exports = { paintGrid, AsciiRenderer };
};
__defs["./engine"] = function (module, exports, __req) {
const { AsciiRenderer } = __req("./renderer");
const { World } = __req("./world");
const STEP = 1 / 60;
const MAX_STEPS = 4;
class OceanEngine {
    canvas;
    world;
    renderer;
    raf = 0;
    last = 0;
    acc = 0;
    visible = true;
    hidden = false;
    lastFrame = 0;
    lastInput = 0;
    idleThrottle = true;
    fps;
    pointerEnabled;
    splashEnabled;
    sharkScale = 1;
    stoke = 0;
    stokeTarget = 0;
    reducedMotion;
    resizeObserver;
    intersectionObserver;
    disposed = false;
    constructor(canvas, options = {}){
        this.canvas = canvas;
        this.world = new World(options.sharks, options.fishCount);
        this.renderer = new AsciiRenderer(canvas, {
            transparent: options.transparent === true
        });
        this.renderer.setFontFamily(getComputedStyle(canvas).fontFamily);
        this.renderer.setFishScale(options.fishScale === undefined ? 1 : options.fishScale);
        this.renderer.setTheme(options.dark !== false);
        this.renderer.setRippleScale(options.rippleScale === undefined ? 0.7 : options.rippleScale);
        this.fps = options.fps === undefined ? 30 : options.fps;
        this.sharkScale = options.sharkScale !== undefined && Number.isFinite(options.sharkScale) && options.sharkScale > 0 ? options.sharkScale : 1;
        this.pointerEnabled = options.pointer !== false;
        this.splashEnabled = options.splash !== false;
        this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        this.lastInput = performance.now();
        this.idleThrottle = options.idleThrottle !== false;
        this.resizeObserver = new ResizeObserver(()=>this.resize());
        this.resizeObserver.observe(canvas);
        this.intersectionObserver = new IntersectionObserver(([entry])=>{
            this.visible = entry.isIntersecting;
            this.schedule();
        });
        this.intersectionObserver.observe(canvas);
        this.reducedMotion.addEventListener("change", this.onMotionPreference);
        document.addEventListener("visibilitychange", this.onVisibility);
        if (this.pointerEnabled) {
            window.addEventListener("pointermove", this.onPointerMove, {
                passive: true
            });
            window.addEventListener("pointerdown", this.onPointerDown, {
                passive: true
            });
            document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
            window.addEventListener("blur", this.onPointerLeave);
        }
        this.resize();
        if (this.sharkScale !== 1) this.world.scaleSharks(this.sharkScale);
        document.fonts?.load(`600 16px ${getComputedStyle(canvas).fontFamily}`).then(()=>{
            if (!this.disposed && this.reducedMotion.matches) this.drawStill();
        });
        this.schedule();
    }
    setFps(fps) {
        this.fps = Math.max(0, fps);
    }
    setFishScale(scale) {
        this.renderer.setFishScale(scale);
    }
    setRippleScale(scale) {
        this.renderer.setRippleScale(scale);
    }
    setTheme(dark) {
        this.renderer.setTheme(dark !== false);
    }
    setIdleThrottle(on) {
        this.idleThrottle = on === true;
        if (!this.idleThrottle) this.schedule();
    }
    setStoke(value) {
        this.stokeTarget = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    }
    setSharkScale(scale) {
        const next = Number.isFinite(scale) && scale > 0 ? scale : 1;
        const ratio = next / this.sharkScale;
        this.sharkScale = next;
        this.world.scaleSharks(ratio);
    }
    setPointerEnabled(enabled) {
        if (enabled === this.pointerEnabled) return;
        this.pointerEnabled = enabled;
        if (enabled) {
            window.addEventListener("pointermove", this.onPointerMove, {
                passive: true
            });
            window.addEventListener("pointerdown", this.onPointerDown, {
                passive: true
            });
            document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
            window.addEventListener("blur", this.onPointerLeave);
        } else {
            window.removeEventListener("pointermove", this.onPointerMove);
            window.removeEventListener("pointerdown", this.onPointerDown);
            document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
            window.removeEventListener("blur", this.onPointerLeave);
            this.world.pointer.active = false;
        }
    }
    destroy() {
        this.disposed = true;
        cancelAnimationFrame(this.raf);
        this.resizeObserver.disconnect();
        this.intersectionObserver.disconnect();
        this.reducedMotion.removeEventListener("change", this.onMotionPreference);
        document.removeEventListener("visibilitychange", this.onVisibility);
        window.removeEventListener("pointermove", this.onPointerMove);
        window.removeEventListener("pointerdown", this.onPointerDown);
        document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
        window.removeEventListener("blur", this.onPointerLeave);
    }
    resize() {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        const raw = Math.min(window.devicePixelRatio || 1, 2);
        const budget = 7_000_000;
        const area = Math.max(1, rect.width * rect.height);
        const dpr = Math.max(1, Math.min(raw, Math.sqrt(budget / area)));
        this.renderer.resize(rect.width, rect.height, dpr);
        this.world.resize(rect.width, rect.height, this.renderer.cellWidth, this.renderer.cellHeight);
        if (this.reducedMotion.matches) this.drawStill();
    }
    schedule() {
        cancelAnimationFrame(this.raf);
        if (this.disposed || !this.visible || this.hidden || this.reducedMotion.matches) return;
        this.last = performance.now();
        this.raf = requestAnimationFrame(this.frame);
    }
    frame = (now)=>{
        const idle = this.idleThrottle && this.stokeTarget < 0.02 && now - this.lastInput > 4000;
        const fps = idle ? Math.min(this.fps, 12) : this.fps;
        if (fps > 0 && now - this.lastFrame < 1000 / fps - 0.6) {
            this.raf = requestAnimationFrame(this.frame);
            return;
        }
        this.lastFrame = now;
        const dt = Math.min(0.1, (now - this.last) / 1000);
        this.last = now;
        this.stoke += (this.stokeTarget - this.stoke) * Math.min(1, dt * 5);
        this.renderer.setStoke(this.stoke);
        this.world.setArousal(this.stoke);
        const stepSize = STEP * (1 + this.stoke * 0.55);
        this.acc += dt;
        let steps = 0;
        while(this.acc >= stepSize && steps < MAX_STEPS){
            this.world.step(stepSize);
            this.acc -= stepSize;
            steps++;
        }
        if (steps === MAX_STEPS) this.acc = 0;
        this.renderer.render(this.world, dt);
        this.raf = requestAnimationFrame(this.frame);
    };
    drawStill() {
        this.renderer.setStoke(this.stoke);
        this.world.setArousal(this.stoke);
        if (this.world.time < 4) {
            for(let i = 0; i < 240; i++)this.world.step(STEP);
        }
        this.renderer.render(this.world, STEP);
    }
    onMotionPreference = ()=>{
        if (this.reducedMotion.matches) {
            cancelAnimationFrame(this.raf);
            this.drawStill();
        } else {
            this.schedule();
        }
    };
    onVisibility = ()=>{
        this.hidden = document.visibilityState === "hidden";
        if (this.hidden) cancelAnimationFrame(this.raf);
        else this.schedule();
    };
    toLocal(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
        return {
            x,
            y,
            inside
        };
    }
    onPointerMove = (e)=>{
        this.lastInput = performance.now();
        const { x, y, inside } = this.toLocal(e);
        const p = this.world.pointer;
        p.x = x;
        p.y = y;
        p.active = inside && e.pointerType !== "touch";
    };
    onPointerDown = (e)=>{
        this.lastInput = performance.now();
        const { x, y, inside } = this.toLocal(e);
        if (inside && this.splashEnabled && !this.reducedMotion.matches) this.world.splash(x, y);
    };
    onPointerLeave = ()=>{
        this.world.pointer.active = false;
    };
}

module.exports = { OceanEngine };
};
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

  },
});
