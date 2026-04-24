(function () {
    const themeBtn = document.getElementById('theme-btn');
    const themeIcon = document.getElementById('themeIcon');
    const html = document.documentElement;

    themeBtn.addEventListener('click', () => {
        const dark = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', dark ? 'light' : 'dark');
        themeIcon.className = dark ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
        initSnakes();
    });

    const canvas = document.getElementById('snake-canvas');
    const ctx = canvas.getContext('2d');
    let W, H, CELL, COLS, ROWS, snakes, raf;

    function isDark() { return html.getAttribute('data-theme') === 'dark'; }

    const SNAKE_PALETTES_LIGHT = [
        { head: '#2e7da6', body: '#5da3c8', score: '#1a5272' },
        { head: '#5a8f6e', body: '#82b894', score: '#2e5a3c' },
        { head: '#8f5a7a', body: '#b882a0', score: '#5a2e4a' },
        { head: '#a06030', body: '#c88a58', score: '#6a3a10' },
        { head: '#4a6aaa', body: '#7a96cc', score: '#1e3d7a' },
        { head: '#7a8a30', body: '#a0b050', score: '#4a5a10' },
    ];
    const SNAKE_PALETTES_DARK = [
        { head: '#4ac8f0', body: '#2a8aaa', score: '#8ae0ff' },
        { head: '#4af0a0', body: '#2aaa6a', score: '#8affd4' },
        { head: '#f04a9a', body: '#aa2a6a', score: '#ff8ad0' },
        { head: '#f0b84a', body: '#aa7a2a', score: '#ffd890' },
        { head: '#9a6af0', body: '#6a3aaa', score: '#caaeff' },
        { head: '#4af0e0', body: '#2aaaa0', score: '#8afff8' },
    ];

    function palettes() { return isDark() ? SNAKE_PALETTES_DARK : SNAKE_PALETTES_LIGHT; }
    function bgColor() { return isDark() ? '#0d1b24' : '#d4e6f0'; }
    function gridColor() { return isDark() ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'; }
    function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

    class Snake {
        constructor(paletteIdx) { this.paletteIdx = paletteIdx; this.score = rnd(0, 99); this.reset(true); }
        reset(first = false) {
            const pal = palettes()[this.paletteIdx % palettes().length];
            this.pal = pal; this.length = rnd(8, 28);
            this.cx = rnd(0, COLS - 1); this.cy = rnd(0, ROWS - 1);
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            [this.dx, this.dy] = dirs[rnd(0, 3)];
            this.body = [];
            for (let i = 0; i < this.length; i++) this.body.push({ cx: ((this.cx - this.dx * i) + COLS) % COLS, cy: ((this.cy - this.dy * i) + ROWS) % ROWS });
            this.interval = rnd(3, 9); this.tick = 0; this.turnChance = 0.14 + Math.random() * 0.2;
            this.dead = false; this.age = 0; this.maxAge = rnd(200, 600);
            this.scoreTimer = 0; this.showScore = false;
        }
        eat() {
            this.score = Math.min(99, this.score + rnd(1, 3));
            this.showScore = true; this.scoreTimer = 60;
            const tail = this.body[this.body.length - 1];
            this.body.push({ ...tail }); this.length++;
        }
        update() {
            this.tick++;
            if (this.scoreTimer > 0) this.scoreTimer--;
            if (this.scoreTimer === 0) this.showScore = false;
            if (this.tick < this.interval) return;
            this.tick = 0; this.age++;
            if (Math.random() < this.turnChance) {
                if (this.dx !== 0) { this.dy = Math.random() < 0.5 ? -1 : 1; this.dx = 0; }
                else { this.dx = Math.random() < 0.5 ? -1 : 1; this.dy = 0; }
            }
            const nx = ((this.body[0].cx + this.dx) + COLS) % COLS;
            const ny = ((this.body[0].cy + this.dy) + ROWS) % ROWS;
            this.body.unshift({ cx: nx, cy: ny }); this.body.pop();
            if (Math.random() < 0.008) this.eat();
            if (this.age > this.maxAge) this.dead = true;
        }
        draw() {
            const pal = palettes()[this.paletteIdx % palettes().length];
            const fade = Math.min(1, Math.min(this.age / 40, (this.maxAge - this.age) / 40));
            const cs = CELL - 1;
            for (let i = this.body.length - 1; i >= 0; i--) {
                const { cx, cy } = this.body[i];
                const px = cx * CELL, py = cy * CELL, isHead = i === 0;
                const yFade = Math.max(0, 1 - (py / H) * 2.5);
                const t = i / this.body.length;
                const segAlpha = fade * yFade * (isHead ? 1 : 0.85 - t * 0.5);
                if (segAlpha < 0.02) continue;
                ctx.globalAlpha = segAlpha;
                ctx.fillStyle = isHead ? pal.head : pal.body;
                ctx.fillRect(px + 1, py + 1, cs - 1, cs - 1);
                if (isHead && CELL >= 8) {
                    ctx.fillStyle = '#ffffff';
                    const eyeSize = Math.max(1, CELL * 0.18);
                    const ex = px + cs * 0.3 + (this.dx > 0 ? cs * 0.35 : 0);
                    const ey = py + cs * 0.3 + (this.dy > 0 ? cs * 0.35 : 0);
                    ctx.fillRect(ex, ey, eyeSize, eyeSize);
                    ctx.fillRect(ex + (this.dy !== 0 ? cs * 0.3 : 0), ey + (this.dx !== 0 ? cs * 0.3 : 0), eyeSize, eyeSize);
                }
            }
            ctx.globalAlpha = 1;
            const headX = this.body[0].cx * CELL, headY = this.body[0].cy * CELL;
            const yFadeHead = Math.max(0, 1 - (headY / H) * 2.5);
            if (yFadeHead > 0.1 && fade > 0.3) {
                const scoreText = this.score.toString().padStart(2, '0');
                const fontSize = Math.max(8, CELL * 0.85);
                ctx.font = `bold ${fontSize}px monospace`;
                ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                let labelX = headX + CELL + 2, labelY = headY - CELL * 0.5;
                if (labelX + 28 > W) labelX = headX - 30;
                if (labelY < 2) labelY = 2;
                ctx.globalAlpha = fade * yFadeHead * 0.85;
                ctx.fillStyle = pal.score;
                ctx.fillText(scoreText, labelX, labelY);
                if (this.showScore && this.scoreTimer > 0) {
                    const popAlpha = (this.scoreTimer / 60) * fade * yFadeHead;
                    ctx.globalAlpha = popAlpha;
                    ctx.font = `bold ${Math.max(9, CELL)}px monospace`;
                    ctx.fillStyle = pal.head;
                    ctx.fillText('+' + rnd(1, 3), headX, headY - CELL * 1.5);
                }
                ctx.globalAlpha = 1;
            }
        }
    }

    class Food {
        constructor() { this.respawn(); }
        respawn() {
            this.cx = rnd(0, COLS - 1); this.cy = rnd(0, Math.floor(ROWS * 0.55));
            this.life = rnd(300, 900); this.age = 0;
        }
        update() { this.age++; if (this.age > this.life) this.respawn(); }
        draw() {
            const px = this.cx * CELL + CELL / 2, py = this.cy * CELL + CELL / 2;
            const yFade = Math.max(0, 1 - (py / H) * 2.5);
            const pulse = 0.5 + 0.5 * Math.sin(this.age * 0.12);
            const r = CELL * 0.22 + pulse * CELL * 0.1;
            ctx.globalAlpha = yFade * 0.7 * pulse;
            ctx.fillStyle = isDark() ? 'rgba(255,255,255,0.6)' : 'rgba(40,100,150,0.5)';
            ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    function initSnakes() {
        cancelAnimationFrame(raf);
        W = canvas.parentElement.offsetWidth;
        H = canvas.parentElement.offsetHeight;
        canvas.width = W; canvas.height = H;
        CELL = 14;
        COLS = Math.ceil(W / CELL); ROWS = Math.ceil(H / CELL);
        const numSnakes = Math.max(6, Math.floor((COLS * ROWS) / 80));
        snakes = Array.from({ length: numSnakes }, (_, i) => new Snake(i));
        const numFood = Math.max(4, Math.floor(COLS / 5));
        const foods = Array.from({ length: numFood }, () => new Food());
        function frame() {
            ctx.fillStyle = bgColor(); ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = gridColor();
            for (let c = 0; c <= COLS; c++) for (let r = 0; r <= ROWS; r++) ctx.fillRect(c * CELL - 0.5, r * CELL - 0.5, 1, 1);
            for (const f of foods) { f.update(); f.draw(); }
            for (const s of snakes) {
                if (s.dead) { s.reset(); s.pal = palettes()[s.paletteIdx % palettes().length]; }
                s.update(); s.draw();
            }
            raf = requestAnimationFrame(frame);
        }
        frame();
    }

    window.addEventListener('load', initSnakes);
    window.addEventListener('resize', initSnakes);
})();

(function () {
    const cv = document.getElementById('fighters-canvas');
    const ct = cv.getContext('2d');
    const DPR = devicePixelRatio || 1;
    const HTML = document.documentElement;

    function resizeFighters() {
        const wrap = document.getElementById('fighters-wrap');
        const W0 = wrap.offsetWidth;
        const H0 = wrap.offsetHeight;
        cv.width = W0 * DPR;
        cv.height = H0 * DPR;
        cv.style.width = W0 + 'px';
        cv.style.height = H0 + 'px';
        ct.setTransform(DPR, 0, 0, DPR, 0, 0);
        return { W: W0, H: H0 };
    }

    let dims = resizeFighters();
    let W = dims.W, H = dims.H;
    let FL = H - 1;

    const EMOJIS = ['🥴', '😵‍💫', '💀', '🥸', '🥶'];

    function isDark() { return HTML.getAttribute('data-theme') === 'dark'; }
    function sc() { return isDark() ? '#c8d8e4' : '#1a2a35'; }
    function sw() { return isDark() ? '#e0f0ff' : '#2c3e50'; }
    function shCol() { return isDark() ? '#3a5568' : '#8aaabb'; }

    let freezeTimer = 0;
    let lightnings = [];
    let lightningTimer = 0;

    const escapingFighters = [];

    function spawnEscapingFighter(fighter) {
        const rect = cv.getBoundingClientRect();
        const vpX = rect.left + fighter.x;
        const vpY = rect.top + fighter.y;

        const ghost = document.createElement('canvas');
        ghost.width = 80;
        ghost.height = 80;
        ghost.style.cssText = [
            'position:fixed',
            'pointer-events:none',
            'z-index:99998',
            `left:${vpX - 40}px`,
            `top:${vpY - 80}px`,
            'transform-origin:center bottom',
            'will-change:transform,opacity',
        ].join(';');
        document.body.appendChild(ghost);

        escapingFighters.push({
            el: ghost,
            x: vpX,
            y: vpY - 80,
            vx: (Math.random() - 0.5) * 3,
            vy: -8 - Math.random() * 5,
            rot: 0,
            rotV: (Math.random() - 0.5) * 6,
            gy: 0.18,
            a: 1,
            dir: fighter.dir,
            tick: 0,
            state: fighter.state,
            crouchAmt: fighter.crouchAmt,
            swordDraw: fighter.swordDraw,
            swingT: fighter.swingT,
            punchT: fighter.punchT,
        });
    }

    function _drawFighterOnCtx(gct, GW, GH, dir, state, crouchAmt, swordDraw, swingT, punchT, tick, alpha) {
        const bx = GW / 2;
        const FL_g = GH - 4;
        const bh = 28 + (1 - crouchAmt) * 18;
        const hy = FL_g - bh;
        const tb = FL_g - bh * 0.38;
        const tm = FL_g - bh * 0.62;
        const hr = 9;

        gct.save();
        gct.globalAlpha = alpha;
        const col = sc();
        gct.strokeStyle = col; gct.fillStyle = col;
        gct.lineWidth = 2.4; gct.lineCap = 'round'; gct.lineJoin = 'round';

        gct.beginPath(); gct.arc(bx, hy, hr, 0, Math.PI * 2); gct.stroke();
        gct.beginPath(); gct.moveTo(bx, hy + hr); gct.lineTo(bx, tb); gct.stroke();
        const bob = (state === 'walk' || state === 'dash') ? Math.sin(tick * 0.28) * 9 : 0;
        const kS = 12 + crouchAmt * 16, kR = crouchAmt * 14;
        gct.beginPath(); gct.moveTo(bx, tb); gct.lineTo(bx - kS + bob * .5, FL_g - 10 - kR); gct.lineTo(bx - 10 + bob * .3, FL_g); gct.stroke();
        gct.beginPath(); gct.moveTo(bx, tb); gct.lineTo(bx + kS - bob * .5, FL_g - 10 - kR); gct.lineTo(bx + 10 - bob * .3, FL_g); gct.stroke();
        gct.fillRect(bx + dir * 3 - 1, hy - 4, 2, 2);
        gct.fillRect(bx + dir * 6 - 1, hy - 4, 2, 2);

        const al = 17;
        const ps = Math.sin(punchT * Math.PI);
        const sd = swordDraw;
        const hipX = bx + dir * 8, hipY = tb + 2;
        const restArmAng = -0.2;
        const attackArmAng = dir * (0.2 + swingT * 2.6);
        const swordArmAng = restArmAng + (attackArmAng - restArmAng) * sd;
        const swordArmX = bx + Math.sin(swordArmAng) * al;
        const swordArmY = tm - Math.cos(swordArmAng) * al;
        const armTipX = hipX + (swordArmX - hipX) * sd + (hipX - bx) * (1 - sd) * 0.3;
        const armTipY = hipY + (swordArmY - hipY) * sd;
        let la, ra;
        if (state === 'punch') { la = -0.4; ra = dir * (0.3 + ps * 1.4); }
        else if (state === 'sword_slash') { if (dir > 0) { ra = swordArmAng; la = -0.5; } else { la = swordArmAng; ra = 0.5; } }
        else if (state === 'block') { la = dir * 0.7; ra = dir * 0.5; }
        else if (state === 'dash' || state === 'crouch_ready') { la = dir * -1.0; ra = dir * 1.1; }
        else if (state === 'knockback' || state === 'parry_stun' || state === 'hit') { la = 1.3; ra = -1.3; }
        else { const id = Math.sin(tick * .08) * .15; if (dir > 0) { la = -0.3 + id; ra = restArmAng; } else { ra = 0.3 - id; la = restArmAng; } }

        const lx = bx + Math.sin(la) * al, ly = tm - Math.cos(la) * al;
        gct.beginPath(); gct.moveTo(bx, tm); gct.lineTo(lx, ly); gct.stroke();
        gct.beginPath(); gct.moveTo(bx, tm); gct.lineTo(armTipX, armTipY); gct.stroke();

        gct.save(); gct.lineCap = 'round';
        const sheathAng = Math.atan2(4, -dir * 14);
        const attackAng2 = Math.atan2(armTipY - tm, armTipX - bx);
        const ox = hipX + (armTipX - hipX) * sd;
        const oy = hipY + (armTipY - hipY) * sd;
        const ang = sheathAng + (attackAng2 - sheathAng) * sd;
        const sLen = 26 + sd * 6;
        const tipX = ox + Math.cos(ang) * sLen, tipY = oy + Math.sin(ang) * sLen;
        if (sd < 0.9) {
            gct.lineWidth = 3.6; gct.strokeStyle = shCol();
            const scabbardLen = sLen * (1 - sd * 0.85);
            gct.beginPath(); gct.moveTo(hipX, hipY); gct.lineTo(hipX + Math.cos(sheathAng) * scabbardLen, hipY + Math.sin(sheathAng) * scabbardLen); gct.stroke();
        }
        gct.lineWidth = 2.1; gct.strokeStyle = sw();
        gct.beginPath(); gct.moveTo(ox, oy); gct.lineTo(tipX, tipY); gct.stroke();
        const gA2 = ang + Math.PI / 2;
        gct.lineWidth = 2;
        gct.beginPath(); gct.moveTo(ox + Math.cos(gA2) * 6, oy + Math.sin(gA2) * 6); gct.lineTo(ox - Math.cos(gA2) * 6, oy - Math.sin(gA2) * 6); gct.stroke();
        gct.lineWidth = 2.4;
        gct.beginPath(); gct.moveTo(ox, oy); gct.lineTo(ox - Math.cos(ang) * 6, oy - Math.sin(ang) * 6); gct.stroke();
        gct.restore();

        gct.restore();
    }

    function updateEscapingFighters() {
        for (let i = escapingFighters.length - 1; i >= 0; i--) {
            const g = escapingFighters[i];
            g.tick++;
            g.x += g.vx;
            g.y += g.vy;
            g.vy += g.gy;
            g.rot += g.rotV;
            const elapsed = g.tick;
            if (elapsed > 30) g.a = Math.max(0, 1 - (elapsed - 30) / 60);
            if (g.a <= 0 || g.y < -200) { g.el.remove(); escapingFighters.splice(i, 1); continue; }

            g.el.style.left = (g.x - 40) + 'px';
            g.el.style.top = g.y + 'px';
            g.el.style.opacity = g.a;
            g.el.style.transform = `rotate(${g.rot}deg)`;

            const gct = g.el.getContext('2d');
            gct.clearRect(0, 0, 80, 80);
            _drawFighterOnCtx(gct, 80, 80, g.dir, g.state, g.crouchAmt, g.swordDraw, g.swingT, g.punchT, g.tick, 1);
        }
    }

    const _aboveCanvas = new WeakMap();

    function maybeEscape(fighter) {
        const above = fighter.headY < 0 && !fighter.onGround;
        if (above && !_aboveCanvas.get(fighter)) {
            _aboveCanvas.set(fighter, true);
            spawnEscapingFighter(fighter);
        }
        if (!above) _aboveCanvas.set(fighter, false);
    }

    const flyEs = [];
    function burstEmoji(cx2, cy2) {
        const rect = cv.getBoundingClientRect();
        const sx = rect.left + cx2, sy = rect.top + cy2;
        const sizes = [14, 20, 28, 36, 16, 32, 22, 40, 12, 26];
        for (let i = 0; i < 9; i++) {
            const el = document.createElement('div');
            el.className = 'fight-emoji';
            el.style.fontSize = sizes[i % sizes.length] + 'px';
            el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
            el.style.left = sx + 'px'; el.style.top = sy + 'px';
            document.body.appendChild(el);
            flyEs.push({ el, x: sx, y: sy, vx: (Math.random() - .5) * 22, vy: Math.random() * -16 - 4, rot: Math.random() * 360, rotV: (Math.random() - .5) * 14, g: 0.52, a: 1 });
        }
    }
    function updateFlyEs() {
        const vh = window.innerHeight;
        for (let i = flyEs.length - 1; i >= 0; i--) {
            const p = flyEs[i];
            p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += p.rotV;
            if (p.y > vh + 60) { p.el.remove(); flyEs.splice(i, 1); continue; }
            if (p.y > vh - 50) p.a = Math.max(0, 1 - (p.y - (vh - 50)) / 90);
            p.el.style.transform = `translate(-50%,-50%) rotate(${p.rot}deg)`;
            p.el.style.left = p.x + 'px'; p.el.style.top = p.y + 'px'; p.el.style.opacity = p.a;
        }
    }

    let parts = [];
    function burstNormal(x, y, n, cols) {
        for (let i = 0; i < n; i++)
            parts.push({ x, y, vx: (Math.random() - .5) * 7, vy: Math.random() * -6 - 2, life: 45, max: 45, col: cols[Math.floor(Math.random() * cols.length)], r: 2 + Math.random() * 3 });
    }
    function drawParts() {
        parts = parts.filter(p => p.life > 0);
        for (const p of parts) {
            p.x += p.vx; p.y += p.vy; p.vy += 0.32; p.life--;
            ct.globalAlpha = Math.max(0, p.life / p.max);
            ct.fillStyle = p.col;
            ct.beginPath(); ct.arc(p.x, p.y, p.r, 0, Math.PI * 2); ct.fill();
        }
        ct.globalAlpha = 1;
    }

    function makeLightning(x1, y1, x2, y2, segs) {
        const pts = [{ x: x1, y: y1 }];
        for (let i = 1; i < segs; i++) {
            const t = i / segs;
            pts.push({ x: x1 + (x2 - x1) * t + ((Math.random() - .5) * 22), y: y1 + (y2 - y1) * t + ((Math.random() - .5) * 22) });
        }
        pts.push({ x: x2, y: y2 });
        return pts;
    }
    function spawnLightnings(cx, cy) {
        lightnings = [];
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 / 8) * i + Math.random() * 0.4;
            const len = 18 + Math.random() * 22;
            lightnings.push({ pts: makeLightning(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len, 4 + Math.floor(Math.random() * 3)), life: 1 });
        }
    }
    function drawLightnings(alpha) {
        if (!lightnings.length) return;
        ct.save(); ct.globalAlpha = alpha;
        for (const bolt of lightnings) {
            const pts = bolt.pts;
            ct.beginPath(); ct.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ct.lineTo(pts[i].x, pts[i].y);
            ct.strokeStyle = isDark() ? '#aaeeff' : '#ffee44';
            ct.lineWidth = 1.5; ct.lineCap = 'round'; ct.lineJoin = 'round'; ct.stroke();
            ct.beginPath(); ct.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ct.lineTo(pts[i].x, pts[i].y);
            ct.strokeStyle = '#ffffff'; ct.lineWidth = 0.5; ct.stroke();
        }
        ct.restore();
    }

    class Fighter {
        constructor(x, dir) {
            this.x = x; this.y = FL; this.dir = dir;
            this.vx = 0; this.vy = 0; this.onGround = true;
            this.state = 'idle'; this.timer = 0; this.tick = 0;
            this.crouchAmt = 0; this.flash = 0;
            this.swingT = 0; this.punchT = 0; this.swordDraw = 0;
        }
        get crouching() { return this.crouchAmt > 0.45; }
        get bh() { return 28 + (1 - this.crouchAmt) * 18; }
        get headY() { return this.y - this.bh; }
        get torsoBot() { return this.y - this.bh * 0.38; }
        get torsoMid() { return this.y - this.bh * 0.62; }
        ss(s, t) { this.state = s; this.timer = t; this.tick = 0; }

        update(other) {
            if (freezeTimer > 0) return;
            this.tick++; if (this.flash > 0) this.flash--;
            const wc = (this.state === 'crouch_ready') ? 1 : 0;
            this.crouchAmt += (wc - this.crouchAmt) * 0.2;
            const wantDraw = (this.state === 'sword_slash') ? 1 : 0;
            this.swordDraw += (wantDraw - this.swordDraw) * (wantDraw ? 0.22 : 0.07);
            if (!this.onGround) { this.vy += 0.6; this.y += this.vy; if (this.y >= FL) { this.y = FL; this.vy = 0; this.onGround = true; } }
            this.timer--;
            const d = other.x - this.x, dist = Math.abs(d);
            this.dir = d > 0 ? 1 : -1;
            switch (this.state) {
                case 'idle':
                    this.vx *= 0.6;
                    if (this.timer <= 0) this._decide(other, dist);
                    break;
                case 'walk':
                    this.vx = this.dir * 2.5;
                    if (dist < 65 || this.timer <= 0) this.ss('idle', 6);
                    break;
                case 'crouch_ready':
                    this.vx *= 0.3;
                    if (this.timer <= 0) { this.ss('dash', 35); this.vx = this.dir * 18; }
                    break;
                case 'dash':
                    this.vx += this.dir * 2;
                    this.vx = Math.sign(this.vx) * Math.min(Math.abs(this.vx), 18);
                    if (this.timer <= 0) { this.vx *= 0.2; this.ss('idle', 12); }
                    break;
                case 'punch':
                    this.vx *= 0.5;
                    this.punchT = 1 - Math.max(0, this.timer) / 24;
                    if (this.timer === 10) this._hitCheck(other, 65, ['#ff6644', '#ffaa22']);
                    if (this.timer <= 0) { this.punchT = 0; this.ss('idle', 10); }
                    break;
                case 'sword_slash':
                    this.vx *= 0.5;
                    this.swingT = 1 - Math.max(0, this.timer) / 28;
                    if (this.timer === 12) this._hitCheck(other, 80, ['#ccddff', '#aaddff', '#fff']);
                    if (this.timer <= 0) { this.swingT = 0; this.ss('idle', 12); }
                    break;
                case 'block':
                    this.vx *= 0.5;
                    if (this.timer <= 0) this.ss('idle', 8);
                    break;
                case 'hit':
                    this.vx *= 0.80;
                    if (this.timer <= 0) this.ss('idle', 10);
                    break;
                case 'knockback':
                    this.vx *= 0.83;
                    if (this.timer <= 0) this.ss('idle', 14);
                    break;
                case 'parry_stun':
                    this.vx *= 0.85;
                    if (this.onGround) this.vx *= 0.88;
                    if (this.timer <= 0) this.ss('idle', 8);
                    break;
                case 'taunt':
                    this.vx *= 0.5;
                    if (this.timer <= 0) this.ss('idle', 6);
                    break;
            }
            this.x += this.vx;
            this.x = Math.max(18, Math.min(W - 18, this.x));
        }

        _decide(other, dist) {
            if (dist > 200) { this.ss('walk', 20); return; }
            const r = Math.random();
            if (r < 0.42) { this.ss('crouch_ready', 10 + Math.random() * 8 | 0); }
            else if (r < 0.78) { this.ss('dash', 35); this.vx = this.dir * 18; }
            else if (r < 0.84) { this.ss('punch', 24); }
            else if (r < 0.91) { this.ss('sword_slash', 28); }
            else if (r < 0.95) { this.ss('block', 14); }
            else { this.ss('taunt', 12); }
        }

        _hitCheck(other, range, cols) {
            if (Math.abs(other.x - this.x) > range) return;
            if (other.state === 'knockback' || other.state === 'parry_stun' || other.state === 'hit') return;
            if (other.state === 'block' && Math.random() < 0.5) {
                burstNormal((this.x + other.x) / 2, this.torsoMid, 5, ['#ccc', '#aaa']);
                this.ss('knockback', 20); this.vx = -this.dir * 9; this.vy = -3; this.onGround = false; return;
            }
            other.flash = 16; other.ss('hit', 20);
            other.vx = -this.dir * 28; other.vy = -7; other.onGround = false;
            burstNormal((this.x + other.x) / 2, other.torsoMid - 10, 10, cols);
        }

        draw() {
            ct.save();
            const col = (this.flash > 0 && Math.floor(this.flash / 2) % 2 === 0) ? '#fff' : sc();
            ct.strokeStyle = col; ct.fillStyle = col; ct.lineWidth = 2.4; ct.lineCap = 'round'; ct.lineJoin = 'round';
            const bx = this.x, hy = this.headY, tb = this.torsoBot, tm = this.torsoMid, hr = 9;
            ct.beginPath(); ct.arc(bx, hy, hr, 0, Math.PI * 2); ct.stroke();
            ct.beginPath(); ct.moveTo(bx, hy + hr); ct.lineTo(bx, tb); ct.stroke();
            const bob = (this.state === 'walk' || this.state === 'dash') ? Math.sin(this.tick * 0.28) * 9 : 0;
            const kS = 12 + this.crouchAmt * 16, kR = this.crouchAmt * 14;
            ct.beginPath(); ct.moveTo(bx, tb); ct.lineTo(bx - kS + bob * .5, this.y - 10 - kR); ct.lineTo(bx - 10 + bob * .3, this.y); ct.stroke();
            ct.beginPath(); ct.moveTo(bx, tb); ct.lineTo(bx + kS - bob * .5, this.y - 10 - kR); ct.lineTo(bx + 10 - bob * .3, this.y); ct.stroke();
            ct.fillRect(bx + this.dir * 3 - 1, hy - 4, 2, 2);
            ct.fillRect(bx + this.dir * 6 - 1, hy - 4, 2, 2);
            this._drawArmsAndSword(bx, tm, tb, hy);
            ct.restore();
        }

        _drawArmsAndSword(bx, tm, tb, hy) {
            const D = this.dir, al = 17;
            const ps = Math.sin(this.punchT * Math.PI);
            const sd = this.swordDraw;
            const hipX = bx + D * 8, hipY = tb + 2;
            const restArmAng = -0.2;
            const attackArmAng = D * (0.2 + this.swingT * 2.6);
            const swordArmAng = restArmAng + (attackArmAng - restArmAng) * sd;
            const swordArmX = bx + Math.sin(swordArmAng) * al;
            const swordArmY = tm - Math.cos(swordArmAng) * al;
            const armTipX = hipX + (swordArmX - hipX) * sd + (hipX - bx) * (1 - sd) * 0.3;
            const armTipY = (hipY) + (swordArmY - hipY) * sd;
            let la, ra;
            if (this.state === 'punch') { la = -0.4; ra = D * (0.3 + ps * 1.4); }
            else if (this.state === 'sword_slash') { if (D > 0) { ra = swordArmAng; la = -0.5; } else { la = swordArmAng; ra = 0.5; } }
            else if (this.state === 'block') { la = D * 0.7; ra = D * 0.5; }
            else if (this.state === 'dash' || this.state === 'crouch_ready') { la = D * -1.0; ra = D * 1.1; }
            else if (this.state === 'knockback' || this.state === 'parry_stun' || this.state === 'hit') { la = 1.3; ra = -1.3; }
            else {
                const id = Math.sin(this.tick * .08) * .15;
                if (D > 0) { la = -0.3 + id; ra = restArmAng; }
                else { ra = 0.3 - id; la = restArmAng; }
            }
            const lx = bx + Math.sin(la) * al, ly = tm - Math.cos(la) * al;
            ct.beginPath(); ct.moveTo(bx, tm); ct.lineTo(lx, ly); ct.stroke();
            ct.beginPath(); ct.moveTo(bx, tm); ct.lineTo(armTipX, armTipY); ct.stroke();
            ct.save(); ct.lineCap = 'round';
            const sheathAng = Math.atan2(4, -D * 14);
            const attackAng = Math.atan2(armTipY - tm, armTipX - bx);
            const ox = hipX + (armTipX - hipX) * sd;
            const oy = hipY + (armTipY - hipY) * sd;
            const ang = sheathAng + (attackAng - sheathAng) * sd;
            const sLen = 26 + sd * 6;
            const tipX = ox + Math.cos(ang) * sLen, tipY = oy + Math.sin(ang) * sLen;
            if (sd < 0.9) {
                ct.lineWidth = 3.6; ct.strokeStyle = shCol();
                const scabbardLen = sLen * (1 - sd * 0.85);
                ct.beginPath(); ct.moveTo(hipX, hipY); ct.lineTo(hipX + Math.cos(sheathAng) * scabbardLen, hipY + Math.sin(sheathAng) * scabbardLen); ct.stroke();
            }
            ct.lineWidth = 2.1; ct.strokeStyle = sw();
            ct.beginPath(); ct.moveTo(ox, oy); ct.lineTo(tipX, tipY); ct.stroke();
            const gA = ang + Math.PI / 2;
            ct.lineWidth = 2;
            ct.beginPath(); ct.moveTo(ox + Math.cos(gA) * 6, oy + Math.sin(gA) * 6); ct.lineTo(ox - Math.cos(gA) * 6, oy - Math.sin(gA) * 6); ct.stroke();
            ct.lineWidth = 2.4;
            ct.beginPath(); ct.moveTo(ox, oy); ct.lineTo(ox - Math.cos(ang) * 6, oy - Math.sin(ang) * 6); ct.stroke();
            ct.restore();
        }
    }

    let fA = new Fighter(W * 0.3, 1);
    let fB = new Fighter(W * 0.7, -1);
    let parryCd = 0, parryFlashX = 0, parryFlashY = 0, parryFlashTimer = 0;

    function checkParry() {
        parryCd = Math.max(0, parryCd - 1);
        if (fA.state === 'dash' && fB.state === 'dash' && parryCd === 0 && Math.abs(fA.x - fB.x) < 70) {
            parryCd = 18;
            const cx = (fA.x + fB.x) / 2, cy = (fA.torsoMid + fB.torsoMid) / 2;
            freezeTimer = 30 + Math.floor(Math.random() * 30);
            parryFlashX = cx; parryFlashY = cy; parryFlashTimer = freezeTimer;
            burstEmoji(cx, cy);
            burstNormal(cx, cy, 16, ['#ffee44', '#ffffff', '#aaeeff', '#ffaa00']);
            spawnLightnings(cx, cy);
            fA.ss('parry_stun', 70); fA.vx = -fA.dir * 32; fA.vy = -8; fA.onGround = false;
            fB.ss('parry_stun', 70); fB.vx = -fB.dir * 32; fB.vy = -8; fB.onGround = false;
        }
        if (fA.state === 'dash' && fB.crouching && Math.abs(fA.x - fB.x) < 50 && fA.onGround) { fA.vy = -9; fA.onGround = false; burstNormal((fA.x + fB.x) / 2, FL - 20, 5, ['#aaffaa', '#88ff88']); }
        if (fB.state === 'dash' && fA.crouching && Math.abs(fA.x - fB.x) < 50 && fB.onGround) { fB.vy = -9; fB.onGround = false; burstNormal((fA.x + fB.x) / 2, FL - 20, 5, ['#aaffaa', '#88ff88']); }
    }

    function loop() {
        ct.clearRect(0, 0, W, H);
        if (freezeTimer > 0) {
            freezeTimer--;
            lightningTimer--;
            if (lightningTimer <= 0) { spawnLightnings(parryFlashX, parryFlashY); lightningTimer = 5 + Math.floor(Math.random() * 4); }
            const alpha = 0.4 + 0.6 * (freezeTimer / parryFlashTimer);
            drawLightnings(alpha);
            ct.save();
            ct.beginPath(); ct.arc(parryFlashX, parryFlashY, 8 + (parryFlashTimer - freezeTimer) * 0.5, 0, Math.PI * 2);
            ct.strokeStyle = isDark() ? '#aaeeff' : '#ffee44';
            ct.lineWidth = 2; ct.globalAlpha = Math.max(0, alpha - 0.1); ct.stroke();
            ct.restore();
            drawParts(); fA.draw(); fB.draw(); updateFlyEs(); updateEscapingFighters();
            requestAnimationFrame(loop);
            return;
        }
        fA.update(fB); fB.update(fA);
        checkParry();
        maybeEscape(fA); maybeEscape(fB);
        drawParts(); fA.draw(); fB.draw();
        updateFlyEs(); updateEscapingFighters();
        requestAnimationFrame(loop);
    }

    window.addEventListener('resize', () => {
        dims = resizeFighters();
        W = dims.W; H = dims.H; FL = H - 1;
        fA = new Fighter(W * 0.3, 1);
        fB = new Fighter(W * 0.7, -1);
    });

    loop();
})();