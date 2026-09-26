// 导出模块：生成带版本号、潜次与标记的 JSON 并触发下载
window.DiveExporter = (() => {
  function buildPayload(state) {
    return {
      version: DiveStore.VERSION,
      exportedAt: new Date().toISOString(),
      dives: state.dives,
      marks: state.marks
    };
  }

  function download(state, filename = "dive-log.json") {
    const blob = new Blob([JSON.stringify(buildPayload(state), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return { buildPayload, download };
})();
