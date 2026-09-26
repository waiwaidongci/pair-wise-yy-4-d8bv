// 导出模块：生成带版本号的归档 JSON（版本、潜次、标记）
(function () {
  function buildExport(state) {
    return {
      version: state.version || 2,
      exportedAt: new Date().toISOString(),
      dives: state.dives,
      marks: state.marks
    };
  }

  function download(state, filename) {
    const blob = new Blob([JSON.stringify(buildExport(state), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || "dive-archive.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.DiveExporter = { buildExport, download };
})();
