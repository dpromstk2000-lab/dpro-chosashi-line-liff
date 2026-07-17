"use strict";
// CHOSASHI-7-R2 CACHE-BUST 20260717
// CHOSASHI-7-R1 IPAD LAYOUT OPTIMIZE 20260717
const CONFIG = window.DPRO_CONFIG || {};
const $ = (id) => document.getElementById(id);
const qsa = (selector) => Array.from(document.querySelectorAll(selector));

const mode = document.body.dataset.mode || "staff";
const params = new URLSearchParams(location.search);

const state = {
  mode,
  demo: params.get("demo") === "1",
  adminCode: "",
  office: null,
  staff: [],
  staffId: "",
  date: "",
  today: null,
  currentAppointment: null,
  currentContext: null,
  currentReportId: null,
  currentLocation: null,
  demoDateAdjusted: false,
};

const APPOINTMENT_TYPES = {
  consultation: "相談",
  site_survey: "現地調査",
  boundary_attendance: "境界立会い",
  client_meeting: "打ち合わせ",
  document_signing: "書類署名",
  delivery: "成果物お渡し",
  internal: "内部予定",
  other: "その他",
};

const APPOINTMENT_STATUS = {
  tentative: "候補",
  scheduled: "予定",
  confirmed: "確定",
  arrived: "到着済み",
  completed: "完了",
  cancelled: "中止",
  no_show: "未実施",
};

const TASK_STATUS = {
  open: "未着手",
  in_progress: "対応中",
  waiting_client: "お客様待ち",
  waiting_external: "外部回答待ち",
  completed: "完了",
  cancelled: "取消",
};

const CONTACT_STATUS = {
  not_contacted: "未連絡",
  researching: "調査中",
  contacted: "連絡済み",
  waiting_reply: "回答待ち",
  schedule_adjusting: "日程調整中",
  confirmed: "確認済み",
  unable: "連絡困難",
  completed: "完了",
};

const ATTENDANCE_STATUS = {
  not_scheduled: "未調整",
  candidate_sent: "候補送付",
  scheduled: "日程確定",
  attended: "立会い済み",
  proxy_attended: "代理立会い",
  absent: "欠席",
  reschedule: "再調整",
  not_required: "不要",
};

const CONFIRM_STATUS = {
  pending: "未確認",
  explaining: "説明中",
  agreed: "合意",
  signed: "署名済み",
  refused: "拒否",
  disputed: "争いあり",
  not_required: "不要",
};

const PHOTO_TYPES = {
  site_overview: "現場全景",
  boundary_marker: "境界標・境界杭",
  road: "接道・道路",
  building_exterior: "建物外観",
  survey_work: "測量作業",
  attendance: "境界立会い",
  document: "現地資料",
  other: "その他",
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  setModeText();
  bindEvents();
  state.date = jstDate();
  $("workDate").value = state.date;

  const saved = sessionStorage.getItem(`chosashiFieldAdminCode:${mode}`) || "";
  state.adminCode = state.demo ? "1234" : saved;
  $("adminCodeInput").value = state.adminCode;
  if (state.demo) $("demoBadge").hidden = false;
  if (state.adminCode) login();
}

function setModeText() {
  const isIpad = mode === "ipad";
  const title = isIpad ? "現場共有iPad" : "現場スタッフ";
  $("modeTitle").textContent = title;
  $("loginModeTitle").textContent = `${title}画面`;
  $("modeChip").textContent = isIpad ? "共有端末・全スタッフ対応" : "個人スマホ・担当予定";
  $("modeLead").textContent = isIpad
    ? "当日の現場をスタッフ横断で確認し、到着・開始・完了・報告を操作できます。"
    : "自分の当日予定、現場報告、写真、タスクを大きなボタンで操作できます。";
}

