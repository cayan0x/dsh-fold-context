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

    var TARGET_CLS = "dshfc-target";
    var EXPAND_CLS = "dshfc-expand-bar";
    var COLLAPSE_CLS = "dshfc-collapse-bar";
    var COLLAPSED_CLS = "dshfc-collapsed";
    var HIDDEN_CLS = "dshfc-hidden";
    var OVERLAY_ID = "dshfc-overlay";
    var CSS_ID = "dshfc-css";

    var nextId = 1;
    var GAP_PX = 48;

    // 折叠单元：{ els: [element,...], bar: 折叠条, collapseBar: 收起条, expanded: bool }
    var units = [];

    function cssRules() {
      return [
        // 覆盖层：挂在 body 下、React 根节点之外，fixed 定位跟随视口
        "#", OVERLAY_ID, "{",
          "position:fixed;top:0;left:0;width:0;height:0;z-index:1;pointer-events:none",
        "}",
        // 折叠条（展开按钮）
        ".", EXPAND_CLS, "{",
          "position:absolute;",
          "display:flex;align-items:center;gap:6px;",
          "padding:4px 10px;margin:1px 0;",
          "border-radius:6px;",
          "border:1px solid rgba(255,255,255,.10);",
          "background:rgba(255,255,255,.04);",
          "color:#999;font-size:12px;line-height:1.5;",
          "cursor:pointer;user-select:none;",
          "pointer-events:auto;",
          "transition:background .15s ease,color .15s ease,border-color .15s ease",
        "}",
        ".", EXPAND_CLS, ":hover{background:rgba(255,255,255,.09);color:#ccc;border-color:rgba(255,255,255,.22)}",
        ".", EXPAND_CLS, ".", HIDDEN_CLS, "{display:none!important}",
        ".", EXPAND_CLS, " .dshfc-chevron{display:flex;align-items:center;flex-shrink:0}",
        ".", EXPAND_CLS, " .dshfc-chevron svg{width:12px;height:12px;display:block}",
        ".", EXPAND_CLS, " .dshfc-label{flex-shrink:0}",
        ".", EXPAND_CLS, " .dshfc-preview{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.65}",
        // 收起条
        ".", COLLAPSE_CLS, "{",
          "position:absolute;",
          "display:flex;align-items:center;justify-content:center;gap:4px;",
          "padding:2px 0 4px;margin-bottom:4px;",
          "border-bottom:1px solid rgba(255,255,255,.08);",
          "cursor:pointer;user-select:none;opacity:.4;",
          "pointer-events:auto;",
          "color:#999;font-size:11px;",
          "transition:opacity .15s ease",
        "}",
        ".", COLLAPSE_CLS, ":hover{opacity:.8}",
        ".", COLLAPSE_CLS, " .dshfc-chevron svg{width:10px;height:10px;display:block}",
        ".", COLLAPSE_CLS, ".", HIDDEN_CLS, "{display:none!important}",
        // 目标元素折叠：height:0 而非 display:none，保证元素仍可测量位置，且不破坏 React 树
        ".", TARGET_CLS, ".", COLLAPSED_CLS, "{",
          "height:0!important;min-height:0!important;max-height:0!important;",
          "overflow:hidden!important;",
          "padding-top:0!important;padding-bottom:0!important;",
          "margin-top:0!important;margin-bottom:0!important;",
          "border-top-width:0!important;border-bottom-width:0!important",
        "}",
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

    function getOverlay() {
      var overlay = document.getElementById(OVERLAY_ID);
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = OVERLAY_ID;
        document.body.appendChild(overlay);
      }
      return overlay;
    }

    // 找到实际滚动的容器（只读遍历，安全）
    function getScrollContainer() {
      var el = document.body;
      // 常见滚动容器：优先找 DSH 对话滚动区
      var chatFlow = document.querySelector("[data-chat-flow]");
      if (chatFlow) {
        var n = chatFlow.parentNode;
        while (n && n !== document.documentElement && n !== document.body) {
          var st = window.getComputedStyle(n);
          var oy = st.overflowY;
          if ((oy === "auto" || oy === "scroll" || oy === "overlay") && n.scrollHeight > n.clientHeight) {
            return n;
          }
          n = n.parentNode;
        }
      }
      return document.scrollingElement || document.documentElement;
    }

    // 定位折叠条/收起条到元素当前视口位置
    function placeBar(bar, el) {
      var r = el.getBoundingClientRect();
      bar.style.top = r.top + "px";
      bar.style.left = r.left + "px";
      if (r.width > 0) bar.style.width = r.width + "px";
    }

    function expandUnit(unit) {
      if (!unit.expanded) return;
      var i, el;
      for (i = 0; i < unit.els.length; i++) {
        unit.els[i].classList.remove(COLLAPSED_CLS);
      }
      unit.bar.classList.add(HIDDEN_CLS);
      if (unit.collapseBar) {
        unit.collapseBar.classList.remove(HIDDEN_CLS);
        placeBar(unit.collapseBar, unit.els[0]);
      }
      unit.expanded = false;
    }

    function collapseUnit(unit) {
      if (unit.expanded) return;
      var i;
      for (i = 0; i < unit.els.length; i++) {
        unit.els[i].classList.add(COLLAPSED_CLS);
      }
      unit.bar.classList.remove(HIDDEN_CLS);
      placeBar(unit.bar, unit.els[0]);
      if (unit.collapseBar) unit.collapseBar.classList.add(HIDDEN_CLS);
      unit.expanded = true;
    }

    function buildUnit(group) {
      var overlay = getOverlay();

      var bar = document.createElement("div");
      bar.className = EXPAND_CLS;
      if (group.length === 1) {
        bar.innerHTML = CHEVRON_RIGHT + '<span class="dshfc-label">' + getLabel(group[0]) + '</span><span class="dshfc-preview">' + escapeHtml(getPreview(group[0])) + '</span>';
      } else {
        bar.innerHTML = CHEVRON_RIGHT + '<span class="dshfc-label">折叠内容</span><span class="dshfc-summary">' + escapeHtml(groupSummary(group)) + '</span>';
      }

      var collapseBar = document.createElement("div");
      collapseBar.className = COLLAPSE_CLS + " " + HIDDEN_CLS;
      collapseBar.innerHTML = CHEVRON_UP + "收起";

      var unit = { els: group, bar: bar, collapseBar: collapseBar, expanded: true };

      bar.onclick = function () { expandUnit(unit); };
      collapseBar.onclick = function (e) { e.stopPropagation(); collapseUnit(unit); };

      // 折叠所有元素 + 标记
      for (var i = 0; i < group.length; i++) {
        group[i]._dshfc_done = true;
        group[i].classList.add(TARGET_CLS, COLLAPSED_CLS);
      }

      overlay.appendChild(collapseBar);
      overlay.appendChild(bar);
      placeBar(bar, group[0]);

      units.push(unit);
    }

    // 滚动/内容变化时重新定位所有折叠条
    function repositionAll() {
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        // 折叠单元的元素若被 React 卸载，清理对应 UI
        if (!u.els[0] || !u.els[0].isConnected) {
          if (u.bar && u.bar.parentNode) u.bar.parentNode.removeChild(u.bar);
          if (u.collapseBar && u.collapseBar.parentNode) u.collapseBar.parentNode.removeChild(u.collapseBar);
          units.splice(i, 1);
          i--;
          continue;
        }
        if (u.expanded) {
          placeBar(u.bar, u.els[0]);
        } else {
          placeBar(u.collapseBar, u.els[0]);
        }
      }
    }

    function scanAndProcess() {
      var list = collectFoldElements();
      if (list.length) {
        var groups = groupElements(list);
        for (var i = 0; i < groups.length; i++) {
          buildUnit(groups[i]);
        }
      }
      repositionAll();
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
      var rafId = 0;

      function scheduleScan() {
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(function () {
          timerId = 0;
          scanAndProcess();
        }, 500);
      }

      function scheduleReposition() {
        if (rafId) return;
        rafId = requestAnimationFrame(function () {
          rafId = 0;
          repositionAll();
        });
      }

      whenReady(function () {
        scanAndProcess();

        observer = new MutationObserver(scheduleScan);
        observer.observe(document.body, { childList: true, subtree: true });

        var sc = getScrollContainer();
        if (sc && sc !== document.scrollingElement && sc !== document.documentElement) {
          sc.addEventListener("scroll", scheduleReposition, { passive: true });
        }
        window.addEventListener("scroll", scheduleReposition, { passive: true });
        window.addEventListener("resize", scheduleReposition, { passive: true });
      });

      if (ctx && typeof ctx.effect === "function") {
        ctx.effect(function () {
          return function () {
            if (timerId) clearTimeout(timerId);
            if (rafId) cancelAnimationFrame(rafId);
            if (observer) observer.disconnect();

            var sc = getScrollContainer();
            if (sc && sc !== document.scrollingElement && sc !== document.documentElement) {
              sc.removeEventListener("scroll", scheduleReposition);
            }
            window.removeEventListener("scroll", scheduleReposition);
            window.removeEventListener("resize", scheduleReposition);

            var overlay = document.getElementById(OVERLAY_ID);
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            var s = document.getElementById(CSS_ID);
            if (s && s.parentNode) s.parentNode.removeChild(s);

            units = [];
          };
        }, "dsh-fold-context");
      }
    }

    exports.apply = apply;
    return module.exports;
  },
});