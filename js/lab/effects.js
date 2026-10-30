/* ==========================================================================
   ChemLabX 4.0 — Lab 3D Visual Effects
   Ambient particle field, 3D bench tilt, reaction bursts, molecule viewer.
   ========================================================================== */
(function () {
    'use strict';

    var Lab = window.Lab = window.Lab || {};

    /* ---------- Ambient 3D particle field on #labCanvas ---------- */
    function initField() {
        var canvas = document.getElementById('labCanvas');
        if (!canvas) return;
        if (window.CHLFX && window.CHLFX.reduceMotion && window.CHLFX.reduceMotion()) return;

        var themes = {
            default: ['0,230,179', '92,158,255', '168,123,255', '92,214,255', '255,123,160'],
            ocean: ['59,130,246', '92,158,255', '34,211,238', '168,123,255', '255,255,255'],
            emerald: ['16,185,129', '52,211,153', '255,255,255', '92,214,255', '168,123,255'],
            royal: ['192,132,252', '168,123,255', '255,255,255', '92,158,255', '244,114,182'],
            sunset: ['251,146,60', '255,123,160', '255,255,255', '168,123,255', '254,215,170'],
            light: ['5,150,105', '16,185,129', '59,130,246', '124,58,237', '255,123,160']
        };
        var t = document.documentElement.getAttribute('data-theme') || 'default';
        var palette = themes[t] || themes.default;
        try {
            window.CHLFX.field = new window.CHLFX.Field(canvas, palette);
        } catch (e) { /* canvas unsupported — ambient field skipped */ }
    }

    /* ---------- 3D tilt while dragging a bench item ---------- */
    function benchTilt(item, dx, dy) {
        var max = 14;
        var rx = Math.max(-max, Math.min(max, dy * 1.4));
        var ry = Math.max(-max, Math.min(max, -dx * 1.4));
        item.style.transform = 'perspective(700px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(24px)';
    }

    function clearTilt(item) {
        if (!item) return;
        item.style.transform = '';
    }

    /* ---------- Reaction burst: 3D shockwave rings + particles ---------- */
    function reactionBurst(zone, danger) {
        if (!zone) return;
        var burst = document.createElement('div');
        burst.className = 'burst-3d ' + (danger ? 'danger' : 'safe');
        var n = danger ? 3 : 2;
        for (var i = 0; i < n; i++) {
            var ring = document.createElement('div');
            ring.className = 'burst-ring';
            ring.style.animationDelay = (i * 0.12) + 's';
            burst.appendChild(ring);
        }
        for (var j = 0; j < (danger ? 14 : 8); j++) {
            var p = document.createElement('span');
            p.className = 'burst-particle';
            var a = (Math.PI * 2 * j) / (danger ? 14 : 8);
            p.style.setProperty('--bx', Math.cos(a) * 90 + 'px');
            p.style.setProperty('--by', Math.sin(a) * 90 + 'px');
            p.style.animationDelay = (Math.random() * 0.2) + 's';
            burst.appendChild(p);
        }
        zone.appendChild(burst);
        setTimeout(function () { burst.remove(); }, 2000);
    }

    /* ---------- CSS-3D molecule viewer ---------- */
    function buildAtom(color, seed) {
        var atom = document.createElement('div');
        atom.className = 'atom-3d';
        var nucleus = document.createElement('div');
        nucleus.className = 'atom-nucleus';
        nucleus.style.background = 'radial-gradient(circle at 35% 35%, #ffffff88, ' + (color || '#00E6B3') + ' 45%, ' + (color || '#00E6B3') + '55)';
        nucleus.style.boxShadow = '0 0 18px ' + (color || '#00E6B3') + 'aa';
        atom.appendChild(nucleus);

        var orbits = 1 + (seed % 2);
        for (var i = 0; i < orbits; i++) {
            var orbit = document.createElement('div');
            orbit.className = 'atom-orbit';
            orbit.style.animationDuration = (2.2 + i * 1.1) + 's';
            orbit.style.animationDelay = (i * 0.4) + 's';
            var electron = document.createElement('span');
            electron.className = 'atom-electron';
            electron.style.background = (color || '#00E6B3');
            electron.style.boxShadow = '0 0 8px ' + (color || '#00E6B3') + 'cc';
            orbit.appendChild(electron);
            atom.appendChild(orbit);
        }
        return atom;
    }

    function moleculeViewer(container, products) {
        if (!container) return;
        container.innerHTML = '';
        var list = (products && products.length) ? products.slice(0, 4) : [];
        if (list.length === 0) return;
        var wrap = container;
        wrap.style.display = 'block';
        list.forEach(function (p, i) {
            var item = document.createElement('div');
            item.className = 'mol-cell';
            var atom = buildAtom(p.color || '#00E6B3', i + 1);
            var label = document.createElement('div');
            label.className = 'mol-cell-label';
            label.textContent = (window.CHL.lang === 'en' ? (p.nameEn || p.name || '') : (p.name || ''));
            item.appendChild(atom);
            item.appendChild(label);
            wrap.appendChild(item);
        });
    }

    /* ---------- Enhanced tool effects with 3D depth ---------- */
    function toolDepthEffect(zone, className, particles, char) {
        if (!zone) return;
        var effect = document.createElement('div');
        effect.className = 'tool-effect ' + className;
        for (var i = 0; i < particles; i++) {
            var p = document.createElement('div');
            p.className = 'depth-particle';
            p.textContent = char || '';
            var a = Math.random() * Math.PI * 2;
            var r = 30 + Math.random() * 70;
            p.style.setProperty('--dx', Math.cos(a) * r + 'px');
            p.style.setProperty('--dy', Math.sin(a) * r + 'px');
            p.style.animationDelay = (i * 0.06) + 's';
            p.style.left = (20 + Math.random() * 60) + '%';
            effect.appendChild(p);
        }
        zone.appendChild(effect);
        setTimeout(function () { effect.remove(); }, 1600);
    }

    Lab.effects = {
        initField: initField,
        benchTilt: benchTilt,
        clearTilt: clearTilt,
        reactionBurst: reactionBurst,
        moleculeViewer: moleculeViewer,
        toolDepthEffect: toolDepthEffect
    };
})();
