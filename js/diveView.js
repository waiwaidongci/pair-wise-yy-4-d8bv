// 潜次视图模块：负责地图标记、标记列表、潜次时间线与潜次档案的渲染
window.DiveView = (() => {
  const typeNames = { ceramic: "陶片", wood: "木构件", metal: "金属件", unknown: "未知物" };

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const typeName = t => typeNames[t] || t || "未知物";
  const fmtDepth = d => (d.maxDepth === null || d.maxDepth === undefined || d.maxDepth === "") ? "—" : d.maxDepth + "m";
  const countByDive = marks => marks.reduce((acc, m) => (acc[m.diveId] = (acc[m.diveId] || 0) + 1, acc), {});

  // 同步潜次下拉框选项，尽量保留当前选中值
  function syncDiveOptions(select, dives, placeholder) {
    const current = select.value;
    select.innerHTML = (placeholder ? '<option value="">' + esc(placeholder) + "</option>" : "") +
      dives.map(d => '<option value="' + d.id + '">' + esc(d.code) + "</option>").join("");
    if (current && [...select.options].some(o => o.value === current)) select.value = current;
  }

  function renderMarkers(map, marks, selectedId, onSelect) {
    map.querySelectorAll(".marker").forEach(el => el.remove());
    marks.forEach(mark => {
      const el = document.createElement("button");
      el.className = "marker " + mark.type + (mark.id === selectedId ? " selected" : "");
      el.style.left = mark.x + "%";
      el.style.top = mark.y + "%";
      el.textContent = mark.code.slice(0, 2);
      el.title = mark.code;
      el.onclick = event => { event.stopPropagation(); onSelect(mark.id); };
      map.appendChild(el);
    });
  }

  function renderList(container, marks, dives, selectedId, onSelect) {
    container.className = "list";
    const byId = Object.fromEntries(dives.map(d => [d.id, d]));
    container.innerHTML = marks.length ? marks.map(m =>
      '<div class="item' + (m.id === selectedId ? " active" : "") + '" data-id="' + m.id + '">' +
        "<b>" + esc(m.code) + '</b> <span class="pill">' + esc(typeName(m.type)) + "</span>" +
        '<div class="muted">' + esc(byId[m.diveId] ? byId[m.diveId].code : "未分配") + " · " + esc(m.depth) + " · " + esc(m.orientation) + "</div>" +
        "<div>" + esc(m.condition) + "</div>" +
      "</div>"
    ).join("") : '<div class="muted">没有符合条件的标记</div>';
    container.querySelectorAll("[data-id]").forEach(el => el.onclick = () => onSelect(el.dataset.id));
  }

  // 时间线：按日期排列，展示每个潜次的最大深度与器物数量
  function renderTimeline(container, dives, marks) {
    container.className = "timeline";
    if (!dives.length) {
      container.innerHTML = '<div class="muted">还没有潜次档案</div>';
      return;
    }
    const counts = countByDive(marks);
    const sorted = [...dives].sort((a, b) =>
      (a.date || "9999").localeCompare(b.date || "9999") || a.code.localeCompare(b.code));
    container.innerHTML = sorted.map(d => {
      const items = marks.filter(m => m.diveId === d.id);
      return '<div class="item"><b>' + esc(d.code) + '</b> <span class="pill">' + esc(d.date || "未记录日期") + "</span>" +
        '<div class="muted">最大深度 ' + fmtDepth(d) + " · 器物 " + (counts[d.id] || 0) + " 件 · 潜水员 " + esc(d.divers || "—") + "</div>" +
        items.map(i => "<div>" + esc(i.code) + " · " + esc(typeName(i.type)) + "</div>").join("") +
      "</div>";
    }).join("");
  }

  // 潜次档案列表：编辑、撤下（撤下逻辑由页面决定）
  function renderDiveArchive(container, dives, marks, handlers) {
    const counts = countByDive(marks);
    container.innerHTML = dives.length ? dives.map(d =>
      '<div class="item" data-dive="' + d.id + '">' +
        "<b>" + esc(d.code) + '</b> <span class="pill">器物 ' + (counts[d.id] || 0) + " 件</span>" +
        '<div class="muted">' + esc(d.date || "未记录日期") + " · 最大深度 " + fmtDepth(d) + "</div>" +
        '<div class="muted">潜水员：' + esc(d.divers || "—") + "</div>" +
        '<div class="rowbtns"><button type="button" data-act="edit">编辑</button>' +
        '<button type="button" class="secondary" data-act="remove">撤下</button></div>' +
      "</div>"
    ).join("") : '<div class="muted">还没有潜次，请先补充潜次档案</div>';
    container.querySelectorAll("[data-dive]").forEach(el => {
      el.querySelector('[data-act="edit"]').onclick = () => handlers.onEdit(el.dataset.dive);
      el.querySelector('[data-act="remove"]').onclick = () => handlers.onRemove(el.dataset.dive);
    });
  }

  return { typeNames, syncDiveOptions, renderMarkers, renderList, renderTimeline, renderDiveArchive };
})();
