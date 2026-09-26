// 潜次视图模块：标记列表、潜次时间线、潜次档案与下拉选项的渲染
(function () {
  const typeNames = { ceramic: "陶片", wood: "木构件", metal: "金属件", unknown: "未知物" };

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function sortDives(dives) {
    return [...dives].sort((a, b) =>
      (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31") ||
      String(a.code).localeCompare(String(b.code)));
  }

  function countByDive(marks) {
    return marks.reduce((acc, m) => ((acc[m.diveId] = (acc[m.diveId] || 0) + 1), acc), {});
  }

  function diveMeta(d) {
    return esc(d.date || "日期待补") + " · 最大深度 " +
      (d.maxDepth ? esc(d.maxDepth) + "m" : "待补") + " · " + esc(d.divers || "潜水员待补");
  }

  function renderMarkList(marks, divesById, activeId) {
    if (!marks.length) return '<div class="muted">没有符合条件的标记</div>';
    return marks.map(m => {
      const dive = divesById[m.diveId];
      return '<div class="item' + (m.id === activeId ? " active" : "") + '" data-id="' + m.id + '">'
        + "<b>" + esc(m.code) + '</b> <span class="pill">' + (typeNames[m.type] || esc(m.type)) + "</span>"
        + '<div class="muted">' + esc(dive ? dive.code : "未分配潜次") + " · " + esc(m.depth) + " · " + esc(m.orientation) + "</div>"
        + "<div>" + esc(m.condition) + "</div></div>";
    }).join("");
  }

  // 时间线按潜次分组，展示每个潜次的最大深度与器物数量
  function renderTimeline(dives, marks, typeVal) {
    const counts = countByDive(marks);
    const sorted = sortDives(dives);
    if (!sorted.length) return '<div class="muted">暂无潜次</div>';
    return sorted.map(d => {
      const items = marks.filter(m => m.diveId === d.id && (!typeVal || m.type === typeVal));
      return '<div class="item"><b>' + esc(d.code) + '</b> <span class="pill">器物 ' + (counts[d.id] || 0) + " 件</span>"
        + '<div class="muted">' + diveMeta(d) + "</div>"
        + items.map(i => "<div>" + esc(i.code) + " · " + (typeNames[i.type] || esc(i.type)) + " · " + esc(i.depth) + "</div>").join("")
        + "</div>";
    }).join("");
  }

  // 潜次档案列表；removingId 指向待撤下的潜次，展开改派界面
  function renderDiveArchive(dives, marks, removingId) {
    const counts = countByDive(marks);
    const sorted = sortDives(dives);
    if (!sorted.length) return '<div class="muted">暂无潜次，请先录入。</div>';
    return sorted.map(d => {
      const n = counts[d.id] || 0;
      let html = '<div class="item"><b>' + esc(d.code) + '</b> <span class="pill">器物 ' + n + " 件</span>"
        + '<div class="muted">' + diveMeta(d) + "</div>"
        + '<div class="row-actions"><button type="button" class="mini" data-edit="' + d.id + '">编辑</button>'
        + '<button type="button" class="mini secondary" data-remove="' + d.id + '">撤下</button></div>';
      if (removingId === d.id) {
        const others = sorted.filter(o => o.id !== d.id);
        if (others.length) {
          html += '<div class="reassign">该潜次还有 ' + n + " 个标记，先改派到："
            + '<select data-reassign-for="' + d.id + '">'
            + others.map(o => '<option value="' + o.id + '">' + esc(o.code) + "</option>").join("")
            + "</select>"
            + '<button type="button" class="mini" data-confirm-remove="' + d.id + '">改派并撤下</button>'
            + '<button type="button" class="mini secondary" data-cancel-remove>取消</button></div>';
        } else {
          html += '<div class="reassign muted">该潜次还有 ' + n + " 个标记，但没有其他潜次可改派，请先新建潜次。"
            + '<button type="button" class="mini secondary" data-cancel-remove>取消</button></div>';
        }
      }
      return html + "</div>";
    }).join("");
  }

  function fillDiveSelect(select, dives, placeholder) {
    const current = select.value;
    select.innerHTML = (placeholder != null ? '<option value="">' + esc(placeholder) + "</option>" : "")
      + dives.map(d => '<option value="' + d.id + '">' + esc(d.code) + "</option>").join("");
    if ([...select.options].some(o => o.value === current)) select.value = current;
  }

  window.DiveView = {
    typeNames, sortDives, countByDive,
    renderMarkList, renderTimeline, renderDiveArchive, fillDiveSelect
  };
})();
