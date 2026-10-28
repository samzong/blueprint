const translations = {
  en: {
    status: { on_track: "On track", at_risk: "At risk", blocked: "Blocked", done: "Done" },
    itemStatus: { active: "Active", blocked: "Blocked", next: "Next", done: "Done", dropped: "Dropped" },
    decisions: "Your decision",
    recommendation: "Recommendation",
    plan: "Plan",
    current: "In progress",
    next: "Next",
    completed: "Completed",
    complete: "complete",
    noCurrent: "No active or blocked items.",
    noNext: "No next items.",
    noCompleted: "No completed items.",
    resume: "Resume session",
    operation: "Operation",
    owner: "Owner",
    currentPhase: "Current",
    updated: "Updated",
  },
  "zh-CN": {
    status: { on_track: "按计划推进", at_risk: "存在风险", blocked: "受阻", done: "已完成" },
    itemStatus: { active: "进行中", blocked: "受阻", next: "待开始", done: "已完成", dropped: "已取消" },
    decisions: "需要你决定",
    recommendation: "建议",
    plan: "整体规划",
    current: "进行中",
    next: "后续",
    completed: "已完成",
    complete: "完成",
    noCurrent: "目前没有进行中或受阻的任务。",
    noNext: "没有后续任务。",
    noCompleted: "还没有已完成的任务。",
    resume: "恢复会话",
    operation: "操作",
    owner: "负责人",
    currentPhase: "当前",
    updated: "更新于",
  },
} as const;

export function progressLabels(lang: string) {
  return lang.toLowerCase() === "zh-cn" ? translations["zh-CN"] : translations.en;
}
