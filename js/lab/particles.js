/* ==========================================================================
   ChemLabX 4.0 — 3D particle / molecule field (canvas)
   Reusable ambient background with depth, glow and mouse parallax.
   ========================================================================== */
(function () {
    'use strict';

    var PARTICLES_COUNT = 90;
    var DPR = typeof window.devicePixelRatio === 'number' ? Math.min(2, window.devicePixelRatio) : 1;

    function Molecule() {
        this.reset(true);
    }
    Molecule.prototype.reset = function (init) {
        this.x = Math.random();
        this.y = Math.random();
        this.z = 0.25 + Math.random() * 0.75;             /* depth 0..1 */
        this.r = (this.z) * 2.2 + 0.6;                    /* size grows with depth */
        this.speed = (0.02 + Math.random() * 0.05) * this.z;
        this.drift = (Math.random() - 0.5) * 0.002;
        this.alpha = 0.08 + this.z * 0.28;
        if (init) this.wobble = Math.random() * Math.PI * 2;
        this.wobble += 0.01;
    };

    function Field(canvas, palette) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.palette = palette || ['0,230,179', '92,158,255', '168,123,255', '92,214,255', '255,123,160'];
        this.molecules = [];
        for (var i = 0; i < PARTICLES_COUNT; i++) this.molecules.push(new Molecule());
        this.mouse = { x: 0.5, y: 0.5 };
        this.bind();
        this.resize();
        this.tick();
    }

    Field.prototype.bind = function () {
        var self = this;
        window.addEventListener('resize', function () { self.resize(); });
        if (window.matchMedia('(hover: hover)').matches) {
            this.canvas.parentElement.addEventListener('mousemove', function (e) {
                var r = self.canvas.parentElement.getBoundingClientRect();
                self.mouse.x = (e.clientX - r.left) / r.width;
                self.mouse.y = (e.clientY - r.top) / r.height;
            });
        }
    };

    Field.prototype.resize = function () {
        var w = this.canvas.clientWidth || window.innerWidth;
        var h = this.canvas.clientHeight || window.innerHeight;
        this.canvas.width = w * DPR;
        this.canvas.height = h * DPR;
        this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        this.w = w;
        this.h = h;
    };

    Field.prototype.tick = function () {
        var self = this;
        requestAnimationFrame(function () { self.tick(); });
        var ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);

        for (var i = 0; i < this.molecules.length; i++) {
            var m = this.molecules[i];
            /* depth-based drift + wobble */
            m.x += m.speed * 0.0016 + m.drift;
            m.y += m.speed * 0.0011 + Math.sin(m.wobble) * 0.00025;
            if (m.x < -0.02) m.x = 1.02;
            if (m.x > 1.02) m.x = -0.02;
            if (m.y < -0.02) m.y = 1.02;
            if (m.y > 1.02) m.y = -0.02;

            /* mouse parallax — nearer molecules shift more */
            var px = this.w * (m.x + (this.mouse.x - 0.5) * 0.06 * m.z);
            var py = this.h * (m.y + (this.mouse.y - 0.5) * 0.06 * m.z);

            var color = this.palette[i % this.palette.length];
            var g = ctx.createRadialGradient(px, py, 0, px, py, m.r * 4);
            g.addColorStop(0, 'rgba(' + color + ',' + m.alpha + ')');
            g.addColorStop(1, 'rgba(' + color + ',0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(px, py, m.r * 4, 0, Math.PI * 2);
            ctx.fill();

            /* faint connections between nearby molecules */
            for (var j = i + 1; j < this.molecules.length; j++) {
                var n = this.molecules[j];
                if (j - i > 4) continue;
                var dx = (m.x - n.x) * this.w;
                var dy = (m.y - n.y) * this.h;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 90) {
                    ctx.strokeStyle = 'rgba(' + color + ',' + (0.05 * (1 - dist / 90) * m.z) + ')';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(this.w * n.x, this.h * n.y);
                    ctx.stroke();
                }
            }
        }
    };

    window.CHLFX = {
        Field: Field,
        reduceMotion: function () {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
    };
})();