function bindEvents() {
  $("loginButton").addEventListener("click", login);
  $("adminCodeInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });
  $("clearCodeButton").addEventListener("click", clearAdminCode);
  $("deleteCodeButton").addEventListener("click", clearAdminCode);
  $("reloadButton").addEventListener("click", loadToday);
  $("workDate").addEventListener("change", () => {
    state.date = $("workDate").value;
    state.demoDateAdjusted = true;
    loadToday();
  });
  $("staffSelect").addEventListener("change", () => {
    state.staffId = $("staffSelect").value;
    loadToday();
  });

  $("drawerBackdrop").addEventListener("click", closeDrawer);
  $("closeDrawer").addEventListener("click", closeDrawer);
  $("arriveButton").addEventListener("click", () => progressAction("arrive"));
  $("startButton").addEventListener("click", () => progressAction("start"));
  $("reportButton").addEventListener("click", openReportModal);
  $("completeButton").addEventListener("click", completeWithReport);

  $("closeReportModal").addEventListener("click", closeReportModal);
  $("cancelReportButton").addEventListener("click", closeReportModal);
  $("getLocationButton").addEventListener("click", captureLocation);
  $("photoInput").addEventListener("change", renderSelectedFiles);
  $("saveReportButton").addEventListener("click", saveReportAndPhotos);

  $("closeTaskModal").addEventListener("click", () => $("taskModal").hidden = true);
  $("taskSaveButton").addEventListener("click", saveTaskStatus);
}

async function login() {
  state.adminCode = $("adminCodeInput").value.trim();
  if (!state.adminCode) {
    $("loginError").textContent = "管理コードを入力してください。";
    return;
  }

  showLoading("現場画面を確認しています");
  try {
    const [officeData, staffData] = await Promise.all([
      publicApi("/api/public/config"),
      api("/api/admin/staff"),
    ]);
    state.office = officeData.office;
    state.staff = staffData.staff || [];
    sessionStorage.setItem(`chosashiFieldAdminCode:${mode}`, state.adminCode);
    $("loginScreen").hidden = true;
    $("loginError").textContent = "";
    $("officeName").textContent = state.office.office_name;
    $("footerOffice").textContent = state.office.office_name;
    $("connectionChip").textContent = `${state.office.office_name}／接続済み`;
    populateStaffSelect();
    await loadToday();
  } catch (error) {
    $("loginError").textContent = error.message || "管理コードを確認できませんでした。";
    toast($("loginError").textContent, true);
  } finally {
    hideLoading();
  }
}

function populateStaffSelect() {
  const select = $("staffSelect");
  select.replaceChildren();

  if (mode === "ipad") {
    const all = document.createElement("option");
    all.value = "";
    all.textContent = "全スタッフ";
    select.appendChild(all);
  }

  state.staff.forEach((staff) => {
    const option = document.createElement("option");
    option.value = staff.id;
    option.textContent = `${staff.name}（${roleLabel(staff.role)}）`;
    select.appendChild(option);
  });

  if (mode === "staff") {
    const defaultStaff =
      state.staff.find((staff) => staff.role === "surveyor") ||
      state.staff.find((staff) => staff.role !== "viewer") ||
      state.staff[0];
    state.staffId = defaultStaff?.id || "";
    select.value = state.staffId;
  } else {
    state.staffId = "";
    select.value = "";
  }
}

async function loadToday() {
  if (!state.adminCode) return;
  state.date = $("workDate").value || jstDate();

  showLoading("当日の予定を読み込んでいます");
  try {
    state.today = await api("/api/staff/today", {
      query: {
        date: state.date,
        staff_id: state.staffId || undefined,
      },
    });

    if (
      state.demo &&
      !state.demoDateAdjusted &&
      (state.today.appointments || []).length === 0 &&
      (state.today.upcoming_appointments || []).length > 0
    ) {
      const firstDate = dateOnlyJst(state.today.upcoming_appointments[0].start_at);
      if (firstDate && firstDate !== state.date) {
        state.demoDateAdjusted = true;
        state.date = firstDate;
        $("workDate").value = firstDate;
        await loadToday();
        return;
      }
    }

    renderToday();
  } catch (error) {
    toast(error.message || "当日の予定を取得できませんでした。", true);
  } finally {
    hideLoading();
  }
}

function renderToday() {
  const data = state.today || {};
  const appointments = data.appointments || [];
  const upcoming = data.upcoming_appointments || [];
  const tasks = data.tasks || [];
  const reports = data.open_reports || [];

  $("metricToday").textContent = appointments.length;
  $("metricUpcoming").textContent = upcoming.length;
  $("metricTasks").textContent = tasks.length;
  $("metricReports").textContent = reports.length;
  $("selectedDateLabel").textContent = formatDate(state.date);

  renderAppointments($("appointmentList"), appointments, true);
  renderAppointments($("upcomingList"), upcoming.slice(0, 8), false);
  renderTasks(tasks);
}

function renderAppointments(container, items, isToday) {
  container.replaceChildren();
  container.classList.toggle("single", items.length === 1);
  if (!items.length) {
    container.innerHTML = `<div class="empty">${
      isToday ? "この日の現場予定はありません。" : "今後14日間の予定はありません。"
    }</div>`;
    return;
  }

  items.forEach((appointment) => {
    const card = document.createElement("article");
    card.className = `appointment-card ${
      ["arrived"].includes(appointment.status) ? "current" : ""
    }`;

    const report = appointment.field_report;
    const staffText = appointment.staff?.name || "担当未設定";
    const address =
      appointment.property?.address ||
      appointment.location ||
      "場所未設定";
    const client = appointment.client?.name || "";
    const reportText = report
      ? `報告：${fieldReportStatusLabel(report.status)}`
      : "報告：未作成";

    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="time">${escapeHtml(formatTime(appointment.start_at))}–${escapeHtml(
            formatTime(appointment.end_at)
          )}</div>
          <div class="type">${escapeHtml(
            APPOINTMENT_TYPES[appointment.appointment_type] || appointment.appointment_type
          )}</div>
          <div class="title">${escapeHtml(appointment.title)}</div>
          <div class="meta">${escapeHtml(
            [appointment.case?.case_no, client, staffText].filter(Boolean).join("／")
          )}</div>
          <div class="meta">${escapeHtml(address)}</div>
          <div class="meta">${escapeHtml(reportText)}</div>
        </div>
        <span class="status ${appointmentStatusClass(appointment.status)}">${escapeHtml(
          APPOINTMENT_STATUS[appointment.status] || appointment.status
        )}</span>
      </div>
      <div class="card-actions">
        <button class="btn btn-secondary btn-small open-detail" type="button">現場詳細</button>
        ${
          isToday
            ? '<button class="btn btn-primary btn-small quick-report" type="button">報告・写真</button>'
            : ""
        }
      </div>
    `;

    card.querySelector(".open-detail").addEventListener("click", (event) => {
      event.stopPropagation();
      openAppointment(appointment);
    });
    card.querySelector(".quick-report")?.addEventListener("click", (event) => {
      event.stopPropagation();
      openAppointment(appointment).then(openReportModal);
    });
    card.addEventListener("click", () => openAppointment(appointment));
    container.appendChild(card);
  });
}

function renderTasks(items) {
  const container = $("taskList");
  container.replaceChildren();

  if (!items.length) {
    container.innerHTML = '<div class="empty">未完了タスクはありません。</div>';
    return;
  }

  items.slice(0, 20).forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card";
    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-sub">${escapeHtml(
            [
              task.case?.case_no,
              task.due_at ? `期限 ${formatDateTime(task.due_at)}` : "期限未設定",
              task.assigned_staff?.name || "担当未設定",
            ]
              .filter(Boolean)
              .join("／")
          )}</div>
        </div>
        <span class="status ${priorityClass(task.priority)}">${escapeHtml(
          priorityLabel(task.priority)
        )}</span>
      </div>
      <div class="card-actions">
        ${
          task.case_id
            ? '<button class="btn btn-secondary btn-small task-case" type="button">案件を見る</button>'
            : ""
        }
        <button class="btn btn-primary btn-small task-status" type="button">状態更新</button>
      </div>
    `;
    card.querySelector(".task-case")?.addEventListener("click", () => {
      const appointment = findAppointmentForCase(task.case_id);
      if (appointment) openAppointment(appointment);
      else openCaseOnly(task.case_id);
    });
    card.querySelector(".task-status").addEventListener("click", () => openTaskModal(task));
    container.appendChild(card);
  });
}

function findAppointmentForCase(caseId) {
  return [...(state.today?.appointments || []), ...(state.today?.upcoming_appointments || [])].find(
    (appointment) => appointment.case_id === caseId
  );
}

async function openCaseOnly(caseId) {
  showLoading("案件情報を読み込んでいます");
  try {
    state.currentAppointment = null;
    state.currentContext = await api("/api/staff/case-context", {
      query: { case_id: caseId },
    });
    state.currentReportId = null;
    renderDrawer();
    $("drawerBackdrop").hidden = false;
    $("fieldDrawer").hidden = false;
  } catch (error) {
    toast(error.message || "案件情報を取得できませんでした。", true);
  } finally {
    hideLoading();
  }
}

async function openAppointment(appointment) {
  showLoading("現場情報を読み込んでいます");
  try {
    state.currentAppointment = appointment;
    state.currentReportId = appointment.field_report?.id || null;
    state.currentContext = await api("/api/staff/case-context", {
      query: { case_id: appointment.case_id },
    });
    renderDrawer();
    $("drawerBackdrop").hidden = false;
    $("fieldDrawer").hidden = false;
  } catch (error) {
    toast(error.message || "現場情報を取得できませんでした。", true);
  } finally {
    hideLoading();
  }
}

function renderDrawer() {
  const context = state.currentContext;
  const appointment = state.currentAppointment;
  const caseRecord = context.case || {};
  const client = context.client || {};
  const property = context.property || {};

  $("drawerTitle").textContent = appointment?.title || caseRecord.title || "案件詳細";
  $("drawerMeta").textContent = [caseRecord.case_no, client.name, property.address]
    .filter(Boolean)
    .join("／");

  $("summaryGrid").innerHTML = [
    summaryBox("依頼者", `${client.name || "―"} ${client.phone || ""}`),
    summaryBox(
      "対象物件",
      `${property.address || "―"} ${property.lot_number ? `地番 ${property.lot_number}` : ""}`
    ),
    summaryBox("担当", appointment?.staff?.name || context.assigned_staff?.name || "未設定"),
    summaryBox(
      "予定",
      appointment
        ? `${formatDateTime(appointment.start_at)}～${formatTime(appointment.end_at)}`
        : "案件のみ表示"
    ),
  ].join("");

  renderActionButtons();
  renderNeighbors(context.boundary_neighbors || []);
  renderContextTasks(context.tasks || []);
  renderPhotos(context.photos || []);
  renderReports(context.field_reports || []);
}

function renderActionButtons() {
  const appointment = state.currentAppointment;
  const disabled = !appointment;
  ["arriveButton", "startButton", "reportButton", "completeButton"].forEach((id) => {
    $(id).disabled = disabled;
  });

  if (!appointment) return;

  $("arriveButton").disabled = ["arrived", "completed"].includes(appointment.status);
  $("startButton").disabled = appointment.status === "completed";
  $("completeButton").disabled = appointment.status === "completed";
  $("reportButton").disabled = false;
}

function renderNeighbors(items) {
  const container = $("neighborList");
  container.replaceChildren();
  if (!items.length) {
    container.innerHTML = '<div class="empty">隣接地所有者の登録はありません。</div>';
    return;
  }

  items.forEach((neighbor) => {
    const card = document.createElement("div");
    card.className = "neighbor";
    card.innerHTML = `
      <strong>${escapeHtml(neighbor.owner_name)}／${escapeHtml(
        neighbor.related_lot_number || "地番未設定"
      )}</strong>
      <span>${escapeHtml(neighbor.phone || "電話未設定")}</span>
      <span>連絡：${escapeHtml(CONTACT_STATUS[neighbor.contact_status] || neighbor.contact_status)}</span>
      <span>立会い：${escapeHtml(
        ATTENDANCE_STATUS[neighbor.attendance_status] || neighbor.attendance_status
      )}</span>
      <span>境界確認：${escapeHtml(
        CONFIRM_STATUS[neighbor.confirmation_status] || neighbor.confirmation_status
      )}</span>
    `;
    container.appendChild(card);
  });
}

function renderContextTasks(items) {
  const container = $("caseTaskList");
  container.replaceChildren();
  if (!items.length) {
    container.innerHTML = '<div class="empty">この案件の未完了タスクはありません。</div>';
    return;
  }

  items.forEach((task) => {
    const card = document.createElement("div");
    card.className = "compact-card";
    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-sub">${escapeHtml(
            task.due_at ? `期限 ${formatDateTime(task.due_at)}` : "期限未設定"
          )}</div>
        </div>
        <span class="status gray">${escapeHtml(TASK_STATUS[task.status] || task.status)}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderPhotos(items) {
  const container = $("photoList");
  container.replaceChildren();
  if (!items.length) {
    container.innerHTML = '<div class="empty">現場写真はまだありません。</div>';
    return;
  }

  items.slice(0, 30).forEach((photo) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "photo";
    card.innerHTML = `
      <strong>${escapeHtml(PHOTO_TYPES[photo.photo_type] || photo.photo_type)}</strong>
      <span>${escapeHtml(photo.caption || photo.original_filename || "写真")}</span>
      <span>${escapeHtml(formatDateTime(photo.taken_at || photo.created_at))}</span>
      <span>${photo.is_client_visible ? "お客様にも表示" : "内部写真"}</span>
    `;
    card.addEventListener("click", () => openPhoto(photo.id));
    container.appendChild(card);
  });
}

function renderReports(items) {
  const container = $("reportHistory");
  container.replaceChildren();
  if (!items.length) {
    container.innerHTML = '<div class="empty">現場報告履歴はありません。</div>';
    return;
  }

  items.slice(0, 15).forEach((report) => {
    const card = document.createElement("div");
    card.className = "compact-card";
    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="task-title">${escapeHtml(report.summary || "現場報告")}</div>
          <div class="task-sub">${escapeHtml(
            [
              report.weather,
              report.started_at ? `開始 ${formatDateTime(report.started_at)}` : "",
              report.completed_at ? `終了 ${formatDateTime(report.completed_at)}` : "",
            ]
              .filter(Boolean)
              .join("／")
          )}</div>
        </div>
        <span class="status ${fieldReportStatusClass(report.status)}">${escapeHtml(
          fieldReportStatusLabel(report.status)
        )}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

async function progressAction(action) {
  const appointment = state.currentAppointment;
  if (!appointment) return;

  const staffId = effectiveStaffId(appointment);
  if (!staffId) {
    toast("担当スタッフを選択してください。", true);
    return;
  }

  showLoading(
    action === "arrive"
      ? "到着を記録しています"
      : action === "start"
        ? "作業開始を記録しています"
        : "作業完了を記録しています"
  );

  try {
    const data = await api(`/api/staff/appointments/${appointment.id}/progress`, {
      method: "POST",
      body: {
        action,
        staff_id: staffId,
      },
    });

    state.currentAppointment.status = data.appointment.status;
    state.currentAppointment.field_report = data.field_report;
    state.currentReportId = data.field_report?.id || state.currentReportId;
    toast(
      action === "arrive"
        ? "到着を記録しました。"
        : action === "start"
          ? "作業開始を記録しました。"
          : "作業完了を記録しました。"
    );
    await refreshCurrent();
  } catch (error) {
    toast(error.message || "現場状態を更新できませんでした。", true);
  } finally {
    hideLoading();
  }
}

async function refreshCurrent() {
  const caseId = state.currentContext?.case?.id;
  const appointmentId = state.currentAppointment?.id;
  await loadToday();

  if (caseId) {
    state.currentContext = await api("/api/staff/case-context", {
      query: { case_id: caseId },
    });
  }

  if (appointmentId) {
    state.currentAppointment = [
      ...(state.today?.appointments || []),
      ...(state.today?.upcoming_appointments || []),
    ].find((appointment) => appointment.id === appointmentId) || state.currentAppointment;
    state.currentReportId = state.currentAppointment?.field_report?.id || state.currentReportId;
  }

  if (!$("fieldDrawer").hidden) renderDrawer();
}

function closeDrawer() {
  $("drawerBackdrop").hidden = true;
  $("fieldDrawer").hidden = true;
  state.currentAppointment = null;
  state.currentContext = null;
  state.currentReportId = null;
}

function openReportModal() {
  if (!state.currentContext?.case) return;

  const appointment = state.currentAppointment;
  const report =
    appointment?.field_report ||
    (state.currentContext.field_reports || []).find(
      (item) => item.appointment_id === appointment?.id && item.staff_id === effectiveStaffId(appointment)
    ) ||
    null;

  state.currentReportId = report?.id || null;
  $("reportModalTitle").textContent = `${state.currentContext.case.case_no} 現場報告`;
  $("reportType").value =
    report?.report_type || reportTypeFromAppointment(appointment?.appointment_type);
  $("weather").value = report?.weather || "";
  $("attendees").value = report?.attendees || "";
  $("summary").value = report?.summary || "";
  $("findings").value = report?.findings || "";
  $("nextAction").value = report?.next_action || "";
  $("clientVisibleSummary").value = report?.client_visible_summary || "";
  $("clientVisiblePhoto").checked = false;
  $("completeAppointment").checked = appointment?.status === "completed";
  $("photoType").value = "site_overview";
  $("photoCaption").value = "";
  $("photoInput").value = "";
  $("selectedFileList").replaceChildren();
  $("reportProgress").hidden = true;
  $("reportProgressFill").style.width = "0%";
  $("reportError").textContent = "";
  state.currentLocation = report?.latitude && report?.longitude
    ? { latitude: Number(report.latitude), longitude: Number(report.longitude) }
    : null;
  updateLocationText();

  $("reportModal").hidden = false;
}

function closeReportModal() {
  $("reportModal").hidden = true;
}

async function completeWithReport() {
  $("completeAppointment").checked = true;
  openReportModal();
  $("completeAppointment").checked = true;
}

function renderSelectedFiles() {
  const container = $("selectedFileList");
  container.replaceChildren();
  const files = Array.from($("photoInput").files || []);

  files.forEach((file) => {
    const row = document.createElement("div");
    row.className = "file-item";
    row.innerHTML = `<span>${escapeHtml(file.name)}</span><span>${formatBytes(file.size)}</span>`;
    container.appendChild(row);
  });
}

async function captureLocation() {
  if (!navigator.geolocation) {
    toast("この端末では位置情報を取得できません。", true);
    return;
  }

  $("getLocationButton").disabled = true;
  $("locationText").textContent = "位置情報を取得しています…";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      updateLocationText();
      $("getLocationButton").disabled = false;
      toast("位置情報を取得しました。");
    },
    () => {
      state.currentLocation = null;
      updateLocationText();
      $("getLocationButton").disabled = false;
      toast("位置情報を取得できませんでした。端末の許可設定をご確認ください。", true);
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
}

function updateLocationText() {
  $("locationText").textContent = state.currentLocation
    ? `取得済み：${state.currentLocation.latitude.toFixed(6)}, ${state.currentLocation.longitude.toFixed(6)}`
    : "位置情報は未取得です。必要な現場のみ取得してください。";
}

async function saveReportAndPhotos() {
  const caseRecord = state.currentContext?.case;
  const appointment = state.currentAppointment;
  const staffId = effectiveStaffId(appointment);

  if (!caseRecord || !staffId) {
    $("reportError").textContent = "案件または担当スタッフを確認できません。";
    return;
  }

  const summary = $("summary").value.trim();
  if (!summary) {
    $("reportError").textContent = "現場概要を入力してください。";
    return;
  }

  const files = Array.from($("photoInput").files || []);
  try {
    files.forEach(validatePhoto);
  } catch (error) {
    $("reportError").textContent = error.message;
    return;
  }

  $("reportError").textContent = "";
  $("saveReportButton").disabled = true;
  $("reportProgress").hidden = false;
  $("reportProgressFill").style.width = "5%";
  showLoading("現場報告を保存しています");

  try {
    let report;

    const reportBody = {
      case_id: caseRecord.id,
      appointment_id: appointment?.id || null,
      staff_id: staffId,
      report_type: $("reportType").value,
      weather: $("weather").value.trim(),
      attendees: $("attendees").value.trim(),
      summary,
      findings: $("findings").value.trim(),
      next_action: $("nextAction").value.trim(),
      client_visible_summary: $("clientVisibleSummary").value.trim(),
      latitude: state.currentLocation?.latitude ?? null,
      longitude: state.currentLocation?.longitude ?? null,
      status: "submitted",
      completed_at: $("completeAppointment").checked ? new Date().toISOString() : undefined,
    };

    if (state.currentReportId) {
      const data = await api(`/api/staff/field-reports/${state.currentReportId}`, {
        method: "PATCH",
        body: reportBody,
      });
      report = data.field_report;
    } else {
      const data = await api("/api/staff/field-reports", {
        method: "POST",
        body: reportBody,
      });
      report = data.field_report;
      state.currentReportId = report.id;
    }

    $("reportProgressFill").style.width = "20%";

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const baseStart = 20 + Math.round((index / Math.max(files.length, 1)) * 65);
      const baseEnd = 20 + Math.round(((index + 1) / Math.max(files.length, 1)) * 65);

      const prepared = await api("/api/staff/photo-upload-prepare", {
        method: "POST",
        body: {
          case_id: caseRecord.id,
          field_report_id: report.id,
          staff_id: staffId,
          filename: file.name,
          mime_type: file.type,
          file_size: file.size,
        },
      });

      await uploadSigned(prepared.upload.signed_url, file, (ratio) => {
        const percent = baseStart + Math.round((baseEnd - baseStart) * ratio);
        $("reportProgressFill").style.width = `${percent}%`;
      });

      await api("/api/staff/photo-upload-complete", {
        method: "POST",
        body: {
          case_id: caseRecord.id,
          field_report_id: report.id,
          staff_id: staffId,
          storage_path: prepared.upload.path,
          filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          photo_type: $("photoType").value,
          caption: $("photoCaption").value.trim(),
          taken_at: new Date().toISOString(),
          latitude: state.currentLocation?.latitude ?? null,
          longitude: state.currentLocation?.longitude ?? null,
          is_client_visible: $("clientVisiblePhoto").checked,
        },
      });
    }

    $("reportProgressFill").style.width = "88%";

    if ($("completeAppointment").checked && appointment?.id && appointment.status !== "completed") {
      await api(`/api/staff/appointments/${appointment.id}/progress`, {
        method: "POST",
        body: {
          action: "complete",
          staff_id: staffId,
        },
      });
    }

    $("reportProgressFill").style.width = "100%";
    toast("現場報告と写真を保存しました。");
    closeReportModal();
    await refreshCurrent();
  } catch (error) {
    $("reportError").textContent =
      error.message || "現場報告または写真を保存できませんでした。";
    toast($("reportError").textContent, true);
  } finally {
    hideLoading();
    $("saveReportButton").disabled = false;
  }
}

async function openPhoto(photoId) {
  try {
    const data = await api(`/api/staff/photos/${photoId}/url`);
    window.open(data.signed_url, "_blank", "noopener,noreferrer");
  } catch (error) {
    toast(error.message || "写真を開けませんでした。", true);
  }
}

function openTaskModal(task) {
  $("taskModalTitle").textContent = task.title;
  $("taskModalTaskId").value = task.id;
  $("taskStatusSelect").innerHTML = Object.entries(TASK_STATUS)
    .map(
      ([value, label]) =>
        `<option value="${escapeHtml(value)}"${
          value === task.status ? " selected" : ""
        }>${escapeHtml(label)}</option>`
    )
    .join("");
  $("taskModal").hidden = false;
}

async function saveTaskStatus() {
  const taskId = $("taskModalTaskId").value;
  if (!taskId) return;

  showLoading("タスク状態を更新しています");
  try {
    await api(`/api/admin/tasks/${taskId}`, {
      method: "PATCH",
      body: { status: $("taskStatusSelect").value },
    });
    $("taskModal").hidden = true;
    toast("タスク状態を更新しました。");
    await refreshCurrent();
  } catch (error) {
    toast(error.message || "タスクを更新できませんでした。", true);
  } finally {
    hideLoading();
  }
}

function effectiveStaffId(appointment) {
  return state.staffId || appointment?.staff_id || appointment?.staff?.id || "";
}

function validatePhoto(file) {
  const allowed = CONFIG.allowedFieldPhotoTypes || ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("JPEG、PNG、WebP形式の写真を選択してください。");
  }
  if (file.size <= 0) throw new Error("空のファイルは保存できません。");
  if (file.size > Number(CONFIG.maxUploadBytes || 15728640)) {
    throw new Error("写真は1枚15MB以内にしてください。");
  }
}

function uploadSigned(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("写真本体を保存できませんでした。"));
    xhr.onerror = () => reject(new Error("写真送信中に通信エラーが発生しました。"));
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", file);
    xhr.send(form);
  });
}

