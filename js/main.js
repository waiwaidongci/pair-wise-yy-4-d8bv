// 页面交互：只负责事件绑定与状态流转，存储、视图与导出由独立模块承担
(() => {
  const state = DiveStore.load();
  let pending = null;        // 地图上待保存的点击坐标
  let removingDiveId = null; // 等待改派标记的潜次

  const map = document.querySelector("#map");
  const form = document.querySelector("#form");
  const diveForm = document.querySelector("#diveForm");
  const markFields = form.elements;
  const diveFields = diveForm.elements;
  const list = document.querySelector("#list");
  const listTitle = document.querySelector("#listTitle");
  const diveList = document.querySelector("#diveList");
  const diveFilter = document.querySelector("#diveFilter");
  const typeFilter = document.querySelector("#typeFilter");
  const view = document.querySelector("#view");
  const reassignBox = document.querySelector("#reassignBox");
  const reassignInfo = document.querySelector("#reassignInfo");
  const reassignTarget = document.querySelector("#reassignTarget");

  // 沉船肋骨装饰
  for (let i = 0; i < 7; i++) {
    const rib = document.createElement("div");
    rib.className = "rib";
    rib.style.left = 28 + i * 7 + "%";
    map.appendChild(rib);
  }

  function persist() {
    DiveStore.save(state);
    render();
  }

  function visibleMarks() {
    return state.marks.filter(m =>
      (!typeFilter.value || m.type === typeFilter.value) &&
      (!diveFilter.value || m.diveId === diveFilter.value));
  }

  function render() {
    DiveView.syncDiveOptions(diveFilter, state.dives, "全部潜次");
    DiveView.syncDiveOptions(markFields.diveId, state.dives, "");
    if (removingDiveId) {
      DiveView.syncDiveOptions(reassignTarget, state.dives.filter(d => d.id !== removingDiveId), "");
    }
    const marks = visibleMarks();
    DiveView.renderMarkers(map, marks, markFields.id.value, editMark);
    if (view.value === "timeline") {
      listTitle.textContent = "潜次时间线";
      DiveView.renderTimeline(list, state.dives, state.marks);
    } else {
      const dive = state.dives.find(d => d.id === diveFilter.value);
      listTitle.textContent = "标记列表" + (dive ? " · " + dive.code : "");
      DiveView.renderList(list, marks, state.dives, markFields.id.value, editMark);
    }
    DiveView.renderDiveArchive(diveList, state.dives, state.marks, { onEdit: editDive, onRemove: requestRemoveDive });
  }

  function editMark(id) {
    const mark = state.marks.find(m => m.id === id);
    if (!mark) return;
    for (const [key, value] of Object.entries(mark)) if (markFields[key]) markFields[key].value = value;
    pending = { x: mark.x, y: mark.y };
    render();
  }

  map.addEventListener("click", event => {
    if (!state.dives.length) {
      alert("请先在“潜次档案”中补充潜次，再添加器物标记。");
      return;
    }
    const rect = map.getBoundingClientRect();
    pending = {
      x: Number(((event.clientX - rect.left) / rect.width * 100).toFixed(2)),
      y: Number(((event.clientY - rect.top) / rect.height * 100).toFixed(2))
    };
    form.reset();
    markFields.id.value = "";
    markFields.code.value = "M-" + String(state.marks.length + 1).padStart(3, "0");
    markFields.diveId.value = diveFilter.value || state.dives[0].id;
    render();
  });

  form.onsubmit = event => {
    event.preventDefault();
    if (!state.dives.length) {
      alert("请先在“潜次档案”中补充潜次，再保存标记。");
      return;
    }
    if (!pending) pending = { x: 50, y: 50 };
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.diveId) {
      alert("请选择所属潜次。");
      return;
    }
    if (data.id) Object.assign(state.marks.find(m => m.id === data.id), data, pending);
    else state.marks.push({ ...data, id: crypto.randomUUID(), ...pending });
    persist();
  };

  document.querySelector("#deleteBtn").onclick = () => {
    if (!markFields.id.value) return;
    state.marks = state.marks.filter(m => m.id !== markFields.id.value);
    form.reset();
    markFields.id.value = "";
    pending = null;
    persist();
  };

  // ---------- 潜次档案 ----------

  diveForm.onsubmit = event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(diveForm).entries());
    const payload = {
      code: data.code.trim(),
      date: data.date,
      divers: data.divers.trim(),
      maxDepth: data.maxDepth === "" ? null : Number(data.maxDepth)
    };
    if (data.id) Object.assign(state.dives.find(d => d.id === data.id), payload);
    else state.dives.push({ id: crypto.randomUUID(), ...payload });
    diveForm.reset();
    diveFields.id.value = "";
    persist();
  };

  document.querySelector("#diveResetBtn").onclick = () => {
    diveForm.reset();
    diveFields.id.value = "";
  };

  function editDive(id) {
    const dive = state.dives.find(d => d.id === id);
    if (!dive) return;
    diveFields.id.value = dive.id;
    diveFields.code.value = dive.code;
    diveFields.date.value = dive.date || "";
    diveFields.divers.value = dive.divers || "";
    diveFields.maxDepth.value = dive.maxDepth ?? "";
  }

  // 撤下潜次：潜次里还有标记时，先改派标记，再撤下原潜次
  function requestRemoveDive(id) {
    const dive = state.dives.find(d => d.id === id);
    if (!dive) return;
    const count = state.marks.filter(m => m.diveId === id).length;
    if (count === 0) {
      if (confirm("潜次 " + dive.code + " 没有器物标记，确认撤下？")) removeDive(id);
      return;
    }
    if (!state.dives.some(d => d.id !== id)) {
      alert("潜次 " + dive.code + " 还有 " + count + " 件器物标记，且没有其他潜次可以接收，暂时无法撤下。");
      return;
    }
    removingDiveId = id;
    reassignInfo.textContent = "潜次 " + dive.code + " 还有 " + count + " 件器物标记，撤下前请先改派到：";
    reassignBox.hidden = false;
    render();
  }

  function removeDive(id) {
    state.dives = state.dives.filter(d => d.id !== id);
    if (diveFields.id.value === id) {
      diveForm.reset();
      diveFields.id.value = "";
    }
    if (diveFilter.value === id) diveFilter.value = "";
    removingDiveId = null;
    reassignBox.hidden = true;
    persist();
    // 正在编辑的标记可能刚被改派，刷新表单里的潜次选项
    const editing = state.marks.find(m => m.id === markFields.id.value);
    if (editing) markFields.diveId.value = editing.diveId;
  }

  document.querySelector("#reassignConfirm").onclick = () => {
    const target = reassignTarget.value;
    if (!target || !removingDiveId) return;
    state.marks.forEach(m => { if (m.diveId === removingDiveId) m.diveId = target; });
    removeDive(removingDiveId);
  };

  document.querySelector("#reassignCancel").onclick = () => {
    removingDiveId = null;
    reassignBox.hidden = true;
  };

  document.querySelector("#exportBtn").onclick = () => DiveExporter.download(state);

  diveFilter.onchange = typeFilter.onchange = view.onchange = render;
  render();
})();
