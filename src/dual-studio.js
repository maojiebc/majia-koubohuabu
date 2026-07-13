(() => {
  "use strict";

  const ROOT = "/koubo";
  const STORAGE_KEY = "koubo-dual-source-studio-v2";
  const DEFAULT_CONTENT = {
    topic: "连锁餐饮 AI 实战",
    point: "真实录屏是信任的证据",
    subtitle: "先看操作，再讲方法",
  };

  const state = {
    formatId: "landscape-16x9",
    layoutId: "landscape-screen-pip-right",
    themeId: "deep-space-blue",
    screenFit: "auto",
    speakerShape: "auto",
    showSubtitle: true,
    showGuides: true,
    outputType: "prompt",
    content: { ...DEFAULT_CONTENT },
    media: {
      screen: { url: "", type: "", name: "", element: null },
      speaker: { url: "", type: "", name: "", element: null },
    },
  };

  let themeKit;
  let compositionKit;
  const elements = {};
  const $ = (id) => document.getElementById(id);

  const themes = () => themeKit.themes;
  const formats = () => compositionKit.formats;
  const currentTheme = () => themes().find((item) => item.id === state.themeId) || themes()[0];
  const currentFormat = () => formats().find((item) => item.id === state.formatId) || formats()[0];
  const currentLayout = () => currentFormat().layouts.find((item) => item.id === state.layoutId) || currentFormat().layouts[0];
  const effectiveScreenFit = () => state.screenFit === "auto" ? currentLayout().screenFit : state.screenFit;
  const effectiveSpeakerShape = () => state.speakerShape === "auto" ? currentLayout().speakerShape : state.speakerShape;
  const effectiveContent = () => ({
    topic: String(state.content.topic ?? "").trim() || DEFAULT_CONTENT.topic,
    point: String(state.content.point ?? "").trim() || DEFAULT_CONTENT.point,
    subtitle: String(state.content.subtitle ?? "").trim() || DEFAULT_CONTENT.subtitle,
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeXml(value) {
    return escapeHtml(value).replaceAll("\n", " ");
  }

  function slugify(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  }

  async function loadJson(path) {
    const response = await fetch(`${ROOT}/${path}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  }

  function restoreState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) return;
      if (formats().some((item) => item.id === saved.formatId)) state.formatId = saved.formatId;
      const format = currentFormat();
      if (format.layouts.some((item) => item.id === saved.layoutId)) state.layoutId = saved.layoutId;
      else state.layoutId = format.layouts[0].id;
      if (themes().some((item) => item.id === saved.themeId)) state.themeId = saved.themeId;
      if (["auto", "contain", "cover"].includes(saved.screenFit)) state.screenFit = saved.screenFit;
      if (["auto", "circle", "rounded", "cutout"].includes(saved.speakerShape)) state.speakerShape = saved.speakerShape;
      state.showSubtitle = saved.showSubtitle !== false;
      state.showGuides = saved.showGuides !== false;
      state.content = { ...DEFAULT_CONTENT, ...(saved.content || {}) };
    } catch (_) {
      // Local storage is an optional convenience only.
    }
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        formatId: state.formatId,
        layoutId: state.layoutId,
        themeId: state.themeId,
        screenFit: state.screenFit,
        speakerShape: state.speakerShape,
        showSubtitle: state.showSubtitle,
        showGuides: state.showGuides,
        content: state.content,
      }));
    } catch (_) {
      // Local storage may be disabled.
    }
  }

  function renderFormatOptions() {
    elements.formatGrid.innerHTML = formats().map((format) => `
      <button class="format-option" type="button" role="radio" aria-checked="${format.id === state.formatId}" data-format="${format.id}">
        <span class="format-icon" aria-hidden="true"><i></i></span>
        <span><strong>${escapeHtml(format.name)}</strong><small>${format.canvas.width} × ${format.canvas.height}<br>${escapeHtml(format.description)}</small></span>
      </button>`).join("");

    elements.formatGrid.querySelectorAll("[data-format]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.format === state.formatId) return;
        state.formatId = button.dataset.format;
        state.layoutId = currentFormat().layouts[0].id;
        state.screenFit = "auto";
        state.speakerShape = "auto";
        renderFormatOptions();
        renderCompositionOptions();
        syncForm();
        updatePreview();
      });
    });
  }

  function miniRect(zone, canvas, className, radius = 0) {
    const left = zone.x / canvas.width * 100;
    const top = zone.y / canvas.height * 100;
    const width = zone.w / canvas.width * 100;
    const height = zone.h / canvas.height * 100;
    return `<i class="${className}" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%;border-radius:${radius ? "50%" : "2px"}"></i>`;
  }

  function renderCompositionOptions() {
    const format = currentFormat();
    const canvas = format.canvas;
    const miniWidth = canvas.width > canvas.height ? 84 : 47;
    const miniHeight = canvas.width > canvas.height ? 47 : 84;
    elements.layoutCount.textContent = `${format.layouts.length} 种当前画幅版式`;
    elements.compositionGrid.innerHTML = format.layouts.map((layout) => {
      const speakerGeometry = getSpeakerGeometry(layout, layout.speakerShape);
      return `
        <button class="composition-option" type="button" role="radio" aria-checked="${layout.id === state.layoutId}" data-layout="${layout.id}" title="${escapeHtml(layout.description)}">
          <span class="layout-mini" style="width:${miniWidth}px;height:${miniHeight}px" aria-hidden="true">
            ${miniRect(layout.screen, canvas, "mini-screen")}
            ${miniRect(speakerGeometry, canvas, "mini-speaker", layout.speakerShape === "circle")}
            ${miniRect(layout.subtitle, canvas, "mini-subtitle")}
          </span>
          <span><strong>${escapeHtml(layout.name)}</strong><small>${escapeHtml(layout.description)}</small></span>
        </button>`;
    }).join("");

    elements.compositionGrid.querySelectorAll("[data-layout]").forEach((button) => {
      button.addEventListener("click", () => {
        state.layoutId = button.dataset.layout;
        state.screenFit = "auto";
        state.speakerShape = "auto";
        renderCompositionOptions();
        syncForm();
        updatePreview();
      });
    });
  }

  function renderThemeOptions() {
    elements.themeGrid.innerHTML = themes().map((theme) => `
      <button class="theme-option" type="button" role="radio" aria-checked="${theme.id === state.themeId}" data-theme="${theme.id}" title="${escapeHtml(theme.description)}">
        <span class="theme-swatch" aria-hidden="true">${theme.sourcePalette.map((color) => `<i style="background:${color.value}"></i>`).join("")}</span>
        <strong>${theme.index} ${escapeHtml(theme.name)}</strong>
      </button>`).join("");

    elements.themeGrid.querySelectorAll("[data-theme]").forEach((button) => {
      button.addEventListener("click", () => {
        state.themeId = button.dataset.theme;
        renderThemeOptions();
        updatePreview();
      });
    });
  }

  function syncForm() {
    elements.topicInput.value = state.content.topic;
    elements.pointInput.value = state.content.point;
    elements.subtitleInput.value = state.content.subtitle;
    elements.screenFitSelect.value = state.screenFit;
    elements.speakerShapeSelect.value = state.speakerShape;
    elements.subtitleToggle.checked = state.showSubtitle;
    elements.guideToggle.checked = state.showGuides;
  }

  function setBox(element, zone) {
    element.style.left = `${zone.x}px`;
    element.style.top = `${zone.y}px`;
    element.style.width = `${zone.w}px`;
    element.style.height = `${zone.h}px`;
  }

  function getSpeakerGeometry(layout = currentLayout(), shape = effectiveSpeakerShape()) {
    if (shape !== "circle") return { ...layout.speaker };
    const size = Math.min(layout.speaker.w, layout.speaker.h);
    return {
      ...layout.speaker,
      x: layout.speaker.x + (layout.speaker.w - size) / 2,
      y: layout.speaker.y + (layout.speaker.h - size) / 2,
      w: size,
      h: size,
      radius: size / 2,
    };
  }

  function applyMedia(slot) {
    const media = state.media[slot];
    const container = slot === "screen" ? elements.screenMedia : elements.speakerMedia;
    const placeholder = container.querySelector(slot === "screen" ? ".screen-placeholder" : ".speaker-placeholder");
    container.querySelectorAll(".user-media").forEach((element) => {
      if (element !== media.element) element.remove();
    });
    if (!media.element) {
      placeholder.hidden = false;
      return;
    }
    if (media.element.parentElement !== container) container.appendChild(media.element);
    media.element.className = "user-media";
    placeholder.hidden = true;
    if (slot === "screen") {
      media.element.style.objectFit = effectiveScreenFit();
      media.element.style.objectPosition = "50% 50%";
    } else {
      const shape = effectiveSpeakerShape();
      media.element.style.objectFit = shape === "cutout" ? "contain" : "cover";
      media.element.style.objectPosition = shape === "cutout" ? "50% 100%" : "50% 18%";
    }
  }

  function fitPreview() {
    if (!elements.previewStage || !compositionKit) return;
    const { width, height } = currentFormat().canvas;
    const availableWidth = Math.max(260, elements.previewStage.clientWidth - 52);
    const portrait = height > width;
    const viewportLimit = Math.max(360, Math.min(portrait ? 600 : 500, window.innerHeight * 0.62));
    const scale = Math.min(availableWidth / width, viewportLimit / height);
    elements.videoCanvas.style.setProperty("--preview-scale", String(scale));
    elements.previewViewport.style.width = `${Math.round(width * scale)}px`;
    elements.previewViewport.style.height = `${Math.round(height * scale)}px`;
  }

  function updatePreview() {
    const format = currentFormat();
    const layout = currentLayout();
    const theme = currentTheme();
    const semantic = theme.semantic;
    const canvas = format.canvas;
    const portrait = canvas.height > canvas.width;
    const speakerShape = effectiveSpeakerShape();
    const speakerGeometry = getSpeakerGeometry(layout, speakerShape);
    const content = effectiveContent();

    elements.videoCanvas.style.setProperty("--canvas-width", `${canvas.width}px`);
    elements.videoCanvas.style.setProperty("--canvas-height", `${canvas.height}px`);
    elements.videoCanvas.style.setProperty("--theme-accent", semantic.accent);
    elements.videoCanvas.style.setProperty("--theme-border", semantic.border);
    elements.videoCanvas.style.setProperty("--theme-surface", semantic.surface);
    elements.videoCanvas.style.setProperty("--theme-speaker-surface", semantic.speakerSurface);
    elements.videoCanvas.style.setProperty("--theme-speaker-figure", semantic.speakerFigure);
    elements.videoCanvas.style.setProperty("--theme-shadow", semantic.shadow);
    elements.videoCanvas.style.color = semantic.textPrimary;
    elements.videoCanvas.style.background = theme.gradient || semantic.canvas;
    elements.videoCanvas.classList.toggle("show-guides", state.showGuides);

    setBox(elements.screenShell, layout.screen);
    elements.screenShell.style.borderRadius = `${layout.screen.radius}px`;
    setBox(elements.speakerShell, speakerGeometry);
    elements.speakerShell.style.borderRadius = speakerShape === "circle" ? "50%" : `${layout.speaker.radius || 28}px`;
    elements.speakerShell.className = `media-shell speaker-shell shape-${speakerShape}`;

    setBox(elements.canvasTitle, layout.title);
    elements.canvasTitle.textContent = content.topic;
    elements.canvasTitle.style.color = semantic.textPrimary;
    elements.canvasTitle.style.fontSize = `${portrait ? 42 : 32}px`;

    setBox(elements.canvasPoint, layout.point);
    elements.canvasPoint.textContent = content.point;
    elements.canvasPoint.style.color = semantic.emphasis;
    const pointLength = Array.from(content.point).length;
    elements.canvasPoint.style.fontSize = `${portrait ? (pointLength > 14 ? 42 : 52) : (pointLength > 18 ? 25 : 29)}px`;
    elements.canvasPoint.style.justifyContent = layout.id === "portrait-screen-top-speaker-center" ? "center" : "flex-start";

    setBox(elements.canvasSubtitle, layout.subtitle);
    elements.canvasSubtitle.textContent = content.subtitle;
    elements.canvasSubtitle.style.fontSize = `${layout.subtitle.fontSize}px`;
    elements.canvasSubtitle.hidden = !state.showSubtitle;

    const safe = format.safeArea;
    setBox(elements.safeOverlay, {
      x: safe.left,
      y: safe.top,
      w: canvas.width - safe.left - safe.right,
      h: canvas.height - safe.top - safe.bottom,
    });

    elements.previewRatio.textContent = canvas.ratio;
    elements.previewDimensions.textContent = `${canvas.width} × ${canvas.height}`;
    elements.pngSpec.textContent = `${canvas.width} × ${canvas.height}`;
    elements.layoutAdvice.textContent = layout.description;
    applyMedia("screen");
    applyMedia("speaker");
    updateOutput();
    persistState();
    requestAnimationFrame(fitPreview);
  }

  function getSlotSpec(slot) {
    const layout = currentLayout();
    if (slot === "screen") {
      return {
        slotId: "screen-1",
        label: "录屏画面 1",
        role: "primary-evidence",
        box: { ...layout.screen },
        fit: effectiveScreenFit(),
        focalPoint: "center",
        sourceType: state.media.screen.type || "video-or-image",
        localPreviewFile: state.media.screen.name || null,
        protect: ["当前讲解的 UI", "数值", "字段", "按钮", "光标操作"],
      };
    }
    return {
      slotId: "speaker-2",
      label: "主讲人画面 2",
      role: "speaker-presence",
      box: getSpeakerGeometry(),
      sourceBox: { ...layout.speaker },
      shape: effectiveSpeakerShape(),
      fit: effectiveSpeakerShape() === "cutout" ? "contain" : "cover",
      focalPoint: effectiveSpeakerShape() === "cutout" ? "center bottom" : "center 18%",
      sourceType: state.media.speaker.type || "video-or-image",
      localPreviewFile: state.media.speaker.name || null,
      protect: ["脸部比例", "额头", "下巴", "必要手势"],
    };
  }

  function getPropertySchema() {
    const theme = currentTheme();
    const content = effectiveContent();
    return [
      { key: "screenVideo", label: "录屏视频 1", type: "video", defaultValue: "" },
      { key: "screenImage", label: "录屏图片 1", type: "image", defaultValue: "" },
      { key: "speakerVideo", label: "主讲人视频 2", type: "video", defaultValue: "" },
      { key: "speakerImage", label: "主讲人图片 2", type: "image", defaultValue: "" },
      { key: "topic", label: "顶栏主题", type: "text", defaultValue: content.topic },
      { key: "point", label: "当前观点", type: "text", defaultValue: content.point },
      { key: "subtitle", label: "单行字幕", type: "text", defaultValue: content.subtitle },
      { key: "screenFit", label: "录屏裁切", type: "select", defaultValue: effectiveScreenFit(), options: ["contain", "cover"] },
      { key: "speakerShape", label: "人物形态", type: "select", defaultValue: effectiveSpeakerShape(), options: ["circle", "rounded", "cutout"] },
      { key: "showSubtitle", label: "显示字幕", type: "boolean", defaultValue: state.showSubtitle },
      { key: "canvasColor", label: "画布色", type: "color", defaultValue: theme.semantic.canvas },
      { key: "textColor", label: "正文色", type: "color", defaultValue: theme.semantic.textPrimary },
      { key: "accentColor", label: "强调色", type: "color", defaultValue: theme.semantic.accent },
    ];
  }

  function getConfig() {
    const format = currentFormat();
    const layout = currentLayout();
    const theme = currentTheme();
    return {
      schemaVersion: "koubo-dual-source/2.0.0",
      generatedAt: new Date().toISOString(),
      sceneId: `koubo-${format.shortName === "横版" ? "landscape" : "portrait"}-dual-source`,
      sceneVersion: 2,
      layoutId: layout.id,
      layoutVersion: layout.layoutVersion,
      outputMode: "fullscreen",
      renderBackend: "chatcut-jsx",
      staticFallback: "stable-state",
      outputGamut: "rec709-sdr",
      canvas: { ...format.canvas },
      safeArea: { ...format.safeArea },
      theme: {
        id: theme.id,
        name: theme.name,
        mode: theme.mode,
        semantic: { ...theme.semantic },
      },
      content: effectiveContent(),
      assetSlots: [getSlotSpec("screen"), getSlotSpec("speaker")],
      subtitle: {
        visible: state.showSubtitle,
        box: { ...layout.subtitle },
        maxLines: 1,
        background: "rgba(0,0,0,0.78)",
        color: "#FFFFFF",
      },
      audio: {
        masterTrack: "speaker-or-cleanest-voice",
        duplicateVoice: "mute",
        sync: "audio-sync-or-multicam",
      },
      privacy: {
        scanFor: ["二维码", "手机号", "账号", "客户信息", "通知弹窗"],
        treatment: "crop-out-or-track-blur",
      },
      layerOrder: ["主题画布", "录屏画面 1", "主讲人画面 2", "观点包装", "单行字幕"],
      source: {
        editor: `${location.origin}${ROOT}`,
        compositions: `${location.origin}${ROOT}/tokens/compositions.json`,
        themes: `${location.origin}${ROOT}/tokens/themes.json`,
        originalThemeKit: `${location.origin}${ROOT}/portrait-talk-theme-kit.zip`,
      },
      chatcut: {
        assetType: "motion-graphic",
        naturalBox: { width: format.canvas.width, height: format.canvas.height },
        propertySchema: getPropertySchema(),
      },
    };
  }

  function getPrompt() {
    const format = currentFormat();
    const layout = currentLayout();
    const theme = currentTheme();
    const screen = getSlotSpec("screen");
    const speaker = getSlotSpec("speaker");
    const content = effectiveContent();
    return `请在当前 ChatCut 项目中建立「录屏画面 1 + 主讲人画面 2」的双源口播场景。

场景规格
- 画幅：${format.name}，${format.canvas.width} × ${format.canvas.height}，${format.canvas.fps}fps。
- 版式：${layout.name}（layoutId: ${layout.id} v${layout.layoutVersion}）。
- 包装主题：${theme.index} ${theme.name}，来自 portrait-talk-theme-kit 原始 token。
- 顶栏：${content.topic}
- 观点：${content.point}
- 字幕：${content.subtitle}

两个素材槽位
1. 录屏画面 1：${JSON.stringify(screen.box)}，fit=${screen.fit}。它是主证据，保护当前讲解的字段、数值、按钮和光标。
2. 主讲人画面 2：${JSON.stringify(speaker.box)}，shape=${speaker.shape}，fit=${speaker.fit}。必须等比例裁切，脸不能拉宽或挤瘦。

剪辑要求
1. 两路素材先做音频同步 / 多机位同步，仅保留一路最清晰的主讲人声音，静音重复人声。
2. 先完成内容删减与同步，再放置画中画、字幕和包装；改变时长后重新对齐下游元素。
3. 录屏 contain 用于保护整体 UI；cover 必须按当前任务定向聚焦，不得裁掉关键证据。
4. 圆形人像使用正方形 cover 框或一次显式裁切，不同时叠加两次成方。
5. 字幕最多一行，位于 ${JSON.stringify(layout.subtitle)}，不压人脸、关键 UI 和平台底部操作区。
6. 全片扫描二维码、手机号、账号、客户信息和通知弹窗；裁出或跟踪模糊，并检查出现前、中、后。
7. 横版和竖版使用各自的固定画布，禁止整体缩放、拉伸或补黑边冒充适配。

数据源
- 双画面坐标：${location.origin}${ROOT}/tokens/compositions.json
- 主题 token：${location.origin}${ROOT}/tokens/themes.json
- 可编辑 JSX：使用本工具导出的 ChatCut JSX。`;
  }

  function getMarkdown() {
    const config = getConfig();
    const format = currentFormat();
    const layout = currentLayout();
    const theme = currentTheme();
    const content = effectiveContent();
    return `# 双画面口播剪辑交接

## 场景规格

- 画幅：${format.name}
- 画布：${format.canvas.width} × ${format.canvas.height} @ ${format.canvas.fps}fps
- 版式：${layout.name}
- layoutId：\`${layout.id}\` v${layout.layoutVersion}
- 配色：${theme.index} ${theme.name}
- 输出色域：Rec.709 SDR

## 素材账本

| 槽位 | 用途 | 本机预览文件 | 坐标 | 适配 |
| --- | --- | --- | --- | --- |
| 录屏画面 1 | 真实操作 / 数据 / 结果证据 | ${state.media.screen.name || "待填写"} | \`${JSON.stringify(config.assetSlots[0].box)}\` | ${config.assetSlots[0].fit} |
| 主讲人画面 2 | 表达 / 信任 / 节奏 | ${state.media.speaker.name || "待填写"} | \`${JSON.stringify(config.assetSlots[1].box)}\` | ${config.assetSlots[1].shape} / ${config.assetSlots[1].fit} |

> 本地预览素材没有上传。进入 ChatCut 后需将真实项目素材绑定到两个槽位。

## 可见文案

- 顶栏主题：${content.topic}
- 当前观点：${content.point}
- 字幕样例：${content.subtitle}

## 图层与声音

1. 主题画布
2. 录屏画面 1（主证据）
3. 主讲人画面 2（人物层）
4. 观点包装
5. 单行字幕

两路素材先做音频同步。仅保留一路最清晰的主人声，静音重复人声，避免回声和相位问题。

## 验收

- [ ] 录屏中当前讲解的字段、数值、按钮和光标可见
- [ ] 人脸比例自然，圆形是正圆，没有叶片形 / 胶囊形
- [ ] 字幕一行可读，不压人脸和关键 UI
- [ ] 二维码、手机号、账号、客户信息与通知弹窗已处理
- [ ] 在实际手机尺寸或目标播放端复核
- [ ] 按最终 fps 短导出并抽帧，不只看网页预览
`;
  }

  function getChatCutJsx() {
    const format = currentFormat();
    const layout = currentLayout();
    const theme = currentTheme();
    const s = theme.semantic;
    const screen = layout.screen;
    const speaker = getSpeakerGeometry();
    const subtitle = layout.subtitle;
    const title = layout.title;
    const point = layout.point;
    const shape = effectiveSpeakerShape();
    const portrait = format.canvas.height > format.canvas.width;
    const schema = JSON.stringify(getPropertySchema(), null, 2);

    return `const Media = ({ video, image, style }) => {
  if (video) return <Video src={video} style={style} />;
  if (image) return <Img src={image} style={style} />;
  return null;
};

const Component = ({ item }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const props = item.props || {};
  const opacity = interpolate(seconds, [0, 0.34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const screenFit = props.screenFit || "${effectiveScreenFit()}";
  const speakerShape = props.speakerShape || "${shape}";
  const speakerIsCutout = speakerShape === "cutout";
  const speakerIsCircle = speakerShape === "circle";

  return (
    <div data-scene-id="koubo-dual-source" data-layout-id="${layout.id}" style={{
      position: "absolute", inset: 0, width: ${format.canvas.width}, height: ${format.canvas.height},
      overflow: "hidden", opacity, background: props.canvasColor || "${s.canvas}",
      color: props.textColor || "${s.textPrimary}", fontFamily: "PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif"
    }}>
      <div id="group-title" style={{ position: "absolute", left: ${title.x}, top: ${title.y}, width: ${title.w}, height: ${title.h}, display: "flex", alignItems: "center", gap: 20, fontSize: ${portrait ? 42 : 32}, fontWeight: 800, whiteSpace: "nowrap" }}>
        <span style={{ width: 8, height: "65%", background: props.accentColor || "${s.accent}" }} />{props.topic}
      </div>

      <div id="group-screen-1" style={{ position: "absolute", left: ${screen.x}, top: ${screen.y}, width: ${screen.w}, height: ${screen.h}, overflow: "hidden", border: "2px solid ${s.border}", borderRadius: ${screen.radius}, background: "${s.surface}" }}>
        <div style={{ position: "absolute", inset: "0 0 auto 0", height: 38, display: "flex", alignItems: "center", gap: 9, padding: "0 16px", borderBottom: "1px solid ${s.border}", background: "${s.surface}" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: props.accentColor || "${s.accent}" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", opacity: 0.55, background: props.accentColor || "${s.accent}" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", opacity: 0.3, background: props.accentColor || "${s.accent}" }} />
        </div>
        <Media video={props.screenVideo} image={props.screenImage} style={{ position: "absolute", left: 0, top: 38, width: "100%", height: ${Math.max(1, screen.h - 38)}, objectFit: screenFit, objectPosition: "50% 50%" }} />
      </div>

      <div id="group-speaker-2" style={{ position: "absolute", left: ${speaker.x}, top: ${speaker.y}, width: ${speaker.w}, height: ${speaker.h}, overflow: speakerIsCutout ? "visible" : "hidden", border: speakerIsCutout ? "none" : \`4px solid \${props.accentColor || "${s.accent}"}\`, borderRadius: speakerIsCircle ? "50%" : ${layout.speaker.radius || 28}, background: speakerIsCutout ? "transparent" : "${s.speakerSurface}", boxShadow: speakerIsCutout ? "none" : "0 18px 45px ${s.shadow}" }}>
        <Media video={props.speakerVideo} image={props.speakerImage} style={{ width: "100%", height: "100%", objectFit: speakerIsCutout ? "contain" : "cover", objectPosition: speakerIsCutout ? "50% 100%" : "50% 18%" }} />
      </div>

      <div id="group-point" style={{ position: "absolute", left: ${point.x}, top: ${point.y}, width: ${point.w}, height: ${point.h}, display: "flex", alignItems: "center", color: "${s.emphasis}", fontSize: ${portrait ? 52 : 29}, fontWeight: 750, whiteSpace: "nowrap" }}>
        <span style={{ width: 48, height: 6, marginRight: 20, background: props.accentColor || "${s.accent}" }} />{props.point}
      </div>

      {props.showSubtitle ? <div id="group-subtitle" style={{ position: "absolute", left: ${subtitle.x}, top: ${subtitle.y}, width: ${subtitle.w}, height: ${subtitle.h}, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 34px", overflow: "hidden", borderRadius: 18, color: "#FFFFFF", background: "rgba(0,0,0,0.78)", fontSize: ${subtitle.fontSize}, lineHeight: 1, fontWeight: 750, textAlign: "center", whiteSpace: "nowrap" }}>{props.subtitle}</div> : null}
    </div>
  );
};

Component.propertySchema = ${schema};
Component.naturalBox = { width: ${format.canvas.width}, height: ${format.canvas.height} };

export default Component;`;
  }

  function updateOutput() {
    const generators = {
      prompt: getPrompt,
      json: () => JSON.stringify(getConfig(), null, 2),
      jsx: getChatCutJsx,
      markdown: getMarkdown,
    };
    elements.outputCode.textContent = generators[state.outputType]();
  }

  function createMediaElement(file) {
    const isVideo = file.type.startsWith("video/");
    const element = document.createElement(isVideo ? "video" : "img");
    if (isVideo) {
      element.muted = true;
      element.loop = true;
      element.autoplay = true;
      element.playsInline = true;
      element.preload = "metadata";
    }
    element.alt = "";
    element.src = URL.createObjectURL(file);
    return { element, url: element.src, type: isVideo ? "video" : "image", name: file.name };
  }

  function setMedia(slot, file) {
    const previous = state.media[slot];
    if (previous.url) URL.revokeObjectURL(previous.url);
    if (!file) {
      if (previous.element?.parentElement) previous.element.remove();
      state.media[slot] = { url: "", type: "", name: "", element: null };
    } else {
      const next = createMediaElement(file);
      state.media[slot] = next;
      const readyEvent = next.type === "video" ? "loadedmetadata" : "load";
      next.element.addEventListener(readyEvent, () => {
        if (next.type === "video") next.element.play().catch(() => {});
        updatePreview();
      }, { once: true });
    }
    const isScreen = slot === "screen";
    (isScreen ? elements.screenFileName : elements.speakerFileName).textContent = file ? file.name : "尚未选择素材";
    (isScreen ? elements.removeScreen : elements.removeSpeaker).hidden = !file;
    updatePreview();
  }

  function roundRectPath(ctx, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawMediaFit(ctx, media, box, fit, focusY = 0.5) {
    if (!media?.element) return false;
    const element = media.element;
    const sourceWidth = media.type === "video" ? element.videoWidth : element.naturalWidth;
    const sourceHeight = media.type === "video" ? element.videoHeight : element.naturalHeight;
    if (!sourceWidth || !sourceHeight) return false;
    const scale = fit === "contain" ? Math.min(box.w / sourceWidth, box.h / sourceHeight) : Math.max(box.w / sourceWidth, box.h / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    const x = box.x + (box.w - width) / 2;
    const y = box.y + (box.h - height) * focusY;
    ctx.drawImage(element, x, y, width, height);
    return true;
  }

  function drawScreenPlaceholder(ctx, box) {
    ctx.fillStyle = "#21364A";
    ctx.fillRect(box.x, box.y, box.w * .19, box.h);
    ctx.fillStyle = "#EDF1F3";
    ctx.fillRect(box.x + box.w * .19, box.y, box.w * .81, box.h);
    ctx.fillStyle = "#294F68";
    roundRectPath(ctx, box.x + box.w * .25, box.y + box.h * .12, box.w * .3, box.h * .08, 8);
    ctx.fill();
    ctx.fillStyle = "#BBC8CF";
    ctx.fillRect(box.x + box.w * .25, box.y + box.h * .27, box.w * .58, Math.max(4, box.h * .025));
    ctx.fillRect(box.x + box.w * .25, box.y + box.h * .34, box.w * .43, Math.max(4, box.h * .025));
    ctx.fillStyle = "#FFFFFF";
    for (let index = 0; index < 3; index += 1) {
      roundRectPath(ctx, box.x + box.w * (.25 + index * .205), box.y + box.h * .48, box.w * .17, box.h * .32, 10);
      ctx.fill();
    }
  }

  function drawSpeakerPlaceholder(ctx, box, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(box.x + box.w / 2, box.y + box.h * .28, Math.min(box.w, box.h) * .14, 0, Math.PI * 2);
    ctx.fill();
    roundRectPath(ctx, box.x + box.w * .18, box.y + box.h * .43, box.w * .64, box.h * .62, Math.min(box.w, box.h) * .2);
    ctx.fill();
  }

  function drawSingleLine(ctx, text, box, options) {
    ctx.save();
    ctx.fillStyle = options.color;
    ctx.font = `${options.weight || 700} ${options.size}px ${themeKit.typography.fontFamily}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = options.align || "left";
    const x = options.align === "center" ? box.x + box.w / 2 : box.x;
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    ctx.fillText(text, x, box.y + box.h / 2, box.w);
    ctx.restore();
  }

  async function renderPreviewPng() {
    const format = currentFormat();
    const layout = currentLayout();
    const theme = currentTheme();
    const s = theme.semantic;
    const canvas = document.createElement("canvas");
    canvas.width = format.canvas.width;
    canvas.height = format.canvas.height;
    const ctx = canvas.getContext("2d");
    const portrait = canvas.height > canvas.width;
    const shape = effectiveSpeakerShape();
    const speaker = getSpeakerGeometry(layout, shape);
    const content = effectiveContent();

    ctx.fillStyle = s.canvas;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha = .08;
    ctx.strokeStyle = s.textPrimary;
    ctx.lineWidth = 2;
    for (let x = 0; x <= canvas.width; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 48) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();

    drawSingleLine(ctx, content.topic, { x: layout.title.x + 28, y: layout.title.y, w: layout.title.w - 28, h: layout.title.h }, { color: s.textPrimary, size: portrait ? 42 : 32, weight: 800 });
    ctx.fillStyle = s.accent;
    ctx.fillRect(layout.title.x, layout.title.y + layout.title.h * .18, 8, layout.title.h * .64);

    ctx.save();
    roundRectPath(ctx, layout.screen.x, layout.screen.y, layout.screen.w, layout.screen.h, layout.screen.radius);
    ctx.clip();
    ctx.fillStyle = s.surface;
    ctx.fillRect(layout.screen.x, layout.screen.y, layout.screen.w, layout.screen.h);
    ctx.fillStyle = s.surface;
    ctx.fillRect(layout.screen.x, layout.screen.y, layout.screen.w, 38);
    ctx.strokeStyle = s.border;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(layout.screen.x, layout.screen.y + 38); ctx.lineTo(layout.screen.x + layout.screen.w, layout.screen.y + 38); ctx.stroke();
    [1, .55, .3].forEach((alpha, index) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.accent;
      ctx.beginPath();
      ctx.arc(layout.screen.x + 21 + index * 19, layout.screen.y + 19, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    const screenBody = { x: layout.screen.x, y: layout.screen.y + 38, w: layout.screen.w, h: layout.screen.h - 38 };
    if (!drawMediaFit(ctx, state.media.screen, screenBody, effectiveScreenFit())) drawScreenPlaceholder(ctx, screenBody);
    ctx.restore();
    ctx.save();
    roundRectPath(ctx, layout.screen.x, layout.screen.y, layout.screen.w, layout.screen.h, layout.screen.radius);
    ctx.strokeStyle = s.border;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(speaker.x + speaker.w / 2, speaker.y + speaker.h / 2, speaker.w / 2, 0, Math.PI * 2);
      ctx.clip();
    } else if (shape === "rounded") {
      roundRectPath(ctx, speaker.x, speaker.y, speaker.w, speaker.h, layout.speaker.radius || 28);
      ctx.clip();
    }
    if (shape !== "cutout") {
      ctx.fillStyle = s.speakerSurface;
      ctx.fillRect(speaker.x, speaker.y, speaker.w, speaker.h);
    }
    const speakerFit = shape === "cutout" ? "contain" : "cover";
    if (!drawMediaFit(ctx, state.media.speaker, speaker, speakerFit, shape === "cutout" ? 1 : 0.18)) {
      drawSpeakerPlaceholder(ctx, speaker, s.speakerFigure);
    }
    ctx.restore();
    if (shape !== "cutout") {
      ctx.save();
      if (shape === "circle") {
        ctx.beginPath();
        ctx.arc(speaker.x + speaker.w / 2, speaker.y + speaker.h / 2, speaker.w / 2 - 2, 0, Math.PI * 2);
      } else {
        roundRectPath(ctx, speaker.x, speaker.y, speaker.w, speaker.h, layout.speaker.radius || 28);
      }
      ctx.strokeStyle = s.accent;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = s.accent;
    ctx.fillRect(layout.point.x, layout.point.y + layout.point.h / 2 - 3, 48, 6);
    const pointSize = portrait ? (Array.from(content.point).length > 14 ? 42 : 52) : (Array.from(content.point).length > 18 ? 25 : 29);
    drawSingleLine(ctx, content.point, { x: layout.point.x + 68, y: layout.point.y, w: layout.point.w - 68, h: layout.point.h }, { color: s.emphasis, size: pointSize, weight: 750 });

    if (state.showSubtitle) {
      ctx.save();
      roundRectPath(ctx, layout.subtitle.x, layout.subtitle.y, layout.subtitle.w, layout.subtitle.h, 18);
      ctx.fillStyle = "rgba(0,0,0,0.78)";
      ctx.fill();
      drawSingleLine(ctx, content.subtitle, layout.subtitle, { color: "#FFFFFF", size: layout.subtitle.fontSize, weight: 750, align: "center" });
      ctx.restore();
    }

    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG 生成失败")), "image/png"));
  }

  function getCompositionSvg() {
    const format = currentFormat();
    const layout = currentLayout();
    const theme = currentTheme();
    const s = theme.semantic;
    const speaker = getSpeakerGeometry();
    const safe = format.safeArea;
    const speakerShape = effectiveSpeakerShape();
    const speakerNode = speakerShape === "circle"
      ? `<circle cx="${speaker.x + speaker.w / 2}" cy="${speaker.y + speaker.h / 2}" r="${speaker.w / 2}" fill="${s.speakerSurface}" stroke="${s.accent}" stroke-width="4"/>`
      : `<rect x="${speaker.x}" y="${speaker.y}" width="${speaker.w}" height="${speaker.h}" rx="${speakerShape === "cutout" ? 0 : layout.speaker.radius || 28}" fill="${speakerShape === "cutout" ? "none" : s.speakerSurface}" stroke="${s.accent}" stroke-width="4"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${format.canvas.width} ${format.canvas.height}" width="${format.canvas.width}" height="${format.canvas.height}">
  <rect width="100%" height="100%" fill="${s.canvas}"/>
  <rect x="${safe.left}" y="${safe.top}" width="${format.canvas.width - safe.left - safe.right}" height="${format.canvas.height - safe.top - safe.bottom}" fill="none" stroke="${s.accent}" stroke-width="3" stroke-dasharray="16 12" opacity="0.7"/>
  <rect x="${layout.screen.x}" y="${layout.screen.y}" width="${layout.screen.w}" height="${layout.screen.h}" rx="${layout.screen.radius}" fill="${s.surface}" stroke="${s.border}" stroke-width="3"/>
  ${speakerNode}
  <rect x="${layout.subtitle.x}" y="${layout.subtitle.y}" width="${layout.subtitle.w}" height="${layout.subtitle.h}" rx="18" fill="rgba(0,0,0,0.78)"/>
  <g fill="${s.textPrimary}" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-weight="700">
    <text x="${layout.screen.x + 24}" y="${layout.screen.y + 56}" font-size="28">1  ${escapeXml("录屏画面")}</text>
    <text x="${speaker.x + 20}" y="${speaker.y + 48}" font-size="28">2  ${escapeXml("主讲人")}</text>
  </g>
  <text x="${layout.subtitle.x + layout.subtitle.w / 2}" y="${layout.subtitle.y + layout.subtitle.h / 2}" fill="#fff" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="${Math.min(layout.subtitle.fontSize, 56)}" text-anchor="middle" dominant-baseline="middle">${escapeXml(effectiveContent().subtitle)}</text>
  <metadata>${escapeXml(JSON.stringify({ layoutId: layout.id, layoutVersion: layout.layoutVersion, screenFit: effectiveScreenFit(), speakerShape }))}</metadata>
</svg>`;
  }

  function crc32(bytes) {
    let table = crc32.table;
    if (!table) {
      table = crc32.table = new Uint32Array(256);
      for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
      }
    }
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  // 零依赖 store 模式 ZIP：交接包体积以 PNG 为主，压缩收益低，保持可读实现优先。
  function buildZip(files) {
    const encoder = new TextEncoder();
    const stamp = new Date();
    const dosTime = (stamp.getHours() << 11) | (stamp.getMinutes() << 5) | Math.floor(stamp.getSeconds() / 2);
    const dosDate = ((stamp.getFullYear() - 1980) << 9) | ((stamp.getMonth() + 1) << 5) | stamp.getDate();
    const parts = [];
    const centrals = [];
    let offset = 0;

    for (const file of files) {
      const name = encoder.encode(file.name);
      const crc = crc32(file.data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true);
      local.setUint16(8, 0, true);
      local.setUint16(10, dosTime, true);
      local.setUint16(12, dosDate, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, file.data.length, true);
      local.setUint32(22, file.data.length, true);
      local.setUint16(26, name.length, true);
      local.setUint16(28, 0, true);
      parts.push(new Uint8Array(local.buffer), name, file.data);

      const central = new DataView(new ArrayBuffer(46));
      central.setUint32(0, 0x02014b50, true);
      central.setUint16(4, 20, true);
      central.setUint16(6, 20, true);
      central.setUint16(8, 0x0800, true);
      central.setUint16(10, 0, true);
      central.setUint16(12, dosTime, true);
      central.setUint16(14, dosDate, true);
      central.setUint32(16, crc, true);
      central.setUint32(20, file.data.length, true);
      central.setUint32(24, file.data.length, true);
      central.setUint16(28, name.length, true);
      central.setUint32(42, offset, true);
      centrals.push(new Uint8Array(central.buffer), name);
      offset += 30 + name.length + file.data.length;
    }

    const centralSize = centrals.reduce((total, part) => total + part.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...centrals, new Uint8Array(end.buffer)], { type: "application/zip" });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadText(text, filename, type = "text/plain;charset=utf-8") {
    downloadBlob(new Blob([text], { type }), filename);
  }

  async function handleDownload(type) {
    const format = currentFormat();
    const layout = currentLayout();
    const base = `koubo-${slugify(format.id)}-${slugify(layout.id)}`;
    if (type === "preview-png") return downloadBlob(await renderPreviewPng(), `${base}-preview.png`);
    if (type === "composition-svg") return downloadText(getCompositionSvg(), `${base}-layout.svg`, "image/svg+xml;charset=utf-8");
    if (type === "config-json") return downloadText(JSON.stringify(getConfig(), null, 2), `${base}-scene.json`, "application/json;charset=utf-8");
    if (type === "chatcut-jsx") return downloadText(getChatCutJsx(), `${base}-chatcut.jsx`, "text/javascript;charset=utf-8");
    if (type === "brief-md") return downloadText(getMarkdown(), `${base}-handoff.md`, "text/markdown;charset=utf-8");
    if (type === "handoff-pack") {
      const encoder = new TextEncoder();
      const png = new Uint8Array(await (await renderPreviewPng()).arrayBuffer());
      return downloadBlob(buildZip([
        { name: `${base}-preview.png`, data: png },
        { name: `${base}-layout.svg`, data: encoder.encode(getCompositionSvg()) },
        { name: `${base}-scene.json`, data: encoder.encode(JSON.stringify(getConfig(), null, 2)) },
        { name: `${base}-chatcut.jsx`, data: encoder.encode(getChatCutJsx()) },
        { name: `${base}-handoff.md`, data: encoder.encode(getMarkdown()) },
      ]), `${base}-handoff-pack.zip`);
    }
  }

  function bindEvents() {
    const contentMap = { topicInput: "topic", pointInput: "point", subtitleInput: "subtitle" };
    Object.entries(contentMap).forEach(([id, key]) => {
      elements[id].addEventListener("input", (event) => {
        state.content[key] = event.target.value;
        updatePreview();
      });
    });

    elements.resetContent.addEventListener("click", () => {
      state.content = { ...DEFAULT_CONTENT };
      syncForm();
      updatePreview();
    });

    elements.screenFitSelect.addEventListener("change", (event) => {
      state.screenFit = event.target.value;
      updatePreview();
    });
    elements.speakerShapeSelect.addEventListener("change", (event) => {
      state.speakerShape = event.target.value;
      updatePreview();
    });
    elements.subtitleToggle.addEventListener("change", (event) => {
      state.showSubtitle = event.target.checked;
      updatePreview();
    });
    elements.guideToggle.addEventListener("change", (event) => {
      state.showGuides = event.target.checked;
      updatePreview();
    });
    elements.screenUpload.addEventListener("change", (event) => setMedia("screen", event.target.files?.[0] || null));
    elements.speakerUpload.addEventListener("change", (event) => setMedia("speaker", event.target.files?.[0] || null));
    elements.removeScreen.addEventListener("click", () => {
      elements.screenUpload.value = "";
      setMedia("screen", null);
    });
    elements.removeSpeaker.addEventListener("click", () => {
      elements.speakerUpload.value = "";
      setMedia("speaker", null);
    });

    document.querySelectorAll("[data-output]").forEach((button) => {
      button.addEventListener("click", () => {
        state.outputType = button.dataset.output;
        document.querySelectorAll("[data-output]").forEach((tab) => tab.setAttribute("aria-selected", String(tab === button)));
        updateOutput();
      });
    });

    elements.copyOutput.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(elements.outputCode.textContent);
        elements.copyStatus.textContent = "已复制到剪贴板";
      } catch (_) {
        const range = document.createRange();
        range.selectNodeContents(elements.outputCode);
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        elements.copyStatus.textContent = "已选中内容，请按 ⌘C / Ctrl+C";
      }
      setTimeout(() => { elements.copyStatus.textContent = ""; }, 2200);
    });

    document.querySelectorAll("[data-download]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await handleDownload(button.dataset.download);
        } catch (error) {
          elements.copyStatus.textContent = error.message || "导出失败，请稍后重试";
        } finally {
          button.disabled = false;
        }
      });
    });

    addEventListener("resize", fitPreview);
    if (window.ResizeObserver) new ResizeObserver(fitPreview).observe(elements.previewStage);
  }

  function cacheElements() {
    [
      "formatGrid", "compositionGrid", "themeGrid", "layoutCount",
      "topicInput", "pointInput", "subtitleInput", "resetContent", "screenFitSelect", "speakerShapeSelect",
      "subtitleToggle", "guideToggle", "screenUpload", "speakerUpload", "removeScreen", "removeSpeaker",
      "screenFileName", "speakerFileName", "previewStage", "previewViewport", "videoCanvas",
      "canvasTitle", "screenShell", "screenMedia", "speakerShell", "speakerMedia", "canvasPoint",
      "canvasSubtitle", "safeOverlay", "previewRatio", "previewDimensions", "layoutAdvice", "pngSpec",
      "outputCode", "copyOutput", "copyStatus",
    ].forEach((id) => { elements[id] = $(id); });
  }

  async function init() {
    cacheElements();
    try {
      [themeKit, compositionKit] = await Promise.all([
        loadJson("tokens/themes.json"),
        loadJson("tokens/compositions.json"),
      ]);
      restoreState();
      renderFormatOptions();
      renderCompositionOptions();
      renderThemeOptions();
      syncForm();
      bindEvents();
      updatePreview();
    } catch (error) {
      elements.previewStage.innerHTML = `<div class="kit-load-error"><strong>双画面配置数据加载失败</strong><span>${escapeHtml(error.message)}</span></div>`;
      console.error(error);
    }
  }

  init();
})();
