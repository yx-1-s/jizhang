/* ============ 我的记账本 · 核心逻辑 ============ */
(function () {
  'use strict';

  /* ---------- 数据存储 ---------- */
  var LS_TAGS = 'jz_tags';
  var LS_RECORDS = 'jz_records';
  var LS_SETTINGS = 'jz_settings';
  var LS_SYNC_LINK = 'jz_sync_link';

  var APP_VERSION = 'v3';

  var DEFAULT_TAGS = [
    { id: 't1', name: '餐饮', emoji: '🍚', color: '#FF9F0A' },
    { id: 't2', name: '交通', emoji: '🚌', color: '#34C759' },
    { id: 't3', name: '购物', emoji: '🛍️', color: '#FF2D55' },
    { id: 't4', name: '日用', emoji: '🧻', color: '#5AC8FA' },
    { id: 't5', name: '娱乐', emoji: '🎮', color: '#AF52DE' },
    { id: 't6', name: '医疗', emoji: '💊', color: '#FF6B6B' },
    { id: 't7', name: '居住', emoji: '🏠', color: '#A2845E' },
    { id: 't8', name: '人情', emoji: '🧧', color: '#FF6482' },
    { id: 't9', name: '其他', emoji: '📦', color: '#8E8E93' }
  ];

  var EMOJIS = ['🍚','🍜','☕','🥤','🍺','🍔','🚌','🚕','🚇','⛽','🛒','👕','💄','🧻','🏠','💡','📱','💊','🏥','🧧','🎁','🎂','🎬','🎮','📚','✈️','🐱','🐶','💼','🏋️','🎓','✂️','🪙','🧾','🔧','💇','🚬','🎫'];

  var COLORS = ['#FF6B6B','#FF9F0A','#FFC53D','#34C759','#00C7BE','#5AC8FA','#4F6DF5','#AF52DE','#FF2D55','#A2845E','#8E8E93','#30D158'];

  var tags = [];
  var records = [];

  function loadData() {
    try {
      tags = JSON.parse(localStorage.getItem(LS_TAGS)) || [];
      records = JSON.parse(localStorage.getItem(LS_RECORDS)) || [];
    } catch (e) {
      tags = []; records = [];
    }
    if (!tags.length) {
      tags = DEFAULT_TAGS.map(function (t) { return { id: t.id, name: t.name, emoji: t.emoji, color: t.color }; });
      saveTags();
    }
    // 记录字段兜底
    records = records.filter(function (r) { return r && typeof r.amount === 'number'; });
  }

  function saveTags() { localStorage.setItem(LS_TAGS, JSON.stringify(tags)); }
  function saveRecords() { localStorage.setItem(LS_RECORDS, JSON.stringify(records)); }

  function getSettings() {
    try { return JSON.parse(localStorage.getItem(LS_SETTINGS)) || {}; }
    catch (e) { return {}; }
  }
  function setSettings(s) { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); }

  /* ---------- 工具函数 ---------- */
  function $(id) { return document.getElementById(id); }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function toYMD(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function todayStr() { return toYMD(new Date()); }

  function fmtMoney(n) {
    return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function findTag(id) {
    for (var i = 0; i < tags.length; i++) if (tags[i].id === id) return tags[i];
    return null;
  }

  function findRecord(id) {
    for (var i = 0; i < records.length; i++) if (records[i].id === id) return records[i];
    return null;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function cnDateLine(d) {
    return '今天 · ' + d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  /* ---------- 金额输入 ---------- */
  var amountStr = '';

  function displayAmount() {
    if (!amountStr) return '0.00';
    var p = amountStr.split('.');
    var intPart = p[0] ? parseInt(p[0], 10).toLocaleString('en-US') : '0';
    return p.length > 1 ? intPart + '.' + p[1] : intPart;
  }

  function updateAmount() {
    $('amountNum').textContent = displayAmount();
  }

  function keyInput(k) {
    if (k === 'del') {
      amountStr = amountStr.slice(0, -1);
    } else if (k === 'clear') {
      amountStr = '';
    } else if (k === '.') {
      if (!amountStr.includes('.')) amountStr = amountStr ? amountStr + '.' : '0.';
    } else if (k === '00') {
      if (amountStr === '') { amountStr = '0'; return; }
      var p00 = amountStr.split('.');
      if (p00.length === 1) {
        if (p00[0].length < 8) amountStr = p00[0] + '00';
      } else if (p00[1].length < 2) {
        amountStr = p00[0] + '.' + p00[1] + '0'.repeat(2 - p00[1].length);
      }
    } else if (/^[0-9]$/.test(k)) {
      var p = amountStr.split('.');
      if (p.length === 2) {
        if (p[1].length < 2) amountStr += k;
      } else {
        if (p[0].length < 8) {
          amountStr = p[0] === '0' ? (k === '0' ? '0' : k) : amountStr + k;
        }
      }
    }
    updateAmount();
  }

  function parseAmount() {
    var n = parseFloat(amountStr);
    return (isFinite(n) && n > 0) ? Math.round(n * 100) / 100 : null;
  }

  /* ---------- 视图切换 ---------- */
  var VIEWS = ['input', 'tag', 'records', 'settings'];

  function switchTab(name) {
    VIEWS.forEach(function (v) { $('view-' + v).classList.toggle('is-active', v === name); });
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.view === name);
    });
    if (name === 'input') {
      updateAmount();
      $('inputDate').textContent = cnDateLine(new Date());
      refreshMonthChip();
    } else if (name === 'records') {
      renderRecords();
    } else if (name === 'settings') {
      renderTagManage();
      renderSyncSettings();
    }
    window.scrollTo(0, 0);
  }

  function showRecords() { switchTab('records'); }
  function showSettings() { switchTab('settings'); }

  function goBackToInput() {
    switchTab('input');
  }

  /* ---------- 本月统计 ---------- */
  function currentMonth() { return todayStr().slice(0, 7); }

  function monthStats(ym) {
    var total = 0, count = 0;
    records.forEach(function (r) {
      if (!r.deleted && r.date && r.date.slice(0, 7) === ym) { total += r.amount; count++; }
    });
    return { total: total, count: count };
  }

  function refreshMonthChip() {
    var s = monthStats(currentMonth());
    $('monthTotalChip').textContent = '本月 ¥' + fmtMoney(s.total);
  }

  /* ---------- 进入用途选择 ---------- */
  function onConfirmAmount() {
    var n = parseAmount();
    if (n === null) { toast('请输入金额，再点下一步'); return; }

    // 默认选中上次用过的标签
    var lastTagId = getSettings().lastTagId;
    selectedTagId = findTag(lastTagId) ? lastTagId : (tags[0] ? tags[0].id : null);

    $('tagAmount').textContent = fmtMoney(n);
    var d = $('tagDate');
    d.value = todayStr();
    renderTagGrid();
    $('noteInput').value = '';
    switchTab('tag');
  }

  /* ---------- 标签选择 ---------- */
  var selectedTagId = null;

  function renderTagGrid() {
    var grid = $('tagGrid');
    grid.innerHTML = '';
    tags.forEach(function (t) {
      var btn = document.createElement('button');
      btn.className = 'tag-tile' + (t.id === selectedTagId ? ' is-selected' : '');
      btn.innerHTML = '<span class="tag-tile-emoji">' + t.emoji + '</span><span class="tag-tile-name">' + escapeHtml(t.name) + '</span>';
      btn.onclick = function () { selectedTagId = t.id; renderTagGrid(); };
      grid.appendChild(btn);
    });
    var addBtn = document.createElement('button');
    addBtn.className = 'tag-tile tag-tile-add';
    addBtn.innerHTML = '<span class="tag-tile-emoji">＋</span><span class="tag-tile-name">新建</span>';
    addBtn.onclick = function () { openTagEditor(null); };
    grid.appendChild(addBtn);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- 保存一笔账 ---------- */
  function saveRecord() {
    var n = parseAmount();
    if (n === null) { toast('金额不对，请回上一步检查'); return; }
    var tag = findTag(selectedTagId);
    if (!tag) { toast('请选一个用途标签'); return; }

    var date = $('tagDate').value || todayStr();
    var note = $('noteInput').value.trim();

    records.push({
      id: uid(),
      amount: n,
      tagId: tag.id,
      note: note,
      date: date,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    records.sort(function (a, b) { return b.date.localeCompare(a.date) || b.createdAt - a.createdAt; });
    saveRecords();

    var s = getSettings();
    s.lastTagId = tag.id;
    setSettings(s);
    markDirty();

    amountStr = '';
    $('noteInput').value = '';
    switchTab('input');
    refreshMonthChip();
    toast('已记一笔：' + tag.name + ' −¥' + fmtMoney(n));
  }

  /* ---------- 明细：月历 + 当天明细 ---------- */
  var calYear = null, calMonth = null, selectedDay = null;

  function renderRecords() {
    var today = new Date();
    if (calYear == null) { calYear = today.getFullYear(); calMonth = today.getMonth(); }
    var ym = calYear + '-' + pad(calMonth + 1);

    // 默认选中的天：本月有记录就选最近一笔，没有就选今天；今天也不在本月就选 1 号
    if (!selectedDay || selectedDay.slice(0, 7) !== ym) {
      var todayDs = todayStr();
      var latest = '';
      visibleRecords().forEach(function (r) {
        if (r.date && r.date.slice(0, 7) === ym && r.date > latest) latest = r.date;
      });
      if (latest) selectedDay = latest;
      else if (todayDs.slice(0, 7) === ym) selectedDay = todayDs;
      else selectedDay = ym + '-01';
    }

    var s = monthStats(ym);
    $('monthCount').textContent = s.count;
    $('monthTotal').textContent = fmtMoney(s.total);
    $('monthTitle').textContent = calYear + '年' + (calMonth + 1) + '月';

    var empty = $('recordsEmpty');
    if (!visibleRecords().length) { empty.hidden = false; return; }
    empty.hidden = true;

    renderCalendar();
    renderDayRecords();
  }

  function renderCalendar() {
    var grid = $('calGrid');
    grid.innerHTML = '';
    $('calTitle').textContent = calYear + '年' + (calMonth + 1) + '月';

    var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    var firstDow = new Date(calYear, calMonth, 1).getDay();
    var leadingBlanks = (firstDow + 6) % 7; // 周一是第一天

    var ym = calYear + '-' + pad(calMonth + 1);
    var amtByDay = {};
    visibleRecords().forEach(function (r) {
      if (r.date && r.date.slice(0, 7) === ym) {
        amtByDay[r.date] = (amtByDay[r.date] || 0) + r.amount;
      }
    });

    var today = todayStr();

    for (var i = 0; i < leadingBlanks; i++) {
      var b = document.createElement('div');
      b.className = 'cal-blank';
      grid.appendChild(b);
    }
    for (var d = 1; d <= daysInMonth; d++) {
      var ds = ym + '-' + pad(d);
      var cell = document.createElement('div');
      cell.className = 'cal-day' + (ds === today ? ' is-today' : '') + (ds === selectedDay ? ' is-selected' : '');
      var amt = amtByDay[ds];
      cell.innerHTML = '<div class="cal-day-num">' + d + '</div>' +
        (amt ? '<div class="cal-day-amt">' + fmtDayAmt(amt) + '</div>' : '');
      cell.onclick = (function (ds2) {
        return function () { selectedDay = ds2; renderCalendar(); renderDayRecords(); };
      })(ds);
      grid.appendChild(cell);
    }
  }

  function fmtDayAmt(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n >= 100 ? String(Math.round(n)) : n.toFixed(1);
  }

  function changeMonth(delta) {
    var d = new Date(calYear, calMonth + delta, 1);
    calYear = d.getFullYear();
    calMonth = d.getMonth();
    renderRecords();
  }

  function renderDayRecords() {
    if (!selectedDay) return;
    var list = $('dayRecords');
    list.innerHTML = '';

    var dayRecs = visibleRecords().filter(function (r) { return r.date === selectedDay; });
    var total = dayRecs.reduce(function (s, r) { return s + r.amount; }, 0);

    var today = new Date();
    var label;
    if (selectedDay === todayStr()) label = '今天';
    else {
      var yesterday = new Date(today.getTime() - 86400000);
      if (selectedDay === toYMD(yesterday)) label = '昨天';
      else {
        var dow = new Date(selectedDay + 'T00:00:00').getDay();
        label = '周' + '日一二三四五六'[dow];
      }
    }
    var dd = new Date(selectedDay + 'T00:00:00');
    $('dayTitle').textContent = (dd.getMonth() + 1) + '月' + dd.getDate() + '日 · ' + label;
    $('dayTotal').textContent = total > 0 ? ('−¥' + fmtMoney(total) + ' · ' + dayRecs.length + '笔') : '这一天没有账目';

    var empty = $('dayEmpty');
    if (!dayRecs.length) { empty.hidden = false; return; }
    empty.hidden = true;

    dayRecs.forEach(function (r) {
      var item = document.createElement('div');
      item.className = 'record-item';
      var tag = findTag(r.tagId);
      var emoji = tag ? tag.emoji : '🧾';
      var color = (tag && tag.color) ? tag.color : '#8E8E93';
      var tagName = tag ? tag.name : '已删除标签';
      var note = r.note ? '<div class="record-note">' + escapeHtml(r.note) + '</div>' : '';
      item.innerHTML =
        '<div class="record-emoji" style="background:' + color + '1f;">' + emoji + '</div>' +
        '<div class="record-info"><div class="record-tag">' + escapeHtml(tagName) + '</div>' + note + '</div>' +
        '<div class="record-amount">−¥' + fmtMoney(r.amount) + '</div>';
      item.onclick = function () { openDetail(r.id); };
      list.appendChild(item);
    });
  }

  /* ---------- 账目详情 ---------- */
  var currentRecordId = null;

  function openDetail(id) {
    var r = findRecord(id);
    if (!r) return;
    currentRecordId = id;
    var tag = findTag(r.tagId);
    $('detailEmoji').textContent = tag ? tag.emoji : '🧾';
    $('detailTag').textContent = tag ? tag.name : '已删除标签';
    $('detailAmount').textContent = fmtMoney(r.amount);
    $('detailDate').textContent = formatDateCN(r.date);
    $('detailNote').textContent = r.note || '（无备注）';
    $('detailModal').hidden = false;
  }

  function formatDateCN(day) {
    var d = new Date(day + 'T00:00:00');
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function deleteRecord() {
    if (!currentRecordId) return;
    closeModal('detailModal');
    confirmAction('删除这笔账', '删除后无法恢复，确定要删除这笔 ' + fmtMoney(findRecord(currentRecordId).amount) + ' 元的账吗？', '删除', function () {
      var r = findRecord(currentRecordId);
      if (r) { r.deleted = true; r.updatedAt = Date.now(); }
      saveRecords();
      markDirty();
      renderRecords();
      refreshMonthChip();
      toast('已删除');
    });
  }

  /* ---------- 标签编辑 ---------- */
  var editingTagId = null;
  var pickedEmoji = '🧾';
  var pickedColor = COLORS[0];

  function openTagEditor(editId) {
    editingTagId = editId || null;
    if (editId) {
      var t = findTag(editId);
      if (!t) return;
      pickedEmoji = t.emoji;
      pickedColor = t.color;
      $('tagNameInput').value = t.name;
      $('tagEditorTitle').textContent = '编辑标签';
    } else {
      pickedEmoji = '🧾';
      pickedColor = COLORS[0];
      $('tagNameInput').value = '';
      $('tagEditorTitle').textContent = '添加标签';
    }
    renderEmojiPicker();
    renderColorPicker();
    $('tagEditorModal').hidden = false;
    setTimeout(function () { $('tagNameInput').focus(); }, 80);
  }

  function renderEmojiPicker() {
    var box = $('emojiPicker');
    box.innerHTML = '';
    EMOJIS.forEach(function (e) {
      var b = document.createElement('button');
      b.textContent = e;
      if (e === pickedEmoji) b.className = 'is-selected';
      b.onclick = function () { pickedEmoji = e; renderEmojiPicker(); };
      box.appendChild(b);
    });
  }

  function renderColorPicker() {
    var box = $('colorPicker');
    box.innerHTML = '';
    COLORS.forEach(function (c) {
      var b = document.createElement('button');
      b.style.background = c;
      if (c === pickedColor) b.className = 'is-selected';
      b.onclick = function () { pickedColor = c; renderColorPicker(); };
      box.appendChild(b);
    });
  }

  function saveTagFromEditor() {
    var name = $('tagNameInput').value.trim();
    if (!name) { toast('请输入标签名称'); return; }
    if (name.length > 8) { toast('标签名称最多 8 个字'); return; }

    if (editingTagId) {
      var t = findTag(editingTagId);
      if (t) { t.name = name; t.emoji = pickedEmoji; t.color = pickedColor; }
    } else {
      tags.push({ id: uid(), name: name, emoji: pickedEmoji, color: pickedColor });
    }
    saveTags();
    markDirty();
    closeModal('tagEditorModal');
    renderTagManage();
    renderTagGrid();
    if (selectedTagId === null) selectedTagId = tags[0] ? tags[0].id : null;
    toast('标签已保存');
  }

  function renderTagManage() {
    var list = $('tagManageList');
    list.innerHTML = '';
    tags.forEach(function (t) {
      var chip = document.createElement('span');
      chip.className = 'manage-tag';
      chip.innerHTML = t.emoji + ' ' + escapeHtml(t.name) + '<button title="删除">✕</button>';
      chip.onclick = function (ev) {
        if (ev.target.tagName === 'BUTTON') {
          ev.stopPropagation();
          confirmAction('删除标签', '删除「' + t.name + '」后，用这笔标签记过的账还在，只是显示为「已删除标签」。确定删除吗？', '删除', function () {
            tags = tags.filter(function (x) { return x.id !== t.id; });
            if (selectedTagId === t.id) selectedTagId = null;
            saveTags();
            markDirty();
            renderTagManage();
            renderTagGrid();
            toast('已删除标签');
          });
        } else {
          openTagEditor(t.id);
        }
      };
      list.appendChild(chip);
    });
  }

  /* ---------- 弹窗 ---------- */
  function closeModal(id) { $(id).hidden = true; }

  function confirmAction(title, text, okLabel, onOk) {
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    $('confirmOkBtn').textContent = okLabel;
    $('confirmOkBtn').onclick = function () { closeModal('confirmModal'); onOk(); };
    $('confirmModal').hidden = false;
  }

  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.hidden = true; }, 2000);
  }

  /* ---------- 导出 / 导入 / 清空 ---------- */
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function stamp() {
    var d = new Date();
    return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
  }

  function visibleRecords() {
    return records.filter(function (r) { return !r.deleted; });
  }

  function exportJSON() {
    var data = { app: '我的记账本', version: 1, exportedAt: new Date().toISOString(), tags: tags, records: visibleRecords() };
    download('记账本备份-' + stamp() + '.json', JSON.stringify(data, null, 2), 'application/json');
    toast('备份文件已导出');
  }

  function exportCSV() {
    var BOM = '﻿';
    var rows = ['日期,金额,用途,备注'];
    visibleRecords().forEach(function (r) {
      var tag = findTag(r.tagId);
      var name = tag ? tag.name : '已删除标签';
      rows.push([r.date, r.amount, name, '"' + String(r.note || '').replace(/"/g, '""') + '"'].join(','));
    });
    download('记账本明细-' + stamp() + '.csv', BOM + rows.join('\r\n'), 'text/csv;charset=utf-8');
    toast('表格文件已导出');
  }

  function importJSON(ev) {
    var file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(reader.result); }
      catch (e) { toast('文件格式不对，无法读取'); return; }

      var newTags = Array.isArray(data.tags) ? data.tags : [];
      var newRecords = Array.isArray(data.records) ? data.records : [];
      if (!newTags.length && !newRecords.length) { toast('这个文件里没有账目数据'); return; }

      confirmAction('恢复备份', '导入会覆盖当前这台浏览器里的所有数据。确定继续吗？', '覆盖导入', function () {
        tags = newTags.map(function (t) { return { id: t.id || uid(), name: String(t.name || '未命名'), emoji: t.emoji || '🧾', color: t.color || '#8E8E93' }; });
        records = newRecords.filter(function (r) { return r && typeof r.amount === 'number'; })
          .map(function (r) { return { id: r.id || uid(), amount: r.amount, tagId: r.tagId || '', note: r.note || '', date: r.date || todayStr(), createdAt: r.createdAt || Date.now() }; });
        if (!tags.length) tags = DEFAULT_TAGS.map(function (t) { return { id: t.id, name: t.name, emoji: t.emoji, color: t.color }; });
        saveTags(); saveRecords();
        markDirty();
        selectedTagId = tags[0] ? tags[0].id : null;
        switchTab('records');
        refreshMonthChip();
        toast('已恢复，共 ' + records.length + ' 笔账');
      });
    };
    reader.readAsText(file);
  }

  function clearAll() {
    confirmAction('清空所有账目', '将删除全部 ' + records.length + ' 笔记录（标签保留）。删除后无法恢复！建议先导出备份。确定清空吗？', '全部清空', function () {
      records.forEach(function (r) { r.deleted = true; r.updatedAt = Date.now(); });
      saveRecords();
      markDirty();
      renderRecords();
      refreshMonthChip();
      toast('已清空');
    });
  }

  /* ---------- 云同步（GitHub 私有仓库存储） ---------- */
  var SYNC_DEBOUNCE_MS = 1500;
  var syncTimer = null;

  function syncCfg() {
    var s = getSettings();
    return { token: s.syncToken || '', owner: s.syncOwner || 'yx-1-s', repo: s.syncRepo || '' };
  }

  function syncConfigured() {
    var c = syncCfg();
    return !!c.token && !!c.repo;
  }

  function authHeaders() {
    return {
      'Authorization': 'Bearer ' + syncCfg().token,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    };
  }

  function b64encodeUtf8(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decodeUtf8(b64) { return decodeURIComponent(escape(atob(b64))); }

  function buildSyncDoc() {
    var s = getSettings();
    return { app: '我的记账本', version: 1, updatedAt: s.updatedAt || Date.now(), tags: tags, records: records };
  }

  function setSyncStatus(state) {
    var badge = $('syncBadge');
    var text = $('syncStatusText');
    if (!badge || !text) return;
    var map = {
      off: ['', '（未开启）'],
      syncing: ['🔄', '同步中…'],
      ok: ['☁️', '已同步'],
      error: ['⚠️', '同步失败，检查网络或设置']
    };
    var m = map[state] || map.off;
    badge.textContent = m[0];
    badge.hidden = state === 'off';
    text.textContent = m[1];
  }

  function syncGet() {
    var c = syncCfg();
    var url = 'https://api.github.com/repos/' + c.owner + '/' + c.repo + '/contents/data.json';
    return fetch(url, { method: 'GET', headers: authHeaders() })
      .catch(function () { var e = new Error('network'); e.code = '网络'; throw e; })
      .then(function (res) {
        if (res.status === 404) return null;
        if (!res.ok) { var e = new Error('http' + res.status); e.code = res.status; throw e; }
        return res.json();
      })
      .then(function (obj) {
        if (!obj) return null;
        var raw = b64decodeUtf8(String(obj.content).replace(/\s+/g, ''));
        return { data: JSON.parse(raw), sha: obj.sha };
      });
  }

  // 合并云端的账到本地：按 id 合并，谁更新用谁，绝不互相覆盖（防止数据丢失）
  function mergeCloudIntoLocal(d) {
    if (!d) return;
    var localTagIds = {};
    tags.forEach(function (t) { if (t && t.id) localTagIds[t.id] = t; });
    (d.tags || []).forEach(function (t) {
      if (t && t.id && !localTagIds[t.id]) { tags.push(t); localTagIds[t.id] = t; }
    });
    (d.records || []).forEach(function (r) {
      if (!r || !r.id) return;
      var localR = null;
      for (var i = 0; i < records.length; i++) if (records[i].id === r.id) { localR = records[i]; break; }
      if (!localR) {
        records.push({ id: r.id, amount: r.amount, tagId: r.tagId || '', note: r.note || '', date: r.date || todayStr(), createdAt: r.createdAt || Date.now(), updatedAt: r.updatedAt || Date.now(), deleted: !!r.deleted });
      } else {
        var rt = r.updatedAt || r.createdAt || 0;
        var lt = localR.updatedAt || localR.createdAt || 0;
        if (rt > lt) {
          localR.amount = r.amount;
          localR.tagId = r.tagId || localR.tagId;
          localR.note = r.note;
          localR.date = r.date;
          if (r.deleted !== undefined) localR.deleted = !!r.deleted;
          if (r.updatedAt) localR.updatedAt = r.updatedAt;
        }
      }
    });
    records.sort(function (a, b) { return b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0); });
  }

  function syncPush() {
    var c = syncCfg();
    if (!syncConfigured()) return Promise.resolve({ ok: false, code: '未配置' });
    setSyncStatus('syncing');
    return syncGet().then(function (remote) {
      if (remote && remote.data) {
        var s = getSettings();
        var rt = remote.data.updatedAt || 0;
        if (rt > (s.updatedAt || 0)) { s.updatedAt = rt; setSettings(s); }
        mergeCloudIntoLocal(remote.data);
        saveTags(); saveRecords();
        refreshAll();
      }
      var body = buildSyncDoc();
      var payload = {
        message: '记账本同步 ' + new Date().toLocaleString('zh-CN'),
        content: b64encodeUtf8(JSON.stringify(body))
      };
      if (remote && remote.sha) payload.sha = remote.sha;
      return fetch('https://api.github.com/repos/' + c.owner + '/' + c.repo + '/contents/data.json', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      }).catch(function () { var e = new Error('network'); e.code = '网络'; throw e; });
    }).then(function (res) {
      if (!res || !res.ok) { var e = new Error('http' + (res && res.status)); e.code = res ? res.status : '网络'; throw e; }
      setSyncStatus('ok');
      return { ok: true };
    }).catch(function (e) {
      console.log('sync push error', e);
      setSyncStatus('error');
      return { ok: false, code: (e && e.code) || '网络' };
    });
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { syncPush(); }, SYNC_DEBOUNCE_MS);
  }

  function markDirty() {
    var s = getSettings();
    s.updatedAt = Date.now();
    setSettings(s);
    if (syncConfigured()) scheduleSync();
  }

  function refreshAll() {
    var active = document.querySelector('.view.is-active');
    var id = active ? active.id : 'view-input';
    if (id === 'view-input') { refreshMonthChip(); updateAmount(); }
    else if (id === 'view-records') { renderRecords(); }
    else if (id === 'view-settings') { renderTagManage(); renderSyncSettings(); }
    else if (id === 'view-tag') { renderTagGrid(); }
  }

  function ensureSyncRepo() {
    var c = syncCfg();
    if (!c.token || !c.repo) return Promise.resolve({ ok: false, code: '未配置' });
    return fetch('https://api.github.com/repos/' + c.owner + '/' + c.repo, { headers: authHeaders() })
      .then(function (res) {
        if (res.status === 404) {
          return fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ name: c.repo, private: true, description: '我的记账本数据仓库（自动创建）' })
          });
        }
        return res;
      })
      .then(function (res) { return { ok: res.ok || res.status === 201, code: res.status }; })
      .catch(function () { return { ok: false, code: '网络' }; });
  }

  function syncHint(code) {
    var map = {
      401: '令牌无效或没复制完整，请重新生成并整串复制',
      403: '令牌权限不够，生成时要勾选 repo',
      404: '用户名或仓库名不对',
      422: '仓库名已被占用，换一个名字',
      网络: '连不上 GitHub，请检查网络或换 Safari 试',
      未配置: '还没填令牌'
    };
    return map[code] || ('出错了（' + code + '）');
  }

  function tryAutoSync(attempt) {
    if (!syncConfigured()) { setSyncStatus('off'); return; }
    attempt = attempt || 0;
    setSyncStatus('syncing');
    ensureSyncRepo().then(function (r) {
      if (!r.ok) {
        setSyncStatus('error');
        if (attempt < 2) setTimeout(function () { tryAutoSync(attempt + 1); }, 4000);
        else toast('云仓库准备失败：' + syncHint(r.code));
        return;
      }
      syncPush().then(function (p) {
        if (!p.ok) {
          setSyncStatus('error');
          if (attempt < 2) setTimeout(function () { tryAutoSync(attempt + 1); }, 4000);
          else toast('同步失败：' + syncHint(p.code));
        } else setSyncStatus('ok');
      });
    }).catch(function () {
      setSyncStatus('error');
      if (attempt < 2) setTimeout(function () { tryAutoSync(attempt + 1); }, 4000);
    });
  }

  function saveSyncSettings() {
    var s = getSettings();
    s.syncOwner = ($('syncOwner').value || 'yx-1-s').trim();
    s.syncRepo = $('syncRepo').value.trim();
    s.syncToken = $('syncToken').value.trim();
    setSettings(s);
    renderSyncSettings();
    toast('同步设置已保存');
    tryAutoSync();
  }

  function syncNow() {
    if (!syncConfigured()) { toast('请先填写并保存同步设置'); return; }
    syncPush().then(function (p) {
      toast(p.ok ? '已上传到云端' : '上传失败：' + syncHint(p.code));
    });
  }

  function pullNow() {
    if (!syncConfigured()) { toast('请先填写并保存同步设置'); return; }
    setSyncStatus('syncing');
    syncGet().then(function (remote) {
      if (!remote || !remote.data) { toast('云端还没有数据'); setSyncStatus('off'); return; }
      var s = getSettings();
      var rt = remote.data.updatedAt || 0;
      if (rt > (s.updatedAt || 0)) { s.updatedAt = rt; setSettings(s); }
      mergeCloudIntoLocal(remote.data);
      saveTags(); saveRecords();
      if (selectedTagId == null) selectedTagId = tags[0] ? tags[0].id : null;
      refreshAll();
      setSyncStatus('ok');
      toast('已从云端合并 ' + visibleRecords().length + ' 笔账');
    }).catch(function (e) {
      setSyncStatus('error');
      toast('拉取失败：' + syncHint(e && e.code));
    });
  }

  function disableSync() {
    var s = getSettings();
    delete s.syncToken; delete s.syncRepo; delete s.syncOwner;
    setSettings(s);
    renderSyncSettings();
    setSyncStatus('off');
    toast('已关闭云同步');
  }

  function renderSyncSettings() {
    var s = getSettings();
    $('syncOwner').value = s.syncOwner || 'yx-1-s';
    $('syncRepo').value = s.syncRepo || '';
    $('syncToken').value = s.syncToken || '';
    setSyncStatus(syncConfigured() ? 'ok' : 'off');
  }

  /* ---------- 同步链接（换微信账号免重填） ---------- */
  function generateSyncLink() {
    var s = getSettings();
    if (!s.syncToken || !s.syncRepo) { toast('请先填写并保存云同步设置'); return; }
    var data = { owner: s.syncOwner || 'yx-1-s', repo: s.syncRepo, token: s.syncToken };
    var link = location.origin + location.pathname + '#sync=' + encodeURIComponent(JSON.stringify(data));
    var box = $('syncLink');
    box.value = link;
    $('syncLinkBox').hidden = false;
    try { localStorage.setItem(LS_SYNC_LINK, '#sync=' + encodeURIComponent(JSON.stringify(data))); } catch (e) {}
    box.focus();
    box.select();
  }

  function copySyncLink() {
    var box = $('syncLink');
    if (!box.value) { generateSyncLink(); return; }
    box.select();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(box.value).then(function () {
        toast('链接已复制，发给自己另一个微信打开即可');
      }, function () { toast('复制失败，请长按上面的链接复制'); });
    } else {
      try { document.execCommand('copy'); toast('链接已复制，发给自己另一个微信打开即可'); }
      catch (e) { toast('请长按上面的链接复制'); }
    }
  }

  function applySyncData(data) {
    var s = getSettings();
    s.syncOwner = data.owner || 'yx-1-s';
    s.syncRepo = data.repo || '';
    s.syncToken = data.token || '';
    setSettings(s);
  }

  function readSyncLink() {
    var h = location.hash || '';
    var m = h.match(/[#&]sync=([^&]+)/);
    if (m) {
      var data = null;
      try { data = JSON.parse(decodeURIComponent(m[1])); } catch (e) {}
      if (data) {
        applySyncData(data);
        // 记住这条链接：就算微信哪天清了数据，也能自动恢复，不用重填
        try { localStorage.setItem(LS_SYNC_LINK, h.slice(1)); } catch (e) {}
        toast('已通过链接配置云同步，正在连接…');
        return;
      }
    }
    // 网址里没带链接时，如果本地设置丢了、但存过同步链接，就自动恢复
    var cfg = syncCfg();
    if (!cfg.token || !cfg.repo) {
      var saved = null;
      try { saved = localStorage.getItem(LS_SYNC_LINK); } catch (e) {}
      if (saved) {
        var m2 = saved.match(/[#&]sync=([^&]+)/);
        if (m2) {
          try { applySyncData(JSON.parse(decodeURIComponent(m2[1]))); toast('已自动恢复云同步设置'); } catch (e) {}
        }
      }
    }
  }

  /* ---------- 键盘事件 ---------- */
  document.addEventListener('click', function (ev) {
    var k = ev.target.closest('.key');
    if (!k) return;
    var key = k.dataset.key;
    if (key) keyInput(key);
    else if (k.id === 'keypadConfirm') onConfirmAmount();
  });

  // 物理键盘支持（调试用）。注意：在输入框/备注框里打字时不能拦截，否则删除键会失效
  document.addEventListener('keydown', function (ev) {
    var el = ev.target;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
    if (ev.key >= '0' && ev.key <= '9') { keyInput(ev.key); ev.preventDefault(); }
    else if (ev.key === '.') { keyInput('.'); ev.preventDefault(); }
    else if (ev.key === 'Backspace') { keyInput('del'); ev.preventDefault(); }
    else if (ev.key === 'Enter') { onConfirmAmount(); }
  });

  /* ---------- 初始化 ---------- */
  function init() {
    loadData();
    selectedTagId = getSettings().lastTagId && findTag(getSettings().lastTagId) ? getSettings().lastTagId : (tags[0] ? tags[0].id : null);
    updateAmount();
    $('inputDate').textContent = cnDateLine(new Date());
    refreshMonthChip();
    var vEl = $('appVersion');
    if (vEl) vEl.textContent = '版本 ' + APP_VERSION + '（2026-08）';

    // 注册离线支持
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      try {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      } catch (e) {}
    }

    // 如果是通过"同步链接"打开的，先自动填好云同步设置
    readSyncLink();

    tryAutoSync();
  }

  init();

  // 暴露给 HTML 内联事件使用
  window.switchTab = switchTab;
  window.showRecords = showRecords;
  window.showSettings = showSettings;
  window.goBackToInput = goBackToInput;
  window.saveRecord = saveRecord;
  window.openDetail = openDetail;
  window.deleteRecord = deleteRecord;
  window.openTagEditor = openTagEditor;
  window.saveTagFromEditor = saveTagFromEditor;
  window.exportJSON = exportJSON;
  window.exportCSV = exportCSV;
  window.importJSON = importJSON;
  window.clearAll = clearAll;
  window.closeModal = closeModal;
  window.saveSyncSettings = saveSyncSettings;
  window.syncNow = syncNow;
  window.pullNow = pullNow;
  window.disableSync = disableSync;
  window.tryAutoSync = tryAutoSync;
  window.generateSyncLink = generateSyncLink;
  window.copySyncLink = copySyncLink;
  window.readSyncLink = readSyncLink;
  window.changeMonth = changeMonth;
})();
