const translations = {
  en: {
    autoplay: "Autoplay",
    backToTop: "Back to top",
    currentPlaybackProgress: "Current playback progress",
    exitFullscreen: "Exit fullscreen",
    fullscreen: "Fullscreen",
    last: "Last",
    lastSection: "Last section",
    mobileSectionNavigation: "Mobile section navigation",
    nextPage: "Next page",
    nextSection: "Next section",
    pause: "Pause",
    pauseAutoplay: "Pause autoplay",
    sectionNavigation: "Section navigation",
    separator: ": ",
    top: "Top",
  },
  zh: {
    autoplay: "自动播放",
    backToTop: "回到顶部",
    currentPlaybackProgress: "当前播放进度",
    exitFullscreen: "退出全屏",
    fullscreen: "全屏",
    last: "末页",
    lastSection: "最后一页",
    mobileSectionNavigation: "移动端章节导航",
    nextPage: "下一页",
    nextSection: "下一节",
    pause: "暂停",
    pauseAutoplay: "暂停自动播放",
    sectionNavigation: "章节导航",
    separator: "：",
    top: "顶部",
  },
} as const;

export function deckLabels(lang: string, next: "page" | "section") {
  const { nextPage, nextSection, ...labels } = lang.toLowerCase().startsWith("zh")
    ? translations.zh
    : translations.en;
  return { ...labels, next: next === "page" ? nextPage : nextSection };
}
