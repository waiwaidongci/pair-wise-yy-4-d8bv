// 页面交互：地图选点、表单、筛选与潜次管理（数据与渲染分别交给 DiveStorage / DiveView / DiveExporter）
(function () {
  const map = document.querySelector("#map");
  const form = document.querySelector("#form");
  const diveForm = document.querySelector("#diveForm");
  const list = document.querySelector("#list");
  const diveList = document.querySelector("#diveList");
  const filterType = document.querySelector("#filterType");
  const filterDive = document.querySelector("#filterDive");
  const view = document.querySelector("#view");
  const listTitle = document.querySelector("#listTitle");

  const state = DiveStorage.load();
  let pending = null;         // 待保存标记的图上坐标
  let removingDiveId = null;  // 正在走“改派后撤下”流程的潜次

  if (!state.dives.length && !state.marks.length) seed();

  function seed() {
    const d1 = { id: DiveStorage.uid(), code: "DIVE-01", date: "2026-09-12", divers: "林岚 / 周潜", maxDepth: "18.5" };
    const d2 = { id: DiveStorage.uid(), code: "DIVE-02", date: "2026-09-14", divers: "林岚 / 陈汐", maxDepth: "19.1" };
    state.dives.push(d1, d2);
    state.marks.push(
      { id: DiveStorage.uid(), code: "A-017", type: "ceramic", diveId: d1.id, x: 42, y: 46, depth: "17.8m", orientation: "东", condition: "边缘残缺", note: "靠近船肋" },
      { id: DiveStorage.uid(), code: "W-003", type: "wood", diveId: d2.id, x: 58, y: 39, depth: "18.2m", orientation: "西北", condition: "稳定", note: "疑似横梁" }
    );
    DiveStorage.save(state);
  }

  // 沉船肋骨装饰
  for (let i = 0; i < 7; i++) {
    const rib = document.createElement("div");
    rib.className = "rib";
    rib.style.left = 28 + i * 7 + "%";
    map.appendChild(rib);
  }

  const divesById = () => Object.fromEntries(state.dives.map(d => [d.id, d]));
  const persist = () => { DiveStorage.save(state); renderAll(); };

  function visibleMarks() {
    return state.marks.filter(m =>
      (!filterType.value || m.type === filterType.value) &&
      (!filterDive.value || m.diveId === filterDive.value));
  }

  function renderAll() {
    map.querySelectorAll(".marker").forEach(el => el.remove());
    visibleMarks().forEach(mark => {
      const el = document.createElement("button");
      el.className = "marker " + mark.type + (mark.id === form.id.value ? " selected" : "");
      el.style.left = mark.x + "%";
      el.style.top = mark.y + "%";
      el.textContent = mark.code.slice(0, 2);
      el.onclick = event => { event.stopPropagation(); editMark(mark.id); };
      map.appendChild(el);
    });

    if (view.value === "timeline") {
      listTitle.textContent = "潜次时间线";
      list.className = "timeline";
      const dives = filterDive.value ? state.dives.filter(d => d.id === filterDive.value) : state.dives;
      list.innerHTML = DiveView.renderTimeline(dives, state.marks, filterType.value);
    } else {
      listTitle.textContent = "标记列表";
      list.className = "list";
      list.innerHTML = DiveView.renderMarkList(visibleMarks(), divesById(), form.id.value);
    }

    diveList.innerHTML = DiveView.renderDiveArchive(state.dives, state.marks, removingDiveId);

    const sorted = DiveView.sortDives(state.dives);
    DiveView.fillDiveSelect(form.diveId, sorted, "选择潜次");
    DiveView.fillDiveSelect(filterDive, sorted, "全部潜次");
  }

  function editMark(id) {
    const mark = state.marks.find(m => m.id === id);
    if (!mark) return;
    for (const [key, value] of Object.entries(mark)) if (form[key]) form[key].value = value;
    pending = { x: mark.x, y: mark.y };
    renderAll();
  }

  list.onclick = event => {
    const item = event.target.closest("[data-id]");
    if (item) editMark(item.dataset.id);
  };

  map.addEventListener("click", event => {
    const rect = map.getBoundingClientRect();
    pending = {
      x: Number(((event.clientX - rect.left) / rect.width * 100).toFixed(2)),
      y: Number(((event.clientY - rect.top) / rect.height * 100).toFixed(2))
    };
    form.reset();
    form.id.value = "";
    form.code.value = "M-" + String(state.marks.length + 1).padStart(3, "0");
    const sorted = DiveView.sortDives(state.dives);
    form.diveId.value = filterDive.value || (sorted[0] ? sorted[0].id : "");
    renderAll();
  });

  form.onsubmit = event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.diveId) {
      alert("标记需要归到已有潜次，请先在潜次档案中录入潜次。");
      return;
    }
    if (!pending) pending = { x: 50, y: 50 };
    if (data.id) Object.assign(state.marks.find(m => m.id === data.id), data, pending);
    else state.marks.push({ ...data, id: DiveStorage.uid(), ...pending });
    persist();
  };

  document.querySelector("#deleteBtn").onclick = () => {
    if (!form.id.value) return;
    state.marks = state.marks.filter(m => m.id !== form.id.value);
    form.reset();
    pending = null;
    persist();
  };

  // ---- 潜次档案 ----

  diveForm.onsubmit = event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(diveForm).entries());
    data.code = data.code.trim();
    if (state.dives.some(d => d.code === data.code && d.id !== data.id)) {
      alert("潜次编号 " + data.code + " 已存在。");
      return;
    }
    if (data.id) Object.assign(state.dives.find(d => d.id === data.id), data);
    else state.dives.push({ ...data, id: DiveStorage.uid() });
    diveForm.reset();
    diveForm.id.value = "";
    persist();
  };

  document.querySelector("#diveCancelBtn").onclick = () => {
    diveForm.reset();
    diveForm.id.value = "";
  };

  diveList.onclick = event => {
    const editBtn = event.target.closest("[data-edit]");
    if (editBtn) {
      const dive = state.dives.find(d => d.id === editBtn.dataset.edit);
      if (!dive) return;
      for (const [key, value] of Object.entries(dive)) if (diveForm[key]) diveForm[key].value = value;
      return;
    }
    const removeBtn = event.target.closest("[data-remove]");
    if (removeBtn) {
      const id = removeBtn.dataset.remove;
      if (state.marks.some(m => m.diveId === id)) {
        // 潜次里还有标记：先展开改派界面，改派完成后才撤下
        removingDiveId = id;
        renderAll();
      } else {
        state.dives = state.dives.filter(d => d.id !== id);
        persist();
      }
      return;
    }
    const confirmBtn = event.target.closest("[data-confirm-remove]");
    if (confirmBtn) {
      const id = confirmBtn.dataset.confirmRemove;
      const select = diveList.querySelector('select[data-reassign-for="' + id + '"]');
      const target = select && select.value;
      if (!target) {
        alert("没有可改派的潜次，请先新建一个潜次。");
        return;
      }
      state.marks.forEach(m => { if (m.diveId === id) m.diveId = target; });
      state.dives = state.dives.filter(d => d.id !== id);
      removingDiveId = null;
      persist();
      return;
    }
    if (event.target.closest("[data-cancel-remove]")) {
      removingDiveId = null;
      renderAll();
    }
  };

  document.querySelector("#exportBtn").onclick = () => DiveExporter.download(state);

  filterType.onchange = renderAll;
  filterDive.onchange = renderAll;
  view.onchange = renderAll;
  renderAll();
})();
