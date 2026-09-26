// 存储模块：负责本地持久化、版本迁移与初始数据
window.DiveStore = (() => {
  const KEY = "zfl30DiveLog";
  const LEGACY_KEY = "zfl30Marks";
  const VERSION = 2;
  const UNSORTED_CODE = "待整理";

  function seedState() {
    const diveA = { id: crypto.randomUUID(), code: "DIVE-01", date: "2026-09-18", divers: "林岚、赵潜", maxDepth: 18.4 };
    const diveB = { id: crypto.randomUUID(), code: "DIVE-02", date: "2026-09-21", divers: "周泽、林岚", maxDepth: 19.2 };
    return {
      version: VERSION,
      dives: [diveA, diveB],
      marks: [
        { id: crypto.randomUUID(), code: "A-017", type: "ceramic", diveId: diveA.id, x: 42, y: 46, depth: "17.8m", orientation: "东", condition: "边缘残缺", note: "靠近船肋" },
        { id: crypto.randomUUID(), code: "W-003", type: "wood", diveId: diveB.id, x: 58, y: 39, depth: "18.2m", orientation: "西北", condition: "稳定", note: "疑似横梁" }
      ]
    };
  }

  // 旧版本只存标记数组，潜次信息混在标记的 dive 文本里。
  // 返航后难以核对，统一补成一个"待整理"潜次，原潜次文本保留在备注中。
  function migrateLegacy(legacyMarks) {
    const holding = { id: crypto.randomUUID(), code: UNSORTED_CODE, date: "", divers: "", maxDepth: null };
    const marks = legacyMarks.map(m => ({
      id: m.id || crypto.randomUUID(),
      code: m.code || "未编号",
      type: m.type || "unknown",
      diveId: holding.id,
      x: Number.isFinite(m.x) ? m.x : 50,
      y: Number.isFinite(m.y) ? m.y : 50,
      depth: m.depth || "",
      orientation: m.orientation || "",
      condition: m.condition || "",
      note: [m.note, m.dive ? "原潜次记录：" + m.dive : ""].filter(Boolean).join("；")
    }));
    return { version: VERSION, dives: [holding], marks };
  }

  // 标记必须挂在已有潜次上，找不到归属的一律补进"待整理"潜次
  function normalize(state) {
    const clean = {
      version: VERSION,
      dives: Array.isArray(state.dives) ? state.dives : [],
      marks: Array.isArray(state.marks) ? state.marks : []
    };
    const ids = new Set(clean.dives.map(d => d.id));
    let holding = clean.dives.find(d => d.code === UNSORTED_CODE);
    clean.marks.forEach(m => {
      if (!ids.has(m.diveId)) {
        if (!holding) {
          holding = { id: crypto.randomUUID(), code: UNSORTED_CODE, date: "", divers: "", maxDepth: null };
          clean.dives.push(holding);
          ids.add(holding.id);
        }
        m.diveId = holding.id;
      }
    });
    return clean;
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify({ ...state, version: VERSION }));
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const state = normalize(JSON.parse(raw));
        save(state);
        return state;
      } catch (err) { /* 数据损坏时继续尝试旧数据 */ }
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      try {
        const marks = JSON.parse(legacy);
        if (Array.isArray(marks)) {
          const state = migrateLegacy(marks);
          save(state);
          localStorage.removeItem(LEGACY_KEY);
          return state;
        }
      } catch (err) { /* 旧数据损坏则重新初始化 */ }
    }
    const state = seedState();
    save(state);
    return state;
  }

  return { KEY, LEGACY_KEY, VERSION, UNSORTED_CODE, load, save };
})();
