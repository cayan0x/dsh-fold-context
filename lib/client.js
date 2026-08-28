window.__ModuleLoader__.load({
  id: "dsh-fold-context",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    var TARGETS = [
      { sel: '[data-context-injection-body]',       label: '上下文注入' },
      { sel: '[data-chat-flow-kind="tool-call"]',   label: '工具调用'   },
      { sel: '[data-chat-flow-kind="tool-result"]',  label: '工具结果'   },
      { sel: '[data-variant="think"]',               label: '思考'       },
    ];
    var PAIR_ATTR = "data-dshfc-pair";
    var TARGET_CLS = "dshfc-target";
    var EXPAND_CLS = "dshfc-expand-bar";
    var GROUP_CLS = "dshfc-group-bar";
    var COLLAPSED_CLS = "dshfc-collapsed";
    var HIDDEN_CLS = "dshfc-hidden";
    var CSS_ID = "dshfc-css";

    var nextId = 1;
    var GAP_PX = 48;

    function cssRules() {
      return [
        // 折叠条（透明 + 淡描边，hover 提示可点）
        ".", EXPAND_CLS, "{",
          "display:flex;align-items:center;gap:6px;",
          "padding:4px 10px;margin:1px 0;",
          "border-radius:6px;",
          "border:1px solid rgba(255,255,255,.10);",
          "background:rgba(255,255,255,.04);",
          "color:#999;font-size:12px;line-height:1.5;",
          "cursor:pointer;user-select:none;",
          "overflow-anchor:none;",
          "transition:background .15s ease,color .15s ease,border-color .15s ease",
        "}",
        ".", EXPAND_CLS, ":hover{background:rgba(255,255,255,.09);color:#ccc;border-color:rgba(255,255,255,.22)}",
        ".", EXPAND_CLS, ".", HIDDEN_CLS, "{display:none!important}",
        ".", EXPAND_CLS, " .dshfc-chevron{display:flex;align-items:center;flex-shrink:0}",
        ".", EXPAND_CLS, " .dshfc-chevron svg{width:12px;height:12px;display:block}",
        ".", EXPAND_CLS, " .dshfc-label{flex-shrink:0}",
        ".", EXPAND_CLS, " .dshfc-preview{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.65}",
        // 目标元素折叠
        ".", TARGET_CLS, ".", COLLAPSED_CLS, "{display:none!important}",
        // 组折叠条（第一级，比子条稍亮以区分层级，透明背景）
        ".", GROUP_CLS, "{",
          "display:flex;align-items:center;gap:6px;",
          "padding:5px 12px;margin:2px 0 0 0;",
          "border-radius:8px;",
          "border:1px solid rgba(255,255,255,.18);",
          "background:rgba(255,255,255,.06);",
          "color:#bbb;font-size:12px;line-height:1.5;",
          "cursor:pointer;user-select:none;",
          "overflow-anchor:none;",
          "transition:background .15s ease,border-color .15s ease",
        "}",
        ".", GROUP_CLS, ":hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.30)}",
        ".", GROUP_CLS, " .dshfc-chevron{display:flex;align-items:center;flex-shrink:0;transition:transform .15s ease}",
        ".", GROUP_CLS, ".", COLLAPSED_CLS, " .dshfc-chevron{transform:none}",
        ".", GROUP_CLS, ":not(.", COLLAPSED_CLS, ") .dshfc-chevron{transform:rotate(90deg)}",
        ".", GROUP_CLS, " .dshfc-chevron svg{width:12px;height:12px;display:block}",
        ".", GROUP_CLS, " .dshfc-label{flex-shrink:0;font-weight:500}",
        ".", GROUP_CLS, " .dshfc-summary{opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
        ".", GROUP_CLS, ".", HIDDEN_CLS, "{display:none!important}",
        // 收起按钮
        ".dshfc-collapse-btn{",
          "display:flex;align-items:center;justify-content:center;gap:4px;",
          "padding:2px 0 4px;margin-bottom:4px;",
          "border-bottom:1px solid rgba(255,255,255,.08);",
          "cursor:pointer;user-select:none;opacity:.4;",
          "color:#999;font-size:11px;",
          "transition:opacity .15s ease",
        "}",
        ".dshfc-collapse-btn:hover{opacity:.8}",
        ".dshfc-collapse-btn .dshfc-chevron svg{width:10px;height:10px;display:block}",
        ".dshfc-collapse-btn.", HIDDEN_CLS, "{display:none!important}",
      ].join("");
    }

    var CHEVRON_RIGHT =
      '<span class="dshfc-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg></span>';
    var CHEVRON_UP =
      '<span class="dshfc-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg></span>';

    function getLabel(el) {
      for (var i = 0; i < TARGETS.length; i++) {
        if (el.matches(TARGETS[i].sel)) return TARGETS[i].label;
      }
      return "折叠内容";
    }

    function getPreview(el) {
      var text = (el.textContent || "").trim().replace(/\s+/g, " ");
      return text.length > 60 ? text.slice(0, 60) + "\u2026" : text;
    }

    function escapeHtml(s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function byVisualTop(a, b) {
      var ra = a.getBoundingClientRect();
      var rb = b.getBoundingClientRect();
      var dy = ra.top - rb.top;
      if (dy > 2 || dy < -2) return dy;
      return ra.left - rb.left;
    }

    function geomClose(a, b) {
      var ra = a.getBoundingClientRect();
      var rb = b.getBoundingClientRect();
      if ((ra.width === 0 && ra.height === 0) || (rb.width === 0 && rb.height === 0)) return false;
      var gap = rb.top - ra.bottom;
      return gap >= -4 && gap <= GAP_PX;
    }

    function collectFoldElements() {
      var list = [];
      for (var i = 0; i < TARGETS.length; i++) {
        var nodes = document.querySelectorAll(TARGETS[i].sel);
        for (var j = 0; j < nodes.length; j++) {
          if (!nodes[j]._dshfc_done && list.indexOf(nodes[j]) === -1) {
            list.push(nodes[j]);
          }
        }
      }
      list.sort(byVisualTop);
      return list;
    }

    function groupElements(list) {
      var groups = [];
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        var last = groups[groups.length - 1];
        if (last && geomClose(last[last.length - 1], el)) {
          last.push(el);
        } else {
          groups.push([el]);
        }
      }
      return groups;
    }

    function groupSummary(group) {
      var counts = {};
      var order = [];
      for (var i = 0; i < group.length; i++) {
        var label = getLabel(group[i]);
        if (!counts[label]) { counts[label] = 0; order.push(label); }
        counts[label]++;
      }
      if (order.length === 1) {
        return group.length + " 项 · " + order[0] + " ×" + group.length;
      }
      var parts = [];
      for (var j = 0; j < order.length; j++) {
        parts.push(order[j] + " ×" + counts[order[j]]);
      }
      return group.length + " 项 · " + parts.join(" · ");
    }

    // 处理单个元素：折叠条作为兄弟节点插入，目标元素留原位 + 加折叠 class
    function processElement(el) {
      el._dshfc_done = true;
      var id = nextId++;
      var label = getLabel(el);
      var preview = getPreview(el);

      var expandBar = document.createElement("div");
      expandBar.className = EXPAND_CLS;
      expandBar.setAttribute(PAIR_ATTR, id);
      expandBar.innerHTML = CHEVRON_RIGHT + '<span class="dshfc-label">' + label + '</span><span class="dshfc-preview">' + escapeHtml(preview) + '</span>';
      expandBar.onclick = function () { expandElement(id); };

      el.classList.add(TARGET_CLS, COLLAPSED_CLS);
      el.setAttribute(PAIR_ATTR, id);

      el.parentNode.insertBefore(expandBar, el);
    }

    // 展开单个元素
    function expandElement(id) {
      var el = document.querySelector('.' + TARGET_CLS + '[' + PAIR_ATTR + '="' + id + '"]');
      var bar = document.querySelector('.' + EXPAND_CLS + '[' + PAIR_ATTR + '="' + id + '"]');
      if (el) el.classList.remove(COLLAPSED_CLS);
      if (bar) bar.classList.add(HIDDEN_CLS);
    }

    // 收起单个元素
    function collapseElement(id) {
      var el = document.querySelector('.' + TARGET_CLS + '[' + PAIR_ATTR + '="' + id + '"]');
      var bar = document.querySelector('.' + EXPAND_CLS + '[' + PAIR_ATTR + '="' + id + '"]');
      if (el) el.classList.add(COLLAPSED_CLS);
      if (bar) bar.classList.remove(HIDDEN_CLS);
    }

    // 处理一组元素：各自生成独立折叠条，再在最前面插入一个组折叠条
    function processGroup(group) {
      if (group.length === 1) {
        processElement(group[0]);
        return;
      }

      var pairIds = [];
      for (var i = 0; i < group.length; i++) {
        processElement(group[i]);
        pairIds.push(group[i].getAttribute(PAIR_ATTR));
      }

      var groupId = nextId++;
      var groupBar = document.createElement("div");
      groupBar.className = GROUP_CLS + " " + COLLAPSED_CLS;
      groupBar.setAttribute(PAIR_ATTR, groupId);
      groupBar.innerHTML = CHEVRON_RIGHT + '<span class="dshfc-label">折叠内容</span><span class="dshfc-summary">' + escapeHtml(groupSummary(group)) + '</span>';
      groupBar._dshfc_pair_ids = pairIds;

      // 收起按钮
      var collapseBtn = document.createElement("div");
      collapseBtn.className = "dshfc-collapse-btn " + HIDDEN_CLS;
      collapseBtn.innerHTML = CHEVRON_UP + "收起";
      collapseBtn._dshfc_group_id = groupId;

      groupBar.onclick = function () { toggleGroup(groupId, pairIds, collapseBtn); };
      collapseBtn.onclick = function (e) { e.stopPropagation(); toggleGroup(groupId, pairIds, collapseBtn); };

      // 组折叠条和收起按钮都插入到第一个元素前面
      var firstEl = group[0];
      firstEl.parentNode.insertBefore(collapseBtn, firstEl);
      firstEl.parentNode.insertBefore(groupBar, firstEl);
    }

    // 切换组的展开/收起
    function toggleGroup(groupId, pairIds, collapseBtn) {
      var groupBar = document.querySelector('.' + GROUP_CLS + '[' + PAIR_ATTR + '="' + groupId + '"]');
      if (!groupBar) return;

      var isCollapsed = groupBar.classList.contains(COLLAPSED_CLS);

      if (isCollapsed) {
        // 展开组
        groupBar.classList.remove(COLLAPSED_CLS);
        if (collapseBtn) collapseBtn.classList.remove(HIDDEN_CLS);
        for (var i = 0; i < pairIds.length; i++) {
          var el = document.querySelector('.' + TARGET_CLS + '[' + PAIR_ATTR + '="' + pairIds[i] + '"]');
          var bar = document.querySelector('.' + EXPAND_CLS + '[' + PAIR_ATTR + '="' + pairIds[i] + '"]');
          if (el) el.classList.remove(COLLAPSED_CLS);
          if (bar) bar.classList.add(HIDDEN_CLS);
        }
      } else {
        // 收起组
        groupBar.classList.add(COLLAPSED_CLS);
        if (collapseBtn) collapseBtn.classList.add(HIDDEN_CLS);
        for (var j = 0; j < pairIds.length; j++) {
          var el2 = document.querySelector('.' + TARGET_CLS + '[' + PAIR_ATTR + '="' + pairIds[j] + '"]');
          var bar2 = document.querySelector('.' + EXPAND_CLS + '[' + PAIR_ATTR + '="' + pairIds[j] + '"]');
          if (el2) el2.classList.add(COLLAPSED_CLS);
          if (bar2) bar2.classList.remove(HIDDEN_CLS);
        }
      }
    }

    function scanAndProcess() {
      var list = collectFoldElements();
      if (list.length) {
        var groups = groupElements(list);
        for (var i = 0; i < groups.length; i++) {
          processGroup(groups[i]);
        }
      }
    }

    function apply(ctx) {
      var style = document.getElementById(CSS_ID);
      if (!style) {
        style = document.createElement("style");
        style.id = CSS_ID;
        style.textContent = cssRules();
        (document.head || document.documentElement).appendChild(style);
      }

      function whenReady(cb) {
        if (document.body) { cb(); return; }
        var timer = setInterval(function () {
          if (document.body) { clearInterval(timer); cb(); }
        }, 50);
      }

      var observer = null;
      var timerId = 0;

      function scheduleScan() {
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(function () {
          timerId = 0;
          scanAndProcess();
        }, 500);
      }

      whenReady(function () {
        scanAndProcess();
        observer = new MutationObserver(scheduleScan);
        observer.observe(document.body, { childList: true, subtree: true });
      });

      if (ctx && typeof ctx.effect === "function") {
        ctx.effect(function () {
          return function () {
            if (timerId) clearTimeout(timerId);
            if (observer) observer.disconnect();
            var s = document.getElementById(CSS_ID);
            if (s && s.parentNode) s.parentNode.removeChild(s);
          };
        }, "dsh-fold-context");
      }
    }

    exports.apply = apply;
    return module.exports;
  },
});