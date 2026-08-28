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
    var EXPAND_CLS = "dshfc-expand-bar";
    var WRAPPER_CLS = "dshfc-wrapper";
    var COLLAPSE_CLS = "dshfc-collapse-bar";
    var GROUP_BAR_CLS = "dshfc-group-bar";
    var GROUP_BODY_CLS = "dshfc-group-body";
    var COLLAPSED_CLS = "dshfc-collapsed";
    var HIDDEN_CLS = "dshfc-hidden";
    var CSS_ID = "dshfc-css";

    var nextId = 1;
    var GAP_PX = 48;

    function cssRules() {
      return [
        // 展开内容：透明背景，仅淡描边圈出范围，不遮挡壁纸
        ".", WRAPPER_CLS, "{",
          "margin:4px 0;padding:8px 10px;",
          "border:1px solid rgba(255,255,255,.10);border-radius:10px;",
          "background:transparent;",
          "overflow-anchor:none",
        "}",
        ".", WRAPPER_CLS, ".", COLLAPSED_CLS, "{display:none!important}",
        // 子折叠条（透明 + 淡描边，hover 提示可点）
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
        // 组折叠条（第一级，比子条稍亮以区分层级，透明背景）
        ".", GROUP_BAR_CLS, "{",
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
        ".", GROUP_BAR_CLS, ":hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.30)}",
        ".", GROUP_BAR_CLS, " .dshfc-chevron{display:flex;align-items:center;flex-shrink:0;transition:transform .15s ease}",
        ".", GROUP_BAR_CLS, ".", COLLAPSED_CLS, " .dshfc-chevron{transform:none}",
        ".", GROUP_BAR_CLS, ":not(.", COLLAPSED_CLS, ") .dshfc-chevron{transform:rotate(90deg)}",
        ".", GROUP_BAR_CLS, " .dshfc-chevron svg{width:12px;height:12px;display:block}",
        ".", GROUP_BAR_CLS, " .dshfc-label{flex-shrink:0;font-weight:500}",
        ".", GROUP_BAR_CLS, " .dshfc-summary{opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
        // 组内容容器（缩进 + 淡竖线，体现层级）
        ".", GROUP_BODY_CLS, "{display:block;padding-left:12px;margin-left:6px;border-left:1px solid rgba(255,255,255,.10)}",
        ".", GROUP_BODY_CLS, ".", COLLAPSED_CLS, "{display:none!important}",
        // 收起条
        ".", COLLAPSE_CLS, "{",
          "display:flex;align-items:center;justify-content:center;gap:4px;",
          "padding:2px 0 4px;margin-bottom:4px;",
          "border-bottom:1px solid rgba(255,255,255,.08);",
          "cursor:pointer;user-select:none;opacity:.4;",
          "color:#999;font-size:11px;",
          "transition:opacity .15s ease",
        "}",
        ".", COLLAPSE_CLS, ":hover{opacity:.8}",
        ".", COLLAPSE_CLS, " .dshfc-chevron svg{width:10px;height:10px;display:block}",
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
      return text.length > 60 ? text.slice(0, 60) + "…" : text;
    }

    function escapeHtml(s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // 沿祖先链寻找实际滚动的容器
    function getScrollContainer(node) {
      var el = node.parentNode;
      while (el && el !== document.documentElement && el !== document.body) {
        var st = window.getComputedStyle(el);
        var oy = st.overflowY;
        if ((oy === "auto" || oy === "scroll" || oy === "overlay") && el.scrollHeight > el.clientHeight) {
          return el;
        }
        el = el.parentNode;
      }
      return document.scrollingElement || document.documentElement;
    }

    // 按视觉纵向位置排序（忽略 DOM 嵌套层级）
    function byVisualTop(a, b) {
      var ra = a.getBoundingClientRect();
      var rb = b.getBoundingClientRect();
      var dy = ra.top - rb.top;
      if (dy > 2 || dy < -2) return dy;
      return ra.left - rb.left;
    }

    // 两个元素是否"视觉相邻"：垂直间距小，说明中间没有正文/大段内容隔开
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

    // 找到元素的"流条目"祖先：即 data-chat-flow 容器的直接子元素
    function flowAnchor(node) {
      var n = node;
      while (n && n.parentNode) {
        var p = n.parentNode;
        if (p && p.hasAttribute && p.hasAttribute("data-chat-flow")) return n;
        n = p;
      }
      return node;
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

    function summaryFromLabels(labels) {
      var counts = {};
      var order = [];
      for (var i = 0; i < labels.length; i++) {
        var L = labels[i] || "折叠内容";
        if (!counts[L]) { counts[L] = 0; order.push(L); }
        counts[L]++;
      }
      if (order.length === 1) {
        return labels.length + " 项 · " + order[0] + " ×" + labels.length;
      }
      var parts = [];
      for (var j = 0; j < order.length; j++) {
        parts.push(order[j] + " ×" + counts[order[j]]);
      }
      return labels.length + " 项 · " + parts.join(" · ");
    }

    function buildElement(el) {
      el._dshfc_done = true;
      var id = nextId++;
      var label = getLabel(el);
      var preview = getPreview(el);

      var expandBar = document.createElement("div");
      expandBar.className = EXPAND_CLS;
      expandBar.setAttribute(PAIR_ATTR, id);
      expandBar.innerHTML = CHEVRON_RIGHT + '<span class="dshfc-label">' + label + '</span><span class="dshfc-preview">' + escapeHtml(preview) + '</span>';
      expandBar.onclick = function () { expand(pairEl(id)); };

      var wrapper = document.createElement("div");
      wrapper.className = WRAPPER_CLS + " " + COLLAPSED_CLS;
      wrapper.setAttribute(PAIR_ATTR, id);

      var collapseBar = document.createElement("div");
      collapseBar.className = COLLAPSE_CLS;
      collapseBar.innerHTML = CHEVRON_UP + "收起";
      collapseBar.onclick = function (e) { e.stopPropagation(); collapse(pairEl(id)); };

      wrapper.addEventListener("click", function (e) {
        if (e.target === collapseBar || collapseBar.contains(e.target)) return;
        var tag = (e.target.tagName || "").toLowerCase();
        if (tag === "a" || tag === "button" || tag === "input" || tag === "textarea" || tag === "select") return;
        collapse(pairEl(id));
      });

      wrapper.appendChild(collapseBar);
      return { expandBar: expandBar, wrapper: wrapper };
    }

    function processSingle(el) {
      var b = buildElement(el);
      var parent = el.parentNode;
      parent.insertBefore(b.wrapper, el);
      b.wrapper.appendChild(el);
      parent.insertBefore(b.expandBar, b.wrapper);
    }

    function processGroup(group) {
      if (group.length === 1) {
        processSingle(group[0]);
        return;
      }

      var first = group[0];
      var anchor = flowAnchor(first);
      var parent = anchor.parentNode || first.parentNode;
      var groupId = nextId++;

      var groupBar = document.createElement("div");
      groupBar.className = GROUP_BAR_CLS + " " + COLLAPSED_CLS;
      groupBar.setAttribute(PAIR_ATTR, groupId);
      groupBar.innerHTML = CHEVRON_RIGHT + '<span class="dshfc-label">折叠内容</span><span class="dshfc-summary">' + escapeHtml(groupSummary(group)) + '</span>';
      groupBar.onclick = function () { toggleGroup(groupId); };

      var groupBody = document.createElement("div");
      groupBody.className = GROUP_BODY_CLS + " " + COLLAPSED_CLS;
      groupBody.setAttribute(PAIR_ATTR, groupId);

      parent.insertBefore(groupBar, anchor);
      parent.insertBefore(groupBody, anchor);

      for (var i = 0; i < group.length; i++) {
        var b = buildElement(group[i]);
        b.wrapper.appendChild(group[i]);
        groupBody.appendChild(b.expandBar);
        groupBody.appendChild(b.wrapper);
      }
    }

    function pairEl(id) {
      var nodes = document.querySelectorAll("[" + PAIR_ATTR + '="' + id + '"]');
      var expandBar = null, wrapper = null;
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].classList.contains(EXPAND_CLS)) expandBar = nodes[i];
        else if (nodes[i].classList.contains(WRAPPER_CLS)) wrapper = nodes[i];
      }
      return { expandBar: expandBar, wrapper: wrapper };
    }

    function expand(pair) {
      if (!pair.wrapper || !pair.expandBar) return;
      var sc = getScrollContainer(pair.expandBar);
      var beforeTop = pair.expandBar.getBoundingClientRect().top;
      pair.wrapper.classList.remove(COLLAPSED_CLS);
      pair.expandBar.classList.add(HIDDEN_CLS);
      var afterTop = pair.wrapper.getBoundingClientRect().top;
      var delta = afterTop - beforeTop;
      if (delta) sc.scrollTop += delta;
    }

    function collapse(pair) {
      if (!pair.wrapper || !pair.expandBar) return;
      var sc = getScrollContainer(pair.wrapper);
      var first = pair.wrapper.firstElementChild;
      var beforeTop = (first || pair.wrapper).getBoundingClientRect().top;
      pair.wrapper.classList.add(COLLAPSED_CLS);
      pair.expandBar.classList.remove(HIDDEN_CLS);
      var afterTop = pair.expandBar.getBoundingClientRect().top;
      var delta = afterTop - beforeTop;
      if (delta) sc.scrollTop += delta;
    }

    function toggleGroup(id) {
      var nodes = document.querySelectorAll("[" + PAIR_ATTR + '="' + id + '"]');
      var bar = null, body = null;
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].classList.contains(GROUP_BAR_CLS)) bar = nodes[i];
        else if (nodes[i].classList.contains(GROUP_BODY_CLS)) body = nodes[i];
      }
      if (!bar || !body) return;

      var collapsed = body.classList.contains(COLLAPSED_CLS);
      var sc = getScrollContainer(bar);
      var beforeTop = bar.getBoundingClientRect().top;
      if (collapsed) {
        bar.classList.remove(COLLAPSED_CLS);
        body.classList.remove(COLLAPSED_CLS);
      } else {
        bar.classList.add(COLLAPSED_CLS);
        body.classList.add(COLLAPSED_CLS);
      }
      var afterTop = bar.getBoundingClientRect().top;
      var delta = afterTop - beforeTop;
      if (delta) sc.scrollTop += delta;
    }

    // 合并相邻的"独立折叠条"成组（流式场景的安全网：元素逐条到达时补一次归组）
    function mergeIntoGroup(bars) {
      if (bars.length < 2) return;
      var labels = [];
      var wrappers = [];
      for (var i = 0; i < bars.length; i++) {
        var labelEl = bars[i].querySelector(".dshfc-label");
        labels.push(labelEl ? labelEl.textContent.trim() : "折叠内容");
        var pr = pairEl(bars[i].getAttribute(PAIR_ATTR));
        wrappers.push(pr.wrapper);
      }

      var groupId = nextId++;
      var groupBar = document.createElement("div");
      groupBar.className = GROUP_BAR_CLS + " " + COLLAPSED_CLS;
      groupBar.setAttribute(PAIR_ATTR, groupId);
      groupBar.innerHTML = CHEVRON_RIGHT + '<span class="dshfc-label">折叠内容</span><span class="dshfc-summary">' + escapeHtml(summaryFromLabels(labels)) + '</span>';
      groupBar.onclick = function () { toggleGroup(groupId); };

      var groupBody = document.createElement("div");
      groupBody.className = GROUP_BODY_CLS + " " + COLLAPSED_CLS;
      groupBody.setAttribute(PAIR_ATTR, groupId);

      var anchor = flowAnchor(bars[0]);
      var parent = anchor.parentNode || bars[0].parentNode;
      parent.insertBefore(groupBar, anchor);
      parent.insertBefore(groupBody, anchor);

      for (var j = 0; j < bars.length; j++) {
        if (bars[j].parentNode) bars[j].parentNode.removeChild(bars[j]);
        if (wrappers[j] && wrappers[j].parentNode) wrappers[j].parentNode.removeChild(wrappers[j]);
        groupBody.appendChild(bars[j]);
        if (wrappers[j]) groupBody.appendChild(wrappers[j]);
      }
    }

    function reGroup() {
      var bars = document.querySelectorAll("." + EXPAND_CLS);
      if (bars.length < 2) return;
      var standalone = [];
      for (var i = 0; i < bars.length; i++) {
        var p = bars[i].parentNode;
        if (p && p.classList && p.classList.contains(GROUP_BODY_CLS)) continue;
        standalone.push(bars[i]);
      }
      if (standalone.length < 2) return;

      standalone.sort(byVisualTop);
      var groups = [];
      for (var k = 0; k < standalone.length; k++) {
        var last = groups[groups.length - 1];
        if (last && geomClose(last[last.length - 1], standalone[k])) {
          last.push(standalone[k]);
        } else {
          groups.push([standalone[k]]);
        }
      }
      for (var g = 0; g < groups.length; g++) {
        if (groups[g].length >= 2) mergeIntoGroup(groups[g]);
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
      reGroup();
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