function clearAdminCode() {
  state.adminCode = "";
  sessionStorage.removeItem(`chosashiFieldAdminCode:${mode}`);
  $("adminCodeInput").value = "";
  $("loginScreen").hidden = false;
  closeDrawer();
  closeReportModal();
  toast("管理コードを削除しました。");
}

async function publicApi(path) {
  const url = new URL(`${CONFIG.apiBase}${path}`);
  url.searchParams.set("office_code", CONFIG.officeCode);
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "事務所情報を取得できませんでした。");
  }
  return data;
}

async function api(path, options = {}) {
  const url = new URL(`${CONFIG.apiBase}${path}`);
  url.searchParams.set("office_code", CONFIG.officeCode);
  Object.entries(options.query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": state.adminCode,
    },
    body: options.body
      ? JSON.stringify({ office_code: CONFIG.officeCode, ...options.body })
      : undefined,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem(`chosashiFieldAdminCode:${mode}`);
      $("loginScreen").hidden = false;
    }
    throw new Error(data?.error || "処理に失敗しました。");
  }
  return data;
}

function roleLabel(role) {
  return {
    owner: "調査士・代表",
    surveyor: "測量担当",
    assistant: "補助者",
    office: "事務",
    viewer: "閲覧",
  }[role] || role;
}

