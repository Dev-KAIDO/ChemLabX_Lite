/* ==========================================================================
   ChemLabX 4.0 — Workbench (drop zone)
   Add/remove bench items, drag (with 3D tilt), zoom, undo, reset.
   ========================================================================== */
(function () {
    'use strict';

    var Lab = window.Lab = window.Lab || {};

    function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
    function matName(m) { return (window.CHL.lang === 'en' && m.nameEn) ? m.nameEn : m.name; }

    function itemHTML(data, qty, unit) {
        var info = materialDB[data.material] || {};
        var name = matName(info) || data.name || data.material || '?';
        var formula = data.formula || info.formula || '';
        var color = data.color || info.color || '#888';
        return '<span class="bench-color" style="background:' + color + ';"></span>' +
            '<div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + '</div>' +
            '<div style="font-size:10px;color:var(--text-secondary);font-family:var(--font-mono);">' + formula + '</div></div>' +
            '<span class="qty-badge">' + qty + ' ' + unit + '</span>' +
            '<button class="remove-btn" data-id="' + data.id + '">X</button>';
    }

    function addToBenchSilent(data) {
        var id = data.id || genId();
        var item = document.createElement('div');
        item.className = 'bench-item';
        item.dataset.id = id;
        item.dataset.material = data.material || 'unknown';
        item.style.left = (15 + Math.random() * 40) + '%';
        item.style.top = (15 + Math.random() * 40) + '%';
        item.innerHTML = itemHTML(data, data.qty || 5, data.unit || 'ml');
        item.addEventListener('mousedown', startDrag);
        var zone = document.getElementById('dropZone');
        zone.appendChild(item);
        Lab.state.benchItems.push({ id: id, material: data.material || 'unknown', name: data.name || '', formula: data.formula || '', color: data.color || '#888', qty: data.qty || 5, unit: data.unit || 'ml', element: item });
        item.querySelector('.remove-btn').addEventListener('click', function (e) { e.stopPropagation(); removeFromBench(id); });
    }

    function addToBench(materialData) {
        Lab.saveSnapshot('add');
        var placeholder = document.getElementById('placeholderText');
        if (placeholder) placeholder.style.opacity = '0';
        var id = genId();
        var item = document.createElement('div');
        item.className = 'bench-item';
        item.dataset.id = id;
        item.dataset.material = materialData.material || 'unknown';
        if (materialData.dropX !== undefined && materialData.dropY !== undefined) {
            item.style.left = Math.max(0, Math.min(85, materialData.dropX)) + '%';
            item.style.top = Math.max(0, Math.min(85, materialData.dropY)) + '%';
        } else {
            var count = Lab.state.benchItems.length;
            item.style.left = (10 + (count % 5) * 15) + '%';
            item.style.top = (10 + Math.floor(count / 5) * 20) + '%';
        }
        var info = materialDB[materialData.material] || {};
        var name = matName(info) || materialData.name || materialData.material || '?';
        var formula = materialData.formula || info.formula || '';
        var color = materialData.color || info.color || '#888';
        var qty = Lab.state.selectedQty || 5;
        var unit = Lab.state.selectedUnit || 'ml';
        item.innerHTML = itemHTML({ material: materialData.material, id: id, name: name, formula: formula, color: color }, qty, unit);
        item.addEventListener('mousedown', startDrag);
        item.addEventListener('click', function (e) {
            if (e.target.classList.contains('remove-btn')) return;
            document.querySelectorAll('.bench-item').forEach(function (el) { el.classList.remove('selected'); });
            this.classList.add('selected');
        });
        var zone = document.getElementById('dropZone');
        zone.appendChild(item);
        Lab.state.benchItems.push({ id: id, material: materialData.material || 'unknown', name: name, formula: formula, color: color, qty: qty, unit: unit, element: item });
        item.querySelector('.remove-btn').addEventListener('click', function (e) { e.stopPropagation(); removeFromBench(id); });
        Lab.updateUI();
        var sidebarItem = document.querySelector('.material-item[data-material="' + materialData.material + '"]');
        if (sidebarItem) sidebarItem.classList.add('added');
        Lab.addLog('+ ' + name + ' (' + qty + ' ' + unit + ')', 'log-success', null, 'add');
    }

    function removeFromBench(id) {
        var index = Lab.state.benchItems.findIndex(function (b) { return b.id === id; });
        if (index === -1) return;
        var item = Lab.state.benchItems[index];
        item.element.style.opacity = '0';
        item.element.style.transform = 'scale(0.5)';
        setTimeout(function () { item.element.remove(); }, 200);
        Lab.state.benchItems.splice(index, 1);
        var sidebarItem = document.querySelector('.material-item[data-material="' + item.material + '"]');
        if (sidebarItem) sidebarItem.classList.remove('added');
        Lab.updateUI();
        Lab.addLog('- ' + item.name, 'log-warning', null, 'remove');
        if (Lab.state.benchItems.length === 0) {
            var placeholder = document.getElementById('placeholderText');
            if (placeholder) placeholder.style.opacity = '0.3';
            var panel = document.getElementById('productPanel');
            if (panel) panel.classList.remove('active');
        }
    }

    /* ---------- Drag bench items (3D tilt) ---------- */
    var dragData = null;

    function startDrag(e) {
        var item = e.currentTarget;
        var rect = item.getBoundingClientRect();
        dragData = { item: item, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
        item.style.transition = 'none';
        item.style.zIndex = '100';
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);
    }

    function onDrag(e) {
        if (!dragData) return;
        var zone = document.getElementById('dropZone');
        var zoneRect = zone.getBoundingClientRect();
        var x = e.clientX - zoneRect.left - dragData.offsetX;
        var y = e.clientY - zoneRect.top - dragData.offsetY;
        dragData.item.style.left = Math.max(0, Math.min(85, (x / zoneRect.width) * 100)) + '%';
        dragData.item.style.top = Math.max(0, Math.min(85, (y / zoneRect.height) * 100)) + '%';
        if (Lab.effects) Lab.effects.benchTilt(dragData.item, e.movementX || 0, e.movementY || 0);
    }

    function onDragEnd() {
        if (dragData) {
            dragData.item.style.transition = '';
            dragData.item.style.zIndex = '';
            if (Lab.effects) Lab.effects.clearTilt(dragData.item);
            dragData = null;
        }
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onDragEnd);
    }

    /* ---------- Drop zone handlers ---------- */
    function initDropZone() {
        var zone = document.getElementById('dropZone');
        if (!zone) return;
        zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('active-drop'); });
        zone.addEventListener('dragleave', function () { zone.classList.remove('active-drop'); });
        zone.addEventListener('drop', function (e) {
            e.preventDefault();
            zone.classList.remove('active-drop');
            var matId = e.dataTransfer.getData('text/plain');
            var el = document.querySelector('.material-item[data-material="' + matId + '"]');
            if (!el) return;
            var rect = zone.getBoundingClientRect();
            var x = ((e.clientX - rect.left) / rect.width) * 100;
            var y = ((e.clientY - rect.top) / rect.height) * 100;
            addToBench({ material: el.dataset.material, name: el.dataset.name, formula: el.dataset.formula, color: el.dataset.color, dropX: x - 5, dropY: y - 3 });
        });
    }

    /* ---------- Zoom ---------- */
    function applyZoom() {
        var zone = document.getElementById('dropZone');
        if (zone) {
            zone.style.transform = 'scale(' + Lab.state.zoom + ')';
            zone.style.transformOrigin = 'top center';
        }
        var lvl = document.getElementById('zoomLevel');
        if (lvl) lvl.textContent = Math.round(Lab.state.zoom * 100) + '%';
    }

    /* ---------- Undo ---------- */
    function saveSnapshot(actionType) {
        Lab.state.undoHistory.push({
            action: actionType,
            items: Lab.state.benchItems.map(function (b) {
                return { material: b.material, qty: b.qty, unit: b.unit, id: b.id, name: b.name, formula: b.formula, color: b.color };
            }),
            temperature: Lab.state.temperature, ph: Lab.state.ph, xp: Lab.state.xp, experimentCount: Lab.state.experimentCount
        });
        if (Lab.state.undoHistory.length > 30) Lab.state.undoHistory.shift();
    }

    function undoLastAction() {
        if (Lab.state.undoHistory.length === 0) {
            Lab.toast(window.t('\u0644\u0627 \u064A\u0648\u062C\u062F \u0639\u0645\u0644', 'Nothing to undo'), 'warning', '\u26A0\uFE0F');
            return;
        }
        var snap = Lab.state.undoHistory.pop();
        Lab.state.benchItems.forEach(function (item) { item.element.remove(); });
        Lab.state.benchItems = [];
        snap.items.forEach(function (b) { addToBenchSilent(b); });
        Lab.state.temperature = snap.temperature;
        Lab.state.ph = snap.ph;
        Lab.state.xp = snap.xp;
        Lab.state.experimentCount = snap.experimentCount;
        var panel = document.getElementById('productPanel');
        if (panel) panel.classList.remove('active');
        Lab.updateUI();
        Lab.toast(window.t('\u062A\u0631\u0627\u062C\u0639', 'Undo'), 'info', '\u21A9\uFE0F');
    }

    /* ---------- Bench names on language switch ---------- */
    function updateBenchNames() {
        Lab.state.benchItems.forEach(function (b) {
            var info = materialDB[b.material];
            if (info) {
                var newName = matName(info);
                var nameEl = b.element.querySelector('div[style*="font-weight:700"]');
                if (nameEl) nameEl.textContent = newName;
                b.name = newName;
            }
        });
    }

    /* ---------- Reset ---------- */
    function resetBench() {
        if (Lab.state.reactionTimeout) { clearTimeout(Lab.state.reactionTimeout); Lab.state.reactionTimeout = null; }
        Lab.state.benchItems.forEach(function (item) {
            item.element.style.opacity = '0';
            item.element.style.transform = 'scale(0.3)';
            setTimeout(function () { item.element.remove(); }, 200);
        });
        Lab.state.benchItems = [];
        Lab.state.temperature = 25.0;
        Lab.state.ph = 7.0;
        Lab.state.isReacting = false;
        var panel = document.getElementById('productPanel');
        if (panel) panel.classList.remove('active');
        var placeholder = document.getElementById('placeholderText');
        if (placeholder) placeholder.style.opacity = '0.3';
        document.querySelectorAll('.material-item.added').forEach(function (el) { el.classList.remove('added'); });
        Lab.updateUI();
        Lab.addLog(window.t('\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0645\u0639\u0645\u0644', 'Reset lab'), 'log-warning', null, 'reset');
        Lab.toast(window.t('\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646', 'Lab reset'), 'warning', '\uD83D\uDDD1\uFE0F');
    }

    Lab.bench = {
        addToBench: addToBench,
        addToBenchSilent: addToBenchSilent,
        removeFromBench: removeFromBench,
        applyZoom: applyZoom,
        saveSnapshot: saveSnapshot,
        undoLastAction: undoLastAction,
        updateBenchNames: updateBenchNames,
        resetBench: resetBench,
        initDropZone: initDropZone,
        startDrag: startDrag,
        onDrag: onDrag,
        onDragEnd: onDragEnd
    };
})();
