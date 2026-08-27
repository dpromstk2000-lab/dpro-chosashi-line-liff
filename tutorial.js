(() => {
  "use strict";

  const VERSION = "CHOSASHI-TUTORIAL-R3-FIRST10-V1.0-20260827";
  const STORAGE_KEY = "dpro:tutorial:chosashi:v1.1";
  const TUTORIAL_ID = "chosashi-first10-v1";
  const SUPPORTED = new Set(["index.html", "owner.html", "staff.html", "owner-ipad.html", "member.html"]);
  const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  const SAFE_MARGIN = 12;
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  const STEPS = Object.freeze([
    {
      n: 1, route: "index.html", title: "まずは4段階の相談受付を確認",
      text: "相談は『相談内容 → お客様情報 → 物件・日時 → 内容確認』の4段階です。チュートリアルでは業務入力や送信をしなくても全体像を確認できます。",
      selectors: ["#main .stepper", "#main"], warning: "公開デモでは実在する氏名・電話番号・所在地を入力しないでください。"
    },
    {
      n: 2, route: "index.html", title: "相談区分を選ぶ場所",
      text: "『土地について』『建物について』『よく分からない』から近い内容を選ぶ場所です。チュートリアルは選択を代行しません。",
      selectors: ['[data-step="1"] .service-tabs', '[data-step="1"] .section-title'], warning: "選択は画面内だけの状態変更ですが、First10完了には操作不要です。"
    },
    {
      n: 3, route: "index.html", title: "現在の状況・困りごとを書く場所",
      text: "ここに経緯や希望時期を書きます。入力する場合は架空内容だけを使ってください。チュートリアルはフォーム値を読み取りません。",
      selectors: ["#consultationSummary", '[data-step="1"] .section-title'], warning: "Tutorial保存領域に入力内容・電話番号・住所などは保存しません。"
    },
    {
      n: 4, route: "index.html", title: "連絡先と登録情報確認",
      text: "STEP 2では氏名・電話番号などを入力し、再相談時は登録情報確認を利用できます。隠れているSTEPをチュートリアルが勝手に開くことはありません。",
      selectors: ['[data-step="2"]:not([hidden]) .section-title', '#lookupButton:not([hidden])', '[data-step-indicator="2"]'], warning: "登録情報確認は必要なときに利用者自身が操作します。"
    },
    {
      n: 5, route: "index.html", title: "物件所在地・希望日時・同意",
      text: "STEP 3では相談対象の土地・建物所在地、希望日時、個人情報同意を確認します。日付・選択・チェック操作をチュートリアルは行いません。",
      selectors: ['[data-step="3"]:not([hidden]) .section-title', '#preferredDate:not([hidden])', '#privacyConsent:not([hidden])', '[data-step-indicator="3"]'], warning: "相談対象所在地と現在の住所は別の場合があります。実在情報は公開デモへ入力しないでください。"
    },
    {
      n: 6, route: "index.html", title: "『送信』は業務登録になる境界",
      text: "内容確認の『この内容で相談を送信』は実際の相談登録です。First10では押さず、下の『次へ』で管理画面の説明へ進みます。",
      selectors: ['#submitButton:not([hidden])', '#confirmationSummary:not([hidden])', '[data-step-indicator="4"]'], warning: "重要：チュートリアルは相談送信を自動実行しません。"
    },
    {
      n: 7, route: "owner.html", title: "管理PCのダッシュボード",
      text: "進行中案件、本日の予定、未完了タスク、確認待ち資料など、今日の業務全体を確認する画面です。",
      selectors: ['[data-page-panel="dashboard"].active .metric-grid', '#dashboardCases:not([hidden])', '.nav-button[data-page="dashboard"]', '#loginScreen'], warning: "管理コードは利用者が入力します。チュートリアルは読み取り・保存・自動入力しません。"
    },
    {
      n: 8, route: "owner.html", title: "案件一覧と『次に行うこと』",
      text: "案件一覧では案件番号、状態、担当、次に行うことを確認します。『案件一覧』ボタンを自分で開いて確認しても構いませんが、First10では必須ではありません。",
      selectors: ['[data-page-panel="cases"].active #caseTableBody', '.nav-button[data-page="cases"]', '[data-page-panel="cases"] .page-head'], warning: "保存・状態更新・予定追加・タスク追加などの更新操作はチュートリアルが実行しません。"
    },
    {
      n: 9, route: "staff.html", title: "現場当日の予定と安全境界",
      text: "現場予定から『現場詳細』を確認できます。到着・作業開始・報告・写真・完了は実業務更新なので、First10では操作しません。",
      selectors: ['#appointmentList .open-detail', '#appointmentList', '.notice.warning', '#loginScreen'], warning: "写真には顔・車両番号・近隣住民など不要な個人情報を含めず、位置情報も必要な現場だけで利用します。"
    },
    {
      n: 10, route: "member.html", title: "お客様マイページで進捗を確認",
      text: "案件一覧から現在の進捗、次に行うこと、必要書類、今後の予定を確認できます。資料提出やお問い合わせ送信は利用者自身が必要時に行います。",
      selectors: ['#caseList:not(:empty)', '#dashboard:not([hidden]) #caseList', '#dashboard:not([hidden])', '#loginPanel'], warning: "資料提出・お問い合わせ送信などの業務更新をチュートリアルが自動実行することはありません。"
    }
  ]);

  let card, launcher, highlight, live, titleEl, textEl, warningEl, stepEl, routeEl, progressEl;
  let backBtn, nextBtn, skipBtn, closeBtn, replayBtn, guideLink, dragHandle;
  let currentStep = 0;
  let target = null;
  let opener = null;
  let observer = null;
  let userPositioned = false;
  let drag = null;
  let pendingTargetTimer = 0;

  function routeName() {
    const name = location.pathname.split("/").pop() || "index.html";
    return name || "index.html";
  }

  function isDemo() { return new URLSearchParams(location.search).get("demo") === "1"; }
  function now() { return new Date().toISOString(); }

  function defaultState() {
    return {
      schemaVersion: 1, tutorialId: TUTORIAL_ID, stepIndex: 0, status: "in_progress",
      route: "index.html", demo: isDemo(), startedAt: now(), updatedAt: now(),
      lastFocusHint: "tutorial-launcher", cardPosition: { x: 0, y: 0 }
    };
  }

  function sanitizeState(value) {
    if (!value || value.schemaVersion !== 1 || value.tutorialId !== TUTORIAL_ID) return null;
    const updated = Date.parse(value.updatedAt || "");
    if (!Number.isFinite(updated) || Date.now() - updated > MAX_AGE_MS) return null;
    const stepIndex = Math.min(STEPS.length - 1, Math.max(0, Number(value.stepIndex) || 0));
    const allowedStatus = ["in_progress", "skipped", "completed"].includes(value.status) ? value.status : "in_progress";
    const allowedRoute = SUPPORTED.has(value.route) ? value.route : STEPS[stepIndex].route;
    const pos = value.cardPosition && Number.isFinite(Number(value.cardPosition.x)) && Number.isFinite(Number(value.cardPosition.y))
      ? { x: Number(value.cardPosition.x), y: Number(value.cardPosition.y) } : { x: 0, y: 0 };
    return {
      schemaVersion: 1, tutorialId: TUTORIAL_ID, stepIndex, status: allowedStatus,
      route: allowedRoute, demo: value.demo === true, startedAt: String(value.startedAt || now()), updatedAt: String(value.updatedAt || now()),
      lastFocusHint: ["tutorial-launcher", "tutorial-next"].includes(value.lastFocusHint) ? value.lastFocusHint : "tutorial-launcher",
      cardPosition: pos
    };
  }

  function readState() {
    try { return sanitizeState(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { return null; }
  }

  function writeState(patch = {}) {
    const base = readState() || defaultState();
    const safe = sanitizeState({ ...base, ...patch, updatedAt: now() }) || defaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    updateLauncher();
    return safe;
  }

  function clearState() { localStorage.removeItem(STORAGE_KEY); updateLauncher(); }

  function ensureUi() {
    if (card) return;
    launcher = document.createElement("button");
    launcher.id = "dproTutorialLauncher"; launcher.type = "button";
    launcher.addEventListener("click", () => {
      opener = launcher;
      const s = readState();
      if (s && s.status !== "completed") resume(); else start();
    });

    highlight = document.createElement("div");
    highlight.className = "dpro-tutorial-highlight"; highlight.hidden = true; highlight.setAttribute("aria-hidden", "true");

    card = document.createElement("section");
    card.className = "dpro-tutorial-card"; card.hidden = true; card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "false");
    card.setAttribute("aria-labelledby", "dproTutorialTitle");
    card.innerHTML = `
      <div class="dpro-tutorial-drag" data-tutorial-drag-handle tabindex="0" role="separator" aria-label="チュートリアルカードを移動">
        <div><strong>DPRO 操作チュートリアル</strong><br><span>ここだけをドラッグできます</span></div>
        <button class="dpro-tutorial-close" type="button" aria-label="チュートリアルを閉じる">×</button>
      </div>
      <div class="dpro-tutorial-progress" aria-hidden="true"><span></span></div>
      <div class="dpro-tutorial-body">
        <p class="dpro-tutorial-step"></p>
        <h2 class="dpro-tutorial-title" id="dproTutorialTitle" tabindex="-1"></h2>
        <p class="dpro-tutorial-text"></p>
        <div class="dpro-tutorial-warning"></div>
        <p class="dpro-tutorial-route"></p>
      </div>
      <div class="dpro-tutorial-actions">
        <button type="button" data-action="back">戻る</button>
        <button type="button" class="primary" data-action="next">次へ</button>
        <button type="button" data-action="replay" hidden>最初からReplay</button>
        <a href="guide-center.html" data-action="guide" hidden>Guide Center</a>
        <button type="button" class="quiet" data-action="skip">あとで</button>
      </div>`;

    live = document.createElement("div"); live.className = "dpro-tutorial-live"; live.setAttribute("aria-live", "polite");
    document.body.append(highlight, card, launcher, live);

    dragHandle = card.querySelector("[data-tutorial-drag-handle]"); closeBtn = card.querySelector(".dpro-tutorial-close");
    stepEl = card.querySelector(".dpro-tutorial-step"); titleEl = card.querySelector(".dpro-tutorial-title"); textEl = card.querySelector(".dpro-tutorial-text");
    warningEl = card.querySelector(".dpro-tutorial-warning"); routeEl = card.querySelector(".dpro-tutorial-route"); progressEl = card.querySelector(".dpro-tutorial-progress > span");
    backBtn = card.querySelector('[data-action="back"]'); nextBtn = card.querySelector('[data-action="next"]'); skipBtn = card.querySelector('[data-action="skip"]');
    replayBtn = card.querySelector('[data-action="replay"]'); guideLink = card.querySelector('[data-action="guide"]');

    closeBtn.addEventListener("click", () => closeTutorial("close"));
    backBtn.addEventListener("click", back);
    nextBtn.addEventListener("click", next);
    skipBtn.addEventListener("click", () => { writeState({ status: "skipped", lastFocusHint: "tutorial-launcher" }); closeTutorial("skip"); });
    replayBtn.addEventListener("click", replay);
    guideLink.addEventListener("click", () => closeTutorial("guide", false));

    dragHandle.addEventListener("pointerdown", beginDrag);
    dragHandle.addEventListener("keydown", handleDragKeyboard);
    card.addEventListener("keydown", handleCardKeyboard);
    document.addEventListener("keydown", handleGlobalEscape, true);

    window.addEventListener("resize", viewportChanged, { passive: true });
    window.addEventListener("orientationchange", viewportChanged, { passive: true });
    window.addEventListener("scroll", updateHighlight, { passive: true, capture: true });
    if (window.visualViewport) {
      visualViewport.addEventListener("resize", viewportChanged, { passive: true });
      visualViewport.addEventListener("scroll", viewportChanged, { passive: true });
    }

    observer = new MutationObserver(() => { if (!card.hidden) scheduleTargetRefresh(); });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "style"] });
    updateLauncher();
  }

  function updateLauncher() {
    if (!launcher) return;
    const s = readState();
    launcher.textContent = s && s.status !== "completed" ? "操作チュートリアルを再開" : s?.status === "completed" ? "First10をReplay" : "操作チュートリアル";
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }

  function findTarget(step) {
    for (const selector of step.selectors) {
      let el = null;
      try { el = document.querySelector(selector); } catch { el = null; }
      if (visible(el)) return { el, selector };
    }
    return null;
  }

  function scheduleTargetRefresh() {
    clearTimeout(pendingTargetTimer);
    pendingTargetTimer = setTimeout(() => { resolveTarget(false); }, 80);
  }

  function resolveTarget(allowScroll = true) {
    const step = STEPS[currentStep];
    const found = findTarget(step);
    target = found?.el || null;
    if (!target) { highlight.hidden = true; return; }
    if (allowScroll) {
      const r = target.getBoundingClientRect();
      const vv = viewportRect();
      if (r.bottom < vv.top + 70 || r.top > vv.bottom - 70) {
        try { target.scrollIntoView({ block: "center", inline: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } catch { /* noop */ }
      }
    }
    updateHighlight();
    if (!userPositioned) autoPlaceCard();
  }

  function appOverlayActive() {
    const selectors = [
      "#caseDrawer:not([hidden])", "#appointmentModal:not([hidden])", "#taskModal:not([hidden])",
      "#fieldDrawer:not([hidden])", "#reportModal:not([hidden])", "#loginScreen:not([hidden])",
      ".loading:not([hidden])", ".modal-backdrop:not([hidden])"
    ];
    return selectors.some((s) => {
      try { return Array.from(document.querySelectorAll(s)).some(visible); } catch { return false; }
    });
  }

  function updateHighlight() {
    if (!highlight || card?.hidden || appOverlayActive()) { if (highlight) highlight.hidden = true; return; }
    if (!visible(target)) { resolveTarget(false); if (!visible(target)) { highlight.hidden = true; return; } }
    const r = target.getBoundingClientRect();
    const pad = 5;
    highlight.hidden = false;
    highlight.style.left = `${Math.max(0, r.left - pad)}px`;
    highlight.style.top = `${Math.max(0, r.top - pad)}px`;
    highlight.style.width = `${Math.max(0, Math.min(innerWidth, r.right + pad) - Math.max(0, r.left - pad))}px`;
    highlight.style.height = `${Math.max(0, Math.min(innerHeight, r.bottom + pad) - Math.max(0, r.top - pad))}px`;
  }

  function viewportRect() {
    const vv = window.visualViewport;
    const left = vv ? vv.offsetLeft : 0, top = vv ? vv.offsetTop : 0;
    const width = vv ? vv.width : innerWidth, height = vv ? vv.height : innerHeight;
    return { left, top, width, height, right: left + width, bottom: top + height };
  }

  function clampPosition(x, y) {
    const vv = viewportRect();
    const r = card.getBoundingClientRect();
    const maxX = Math.max(vv.left + SAFE_MARGIN, vv.right - r.width - SAFE_MARGIN);
    const maxY = Math.max(vv.top + SAFE_MARGIN, vv.bottom - r.height - SAFE_MARGIN);
    return {
      x: Math.min(Math.max(x, vv.left + SAFE_MARGIN), maxX),
      y: Math.min(Math.max(y, vv.top + SAFE_MARGIN), maxY)
    };
  }

  function setCardPosition(x, y, persist = true) {
    const p = clampPosition(x, y);
    card.style.left = `${Math.round(p.x)}px`; card.style.top = `${Math.round(p.y)}px`;
    if (persist) writeState({ cardPosition: { x: Math.round(p.x), y: Math.round(p.y) } });
  }

  function overlapArea(a, b) {
    const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return w * h;
  }

  function autoPlaceCard() {
    if (!card || card.hidden) return;
    const vv = viewportRect();
    const cr = card.getBoundingClientRect();
    if (!target || !visible(target)) { setCardPosition(vv.right - cr.width - SAFE_MARGIN, vv.bottom - cr.height - SAFE_MARGIN, false); return; }
    const tr = target.getBoundingClientRect();
    const candidates = [
      { x: tr.right + 14, y: tr.top }, { x: tr.left - cr.width - 14, y: tr.top },
      { x: vv.right - cr.width - SAFE_MARGIN, y: tr.bottom + 14 }, { x: vv.right - cr.width - SAFE_MARGIN, y: tr.top - cr.height - 14 },
      { x: vv.left + SAFE_MARGIN, y: vv.bottom - cr.height - SAFE_MARGIN }
    ].map((p) => clampPosition(p.x, p.y));
    let best = candidates[0], bestScore = Infinity;
    for (const p of candidates) {
      const rect = { left: p.x, top: p.y, right: p.x + cr.width, bottom: p.y + cr.height };
      const score = overlapArea(rect, tr);
      if (score < bestScore) { bestScore = score; best = p; }
    }
    setCardPosition(best.x, best.y, false);
  }

  function viewportChanged() {
    if (!card || card.hidden) return;
    const r = card.getBoundingClientRect();
    setCardPosition(r.left, r.top, false);
    updateHighlight();
  }

  function beginDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest("button,a,input,select,textarea,label,summary,details,[contenteditable],[role=button],[role=link]")) return;
    const r = card.getBoundingClientRect();
    drag = { pointerId: event.pointerId, dx: event.clientX - r.left, dy: event.clientY - r.top };
    userPositioned = true;
    try { dragHandle.setPointerCapture(event.pointerId); } catch { /* noop */ }
    dragHandle.addEventListener("pointermove", moveDrag);
    dragHandle.addEventListener("pointerup", endDrag, { once: true });
    dragHandle.addEventListener("pointercancel", endDrag, { once: true });
    event.preventDefault();
  }

  function moveDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    setCardPosition(event.clientX - drag.dx, event.clientY - drag.dy, false);
  }

  function endDrag(event) {
    if (!drag) return;
    const r = card.getBoundingClientRect();
    dragHandle.removeEventListener("pointermove", moveDrag);
    try { dragHandle.releasePointerCapture(drag.pointerId); } catch { /* noop */ }
    drag = null;
    setCardPosition(r.left, r.top, true);
  }

  function handleDragKeyboard(event) {
    const delta = event.shiftKey ? 24 : 10;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const r = card.getBoundingClientRect();
    const dx = event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0;
    const dy = event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0;
    userPositioned = true; setCardPosition(r.left + dx, r.top + dy, true); event.preventDefault();
  }

  function focusables() {
    return Array.from(card.querySelectorAll('button:not([hidden]):not([disabled]),a[href]:not([hidden]),[tabindex]:not([tabindex="-1"]):not([hidden])')).filter(visible);
  }

  function handleCardKeyboard(event) {
    if (event.key !== "Tab" || card.hidden) return;
    const items = focusables(); if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
    else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
  }

  function handleGlobalEscape(event) {
    if (event.key !== "Escape" || !card || card.hidden) return;
    if (appOverlayActive()) return;
    event.preventDefault(); event.stopPropagation(); closeTutorial("escape");
  }

  function currentRouteMatches(step) { return routeName() === step.route || (routeName() === "" && step.route === "index.html"); }

  function navigateToStep(index) {
    const step = STEPS[index];
    writeState({ stepIndex: index, route: step.route, status: "in_progress", demo: isDemo(), lastFocusHint: "tutorial-next" });
    const url = new URL(step.route, location.href);
    if (isDemo()) url.searchParams.set("demo", "1");
    url.searchParams.set("tutorial", "resume");
    location.assign(url.href);
  }

  function renderStep(index, options = {}) {
    ensureUi();
    currentStep = Math.min(STEPS.length - 1, Math.max(0, index));
    const step = STEPS[currentStep];
    if (!currentRouteMatches(step)) { navigateToStep(currentStep); return; }

    card.hidden = false; launcher.hidden = true; replayBtn.hidden = true; guideLink.hidden = true;
    backBtn.hidden = currentStep === 0; skipBtn.hidden = false; nextBtn.hidden = false;
    nextBtn.textContent = currentStep === STEPS.length - 1 ? "完了" : "次へ";
    stepEl.textContent = `FIRST10 ${String(step.n).padStart(2, "0")} / 10`;
    titleEl.textContent = step.title; textEl.textContent = step.text; warningEl.textContent = step.warning || "";
    warningEl.hidden = !step.warning; routeEl.textContent = `画面: ${step.route}${isDemo() ? "?demo=1" : ""}`;
    progressEl.style.width = `${(step.n / STEPS.length) * 100}%`;
    live.textContent = `チュートリアル ${step.n} / 10、${step.title}`;
    writeState({ stepIndex: currentStep, route: step.route, status: "in_progress", demo: isDemo(), lastFocusHint: "tutorial-next" });

    const saved = readState();
    userPositioned = false;
    requestAnimationFrame(() => {
      if (options.restorePosition && saved?.cardPosition && (saved.cardPosition.x || saved.cardPosition.y)) {
        userPositioned = true; setCardPosition(saved.cardPosition.x, saved.cardPosition.y, false);
      } else autoPlaceCard();
      titleEl.focus({ preventScroll: true });
      resolveTarget(true);
      let attempts = 0;
      const retry = setInterval(() => {
        if (card.hidden || currentStep !== index) { clearInterval(retry); return; }
        resolveTarget(false); attempts += 1;
        if (target || attempts >= 25) clearInterval(retry);
      }, 200);
    });
  }

  function showComplete() {
    ensureUi();
    highlight.hidden = true; target = null;
    card.hidden = false; launcher.hidden = true;
    stepEl.textContent = "FIRST10 COMPLETE";
    titleEl.textContent = "First10を完了しました";
    textEl.textContent = "相談受付 → 管理PC → 現場 → お客様マイページの基本導線を確認しました。業務更新はチュートリアルから一度も実行していません。";
    warningEl.textContent = "操作を詳しく確認するときはGuide Centerを開けます。ReplayはTutorial保存領域だけを初期化します。"; warningEl.hidden = false;
    routeEl.textContent = `Tutorial version: ${VERSION}`; progressEl.style.width = "100%";
    backBtn.hidden = true; nextBtn.hidden = true; skipBtn.hidden = true; replayBtn.hidden = false; guideLink.hidden = false;
    writeState({ stepIndex: STEPS.length - 1, route: routeName(), status: "completed", lastFocusHint: "tutorial-launcher" });
    requestAnimationFrame(() => { autoPlaceCard(); titleEl.focus({ preventScroll: true }); });
  }

  function next() {
    if (currentStep >= STEPS.length - 1) { showComplete(); return; }
    const nextIndex = currentStep + 1;
    if (STEPS[nextIndex].route !== routeName()) navigateToStep(nextIndex); else renderStep(nextIndex);
  }

  function back() {
    if (currentStep <= 0) return;
    const prev = currentStep - 1;
    if (STEPS[prev].route !== routeName()) navigateToStep(prev); else renderStep(prev);
  }

  function closeTutorial(reason = "close", restore = true) {
    if (!card) return;
    card.hidden = true; highlight.hidden = true; launcher.hidden = false; target = null;
    if (restore) requestAnimationFrame(() => (opener && opener.isConnected ? opener : launcher).focus({ preventScroll: true }));
    live.textContent = reason === "escape" ? "チュートリアルを閉じました" : "チュートリアルを一時停止しました";
  }

  function start() {
    ensureUi(); opener = document.activeElement instanceof HTMLElement ? document.activeElement : launcher;
    clearState(); const s = defaultState(); localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    if (routeName() !== "index.html") navigateToStep(0); else renderStep(0);
  }

  function resume() {
    ensureUi(); opener = document.activeElement instanceof HTMLElement ? document.activeElement : launcher;
    const s = readState();
    if (!s || s.status === "completed") { start(); return; }
    const index = Math.min(STEPS.length - 1, Math.max(0, s.stepIndex));
    if (STEPS[index].route !== routeName()) navigateToStep(index); else renderStep(index, { restorePosition: true });
  }

  function replay() { clearState(); start(); }

  function bootstrap() {
    if (!SUPPORTED.has(routeName())) return;
    ensureUi();
    const action = new URLSearchParams(location.search).get("tutorial");
    const s = readState();
    if (action === "replay" || action === "start") { replay(); return; }
    if (action === "resume") { resume(); return; }
    if (s && s.status === "in_progress" && s.route === routeName()) updateLauncher();
  }

  window.DPRO_TUTORIAL = Object.freeze({
    version: VERSION,
    storageKey: STORAGE_KEY,
    tutorialId: TUTORIAL_ID,
    steps: STEPS.map(({ n, route, title, selectors }) => Object.freeze({ n, route, title, selectors: [...selectors] })),
    start, resume, replay,
    getState: () => readState(),
    mutationMethods: Object.freeze([...MUTATING_METHODS])
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true }); else bootstrap();
})();
