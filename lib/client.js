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

    // 折叠条用目标元素自身的 ::before 伪元素渲染，处在文档流中，
    // 占真实布局空间：跟随滚动、不与正文重叠。
    // 对 React 零侵入：只加 class / data 属性，不插入任何 DOM 节点。
    var TARGET_CLS = "dshfc-target";
    var CLOSED_CLS = "dshfc-closed";   // 折叠态（加在组内首个成员上，显示折叠条）
    var OPEN_CLS = "dshfc-open";       // 展开态（加在组内首个成员上，顶部显示收起条）
    var ABSENT_CLS = "dshfc-absent";   // 折叠态（加在组内其余成员上，整体隐藏）
    var BAR_ATTR = "data-dshfc-bar";   // 折叠条文案
    var CSS_ID = "dshfc-css";

    var GAP_PX = 48;

    // 折叠单元：{ els: [element,...], open: bool }
    var units = [];

    function cssRules() {
      return [
        ".", TARGET_CLS, "{position:relative}",
        // 折叠态：隐藏自身内容，用 ::before 显示折叠条
        ".", CLOSED_CLS, "{cursor:pointer}",
        ".", CLOSED_CLS, " > *{display:none!important}",
        ".", CLOSED_CLS, "::before{",
          "content:'\\25B8  ' attr(", BAR_ATTR, ");",
          "display:block;",
          "padding:4px 10px;margin:1px 0;",
          "border-radius:6px;",
          "border:1px solid rgba(255,255,255,.10);",
          "background:rgba(255,255,255,.04);",
          "color:#999;font-size:12px;line-height:1.5;",
          "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
          "cursor:pointer;user-select:none;",
          "transition:background .15s ease,color .15s ease,border-color .15s ease",
        "}",
        ".", CLOSED_CLS, ":hover::before{",
          "background:rgba(255,255,255,.09);color:#ccc;border-color:rgba(255,255,255,.22)",
        "}",
        // 展开态：内容上方显示收起条
        ".", OPEN_CLS, "::before{",
          "content:'\\25B4 收起';",
          "display:block;text-align:center;",
          "padding:2px 0 4px;margin-bottom:4px;",
          "border-bottom:1px solid rgba(255,255,255,.08);",
          "cursor:pointer;user-select:none;opacity:.4;",
          "color:#999;font-size:11px;",
          "transition:opacity .15s ease",
        "}",
        ".", OPEN_CLS, ":hover::before{opacity:.8}",
        // 组内其余成员：折叠时整体隐藏
        ".", ABSENT_CLS, "{display:none!important}",
      ].join("");
    }

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

    function barText(group) {
      if (group.length === 1) {
        return getLabel(group[0]) + " · " + getPreview(group[0]);
      }
      return "折叠内容 " + groupSummary(group);
    }

    function expandUnit(unit) {
      if (unit.open) return;
      unit.open = true;
      unit.els[0].classList.remove(CLOSED_CLS);
      unit.els[0].classList.add(OPEN_CLS);
      for (var i = 1; i < unit.els.length; i++) {
        unit.els[i].classList.remove(ABSENT_CLS);
      }
    }

    function collapseUnit(unit) {
      if (!unit.open) return;
      unit.open = false;
      unit.els[0].classList.add(CLOSED_CLS);
      unit.els[0].classList.remove(OPEN_CLS);
      for (var i = 1; i < unit.els.length; i++) {
        unit.els[i].classList.add(ABSENT_CLS);
      }
    }

    function buildUnit(group) {
      var unit = { els: group, open: false };

      for (var i = 0; i < group.length; i++) {
        group[i]._dshfc_done = true;
        group[i]._dshfc_unit = unit;
        group[i].classList.add(TARGET_CLS);
      }
      group[0].setAttribute(BAR_ATTR, barText(group));
      group[0].classList.add(CLOSED_CLS);
      for (var j = 1; j < group.length; j++) {
        group[j].classList.add(ABSENT_CLS);
      }

      units.push(unit);
    }

    // React 重渲染可能重写 class / 卸载节点，定期修复或清理
    function healUnits() {
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        if (!u.els[0] || !u.els[0].isConnected) {
          units.splice(i, 1);
          i--;
          continue;
        }
        for (var j = 0; j < u.els.length; j++) {
          var el = u.els[j];
          if (!el.classList.contains(TARGET_CLS)) el.classList.add(TARGET_CLS);
          if (j === 0) {
            if (!el.hasAttribute(BAR_ATTR)) el.setAttribute(BAR_ATTR, barText(u.els));
            if (u.open) {
              if (!el.classList.contains(OPEN_CLS)) el.classList.add(OPEN_CLS);
            } else if (!el.classList.contains(CLOSED_CLS)) {
              el.classList.add(CLOSED_CLS);
            }
          } else if (!u.open && !el.classList.contains(ABSENT_CLS)) {
            el.classList.add(ABSENT_CLS);
          }
        }
      }
    }

    function scanAndProcess() {
      healUnits();
      var list = collectFoldElements();
      if (list.length) {
        var groups = groupElements(list);
        for (var i = 0; i < groups.length; i++) {
          buildUnit(groups[i]);
        }
      }
    }

    // 事件委托：点击折叠条展开，点击收起条收起
    function onClick(e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var closed = t.closest("." + CLOSED_CLS);
      if (closed && closed._dshfc_unit) {
        expandUnit(closed._dshfc_unit);
        return;
      }
      var open = t.closest("." + OPEN_CLS);
      // 收起条是首个成员顶部的 ::before，点击它时 target 即该元素本身
      if (open && open._dshfc_unit && t === open && e.offsetY <= 32) {
        collapseUnit(open._dshfc_unit);
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

        document.addEventListener("click", onClick, true);
      });

      if (ctx && typeof ctx.effect === "function") {
        ctx.effect(function () {
          return function () {
            if (timerId) clearTimeout(timerId);
            if (observer) observer.disconnect();
            document.removeEventListener("click", onClick, true);

            for (var i = 0; i < units.length; i++) {
              var els = units[i].els;
              for (var j = 0; j < els.length; j++) {
                els[j].classList.remove(TARGET_CLS, CLOSED_CLS, OPEN_CLS, ABSENT_CLS);
                els[j].removeAttribute(BAR_ATTR);
              }
            }
            units = [];

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
