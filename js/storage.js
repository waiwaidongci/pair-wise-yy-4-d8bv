// 存储模块：本地持久化、版本管理与旧数据迁移
(function () {
  const STORAGE_KEY = "zfl30State";
  const LEGACY_KEY = "zfl30Marks";
  const VERSION = 2;
  const PENDING_DIVE_CODE = "待整理";

  function uid() {
    return crypto.randomUUID();
  }

  function emptyState() {
    return { version: VERSION, dives: [], marks: [] };
  }

  // 旧版本只存标记数组，潜次只是标记上的一个文本字段；
  // 迁移时补一个“待整理”潜次，把所有旧标记归进去。
  function migrateLegacy(legacyMarks) {
    const dive = {
      id: uid(),
      code: PENDING_DIVE_CODE,
      date: "",
      divers: "",
      maxDepth: "",
      note: "旧数据迁移，待整理"
    };
    const marks = legacyMarks.map(m => ({
      id: m.id || uid(),
      code: m.code || "",
      type: m.type || "unknown",
      diveId: dive.id,
      x: m.x != null ? m.x : 50,
      y: m.y != null ? m.y : 50,
      depth: m.depth || "",
      orientation: m.orientation || "",
      condition: m.condition || "",
      note: m.note || ""
    }));
    return { version: VERSION, dives: [dive], marks };
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const state = JSON.parse(raw);
        if (state && Array.isArray(state.dives) && Array.isArray(state.marks)) {
          return { version: state.version || VERSION, dives: state.dives, marks: state.marks };
        }
      } catch (err) { /* 数据损坏则继续尝试旧数据 */ }
    }
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw);
        if (Array.isArray(legacy) && legacy.length) {
          const state = migrateLegacy(legacy);
          save(state);
          localStorage.removeItem(LEGACY_KEY);
          return state;
        }
      } catch (err) { /* 旧数据损坏则丢弃 */ }
      localStorage.removeItem(LEGACY_KEY);
    }
    return emptyState();
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: VERSION,
      dives: state.dives,
      marks: state.marks
    }));
  }

  window.DiveStorage = { VERSION, PENDING_DIVE_CODE, uid, load, save, emptyState };
})();