function appointmentStatusClass(status) {
  if (status === "completed") return "green";
  if (status === "arrived") return "teal";
  if (status === "tentative") return "yellow";
  if (["cancelled", "no_show"].includes(status)) return "red";
  return "blue";
}

function priorityClass(priority) {
  if (priority === "urgent") return "red";
  if (priority === "high") return "yellow";
  return "gray";
}

function priorityLabel(priority) {
  return { urgent: "緊急", high: "高", normal: "通常", low: "低" }[priority] || priority;
}

function fieldReportStatusLabel(status) {
  return {
    draft: "作成中",
    submitted: "提出済み",
    reviewed: "確認済み",
    approved: "承認済み",
  }[status] || status;
}

function fieldReportStatusClass(status) {
  if (status === "approved") return "green";
  if (status === "reviewed") return "blue";
  if (status === "submitted") return "teal";
  return "yellow";
}

function reportTypeFromAppointment(type) {
  return {
    site_survey: "site_survey",
    boundary_attendance: "attendance",
    delivery: "delivery",
  }[type] || "other";
}

function summaryBox(label, value) {
  return `<div class="summary-box"><span>${escapeHtml(label)}</span><strong>${escapeHtml(
    value
  )}</strong></div>`;
}

function formatDate(value) {
  if (!value) return "―";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+09:00`)
    : new Date(value);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "―";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value) {
  if (!value) return "―";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dateOnlyJst(value) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  return `${map.year}-${map.month}-${map.day}`;
}

function jstDate(date = new Date()) {
  return dateOnlyJst(date.toISOString());
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showLoading(text) {
  $("loadingText").textContent = text;
  $("loading").hidden = false;
}

function hideLoading() {
  $("loading").hidden = true;
}

let toastTimer;
function toast(message, isError = false) {
  clearTimeout(toastTimer);
  const element = $("toast");
  element.textContent = message;
  element.classList.toggle("error", isError);
  element.classList.add("show");
  toastTimer = setTimeout(() => element.classList.remove("show"), 3500);
}
