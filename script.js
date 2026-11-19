// 같은 초기화 함수를 여러 묶음에 적용해도 각 묶음의 상태만 변경합니다.
const initializedTabs = new WeakSet();
function initTabs(root) {
  if (initializedTabs.has(root)) return;
  const tablist = root.querySelector(':scope > [role="tablist"]');
  if (!tablist) return;
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = [...root.querySelectorAll(':scope > [role="tabpanel"]')];
  const status = root.querySelector(':scope > [data-tab-status]');
  const panelFor = (tab) => panels.find((panel) => panel.id === tab.getAttribute("aria-controls"));
  if (!tabs.length || tabs.some((tab) => !panelFor(tab))) return;
  initializedTabs.add(root);

  const activate = (selectedTab) => {
    tabs.forEach((tab) => {
      const selected = tab === selectedTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panelFor(tab).hidden = !selected;
    });
    if (status) status.textContent = `선택한 안내: ${selectedTab.textContent.trim()}`;
  };
  tablist.addEventListener("click", (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tabs.includes(tab)) activate(tab);
  });
  tablist.addEventListener("keydown", (event) => {
    const index = tabs.indexOf(event.target.closest('[role="tab"]'));
    if (index < 0) return;
    const nextIndex = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    activate(tabs[nextIndex]);
    tabs[nextIndex].focus();
  });
  activate(tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0]);
}

const initializedAccordions = new WeakSet();
function initAccordion(root) {
  if (initializedAccordions.has(root)) return;
  const buttons = [...root.querySelectorAll("[data-accordion-trigger]")].filter((button) => button.closest("[data-accordion]") === root);
  const panels = [...root.querySelectorAll(".accordion-panel")].filter((panel) => panel.closest("[data-accordion]") === root);
  const panelFor = (button) => panels.find((panel) => panel.id === button.getAttribute("aria-controls"));
  if (!buttons.length || buttons.some((button) => !panelFor(button))) return;
  initializedAccordions.add(root);

  const setExpanded = (button, expanded) => {
    const panel = panelFor(button);
    if (!expanded && panel.contains(document.activeElement)) button.focus();
    button.setAttribute("aria-expanded", String(expanded));
    button.querySelector("[data-accordion-state]").textContent = expanded ? "접기" : "펼치기";
    panel.hidden = !expanded;
  };
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-accordion-trigger]");
    if (buttons.includes(button)) setExpanded(button, button.getAttribute("aria-expanded") !== "true");
  });
  // Enter·Space는 기본 버튼 동작, 위·아래 방향키와 Home·End는 질문 간 이동입니다.
  root.addEventListener("keydown", (event) => {
    const index = buttons.indexOf(event.target.closest("[data-accordion-trigger]"));
    if (index < 0) return;
    const nextIndex = { ArrowDown: (index + 1) % buttons.length, ArrowUp: (index - 1 + buttons.length) % buttons.length, Home: 0, End: buttons.length - 1 }[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    buttons[nextIndex].focus();
  });
  buttons.forEach((button) => setExpanded(button, button.getAttribute("aria-expanded") === "true"));
}
document.querySelectorAll("[data-tabs]").forEach(initTabs);
document.querySelectorAll("[data-accordion]").forEach(initAccordion);

// 소식 신청은 시작 → 입력 → 확인 → 완료의 네 상태로 진행합니다.
const plans = {
  "10": { label: "10GB", description: "문서와 과제 파일을 가볍게 모아두기에 알맞아요." },
  "100": { label: "100GB", description: "사진과 일상 기록을 여유 있게 정리하고 싶은 분께 추천해요." },
  "1000": { label: "1TB", description: "동영상과 대용량 프로젝트 자료를 보관하고 싶은 분께 추천해요." },
};
const subscribeForm = document.querySelector("#subscribe-form");
const capacitySelect = document.querySelector("#capacity");
const emailInput = document.querySelector("#email");
const capacityMessage = document.querySelector("#capacity-message");
const emailMessage = document.querySelector("#email-message");
const formMessage = document.querySelector("#form-message");
const reviewButton = document.querySelector("#review-button");
const confirmButton = document.querySelector("#confirm-button");
const requestToggle = document.querySelector("#include-request");
const requestInput = document.querySelector("#storage-request");
const requestMessage = document.querySelector("#request-message");
const submissionMessage = document.querySelector("#submission-message");
const SUBSCRIPTION_STORAGE_KEY = "data-vault.latest-subscription";
let isSubmitting = false;
const panels = [...document.querySelectorAll(".flow-panel")];
const progressItems = [...document.querySelectorAll(".flow-progress li")];
const stageNames = ["시작", "정보 입력", "확인", "완료"];
let currentStep = 0;
let touched = { capacity: false, email: false, request: false };

const getValues = () => ({ capacity: capacitySelect.value, email: emailInput.value.trim(), request: requestToggle.checked ? requestInput.value.trim() : "" });
const requestLength = () => Array.from(requestInput.value.trim()).length;
const isRequestValid = () => !requestToggle.checked || (requestLength() >= 10 && requestLength() <= 200);
const focusFirstError = () => {
  const field = !plans[capacitySelect.value] ? capacitySelect : (!emailInput.value.trim() || !emailInput.validity.valid) ? emailInput : requestInput;
  field.focus();
};
const syncRequestField = () => {
  const enabled = requestToggle.checked;
  document.querySelector("#request-fields").hidden = !enabled;
  requestInput.disabled = !enabled;
  requestInput.required = enabled;
  requestToggle.setAttribute("aria-expanded", String(enabled));
};

const showStep = (step, moveFocus = true) => {
  currentStep = step;
  panels.forEach((panel, index) => { panel.hidden = index !== step; });
  progressItems.forEach((item, index) => {
    if (index === step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
    item.classList.toggle("is-complete", index < step || step === 3);
  });
  document.querySelector("#flow-status").textContent = `${step + 1} / 4단계 · ${stageNames[step]}`;
  document.querySelector(".flow-reset").hidden = step === 3 || (step === 0 && !touched.capacity && !touched.email && !touched.request && !requestToggle.checked);
  if (moveFocus) panels[step].querySelector("h3").focus();
};

const setFieldState = (field, message, type, text) => {
  field.setAttribute("aria-invalid", String(type === "error"));
  for (const element of [field, message]) {
    element.classList.toggle("is-error", type === "error");
    element.classList.toggle("is-success", type === "success");
  }
  message.textContent = type === "error" ? `입력 오류: ${text}` : text;
};

const validate = (showAllErrors = false) => {
  if (showAllErrors) touched = { capacity: true, email: true, request: requestToggle.checked };
  const { capacity, email } = getValues();
  const plan = plans[capacity];
  const validEmail = Boolean(email) && emailInput.validity.valid;
  setFieldState(capacitySelect, capacityMessage,
    plan ? "success" : touched.capacity ? "error" : "default",
    plan ? `${plan.label} 선택 · ${plan.description}` : touched.capacity ? "저장 용량을 선택해 주세요. 10GB, 100GB, 1TB 중 하나를 고르면 됩니다." : "보관할 파일에 맞는 용량을 선택해 주세요.");
  setFieldState(emailInput, emailMessage,
    validEmail ? "success" : touched.email ? "error" : "default",
    validEmail ? "사용 가능한 이메일 형식입니다." : touched.email ? (email ? "이메일 형식을 확인해 주세요. 예: name@example.com" : "소식을 받을 이메일을 입력해 주세요. 예: name@example.com") : "소식을 받을 이메일을 입력해 주세요.");
  const length = requestLength();
  const validRequest = isRequestValid();
  document.querySelector("#request-count").textContent = `${length} / 200자 · 최소 10자`;
  const requestError = requestToggle.checked && !validRequest && (touched.request || length > 0);
  setFieldState(requestInput, requestMessage,
    requestError ? "error" : requestToggle.checked && validRequest ? "success" : "default",
    requestError ? (length > 200 ? `200자 이내로 줄여주세요. 현재 ${length}자입니다.` : `10자 이상 적어주세요. ${10 - length}자 더 입력하면 됩니다.`) : requestToggle.checked && validRequest ? "입력 조건을 충족했습니다." : "요청 내용을 10자 이상 입력해 주세요.");
  const valid = Boolean(plan) && validEmail && validRequest;
  const hasError = (!plan && touched.capacity) || (!validEmail && touched.email) || requestError;
  formMessage.textContent = valid ? "입력이 완료되었습니다. 다음 단계에서 내용을 확인해 주세요." : hasError ? "표시된 항목을 수정하면 다음 단계로 이동할 수 있습니다." : "용량과 이메일을 입력해 주세요.";
  formMessage.classList.toggle("is-error", hasError);
  formMessage.classList.toggle("is-success", valid);
  reviewButton.classList.toggle("is-ready", valid);
  // 버튼을 눌러 오류 안내를 받을 수 있게 두되, submit에서 이동을 차단합니다.
  reviewButton.textContent = valid ? "입력 내용 확인하기" : "필수 항목 확인하기";
  return valid;
};

document.querySelector("#start-button").addEventListener("click", () => {
  if (currentStep === 0 && !isSubmitting) showStep(1);
});
capacitySelect.addEventListener("change", () => {
  touched.capacity = true;
  validate();
});
emailInput.addEventListener("input", () => {
  touched.email = true;
  validate();
});
requestToggle.addEventListener("change", () => {
  touched.request = false;
  syncRequestField();
  validate();
});
requestInput.addEventListener("input", () => {
  touched.request = true;
  validate();
});
document.querySelector("#input-back").addEventListener("click", () => {
  if (currentStep === 1 && !isSubmitting) showStep(0);
});
document.querySelector("#review-back").addEventListener("click", () => {
  if (currentStep === 2 && !isSubmitting) showStep(1);
});

subscribeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting || (currentStep !== 1 && currentStep !== 2)) return;
  if (!validate(true)) {
    showStep(1, false);
    focusFirstError();
    return;
  }
  const values = getValues();
  if (currentStep === 2) {
    await submitSubscription(values);
    return;
  }
  // textContent로 사용자 입력을 문자열로만 표시합니다.
  document.querySelector("#review-capacity").textContent = plans[values.capacity].label;
  document.querySelector("#review-email").textContent = values.email;
  document.querySelector("#review-request").textContent = values.request;
  document.querySelector("#review-request-row").hidden = !requestToggle.checked;
  submissionMessage.textContent = "내용이 맞으면 ‘소식 신청하기’를 눌러주세요.";
  submissionMessage.classList.remove("is-error");
  confirmButton.textContent = "소식 신청하기";
  showStep(2);
});

const setSubmitting = (busy) => {
  isSubmitting = busy;
  subscribeForm.setAttribute("aria-busy", String(busy));
  document.querySelector("#flow-review").setAttribute("aria-busy", String(busy));
  for (const button of [confirmButton, document.querySelector("#review-back"), document.querySelector("#reset-progress")]) button.disabled = busy;
};

const saveSubscription = async (values) => {
  // 진행 상태를 보여준 뒤 최근 신청 한 건을 저장합니다. 저장이 차단되면 예외가 발생합니다.
  await new Promise((resolve) => setTimeout(resolve, 700));
  localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify({ ...values, savedAt: new Date().toISOString() }));
};

const submitSubscription = async (values) => {
  setSubmitting(true);
  confirmButton.textContent = "신청 저장 중…";
  submissionMessage.textContent = "신청 내용을 저장하고 있습니다. 잠시만 기다려주세요.";
  submissionMessage.classList.remove("is-error");
  try {
    await saveSubscription(values);
    document.querySelector("#complete-capacity").textContent = plans[values.capacity].label;
    document.querySelector("#complete-email").textContent = values.email;
    document.querySelector("#complete-request").textContent = values.request;
    document.querySelector("#complete-request-row").hidden = !values.request;
    document.querySelector("#complete-message").textContent = `${values.email} 주소로 소식 신청이 완료되었습니다.`;
    confirmButton.textContent = "신청 완료";
    showStep(3);
    if (!vault.hidden) prepareVault();
  } catch {
    submissionMessage.textContent = "신청 내용을 저장하지 못했습니다. 입력한 내용은 유지됩니다. 브라우저의 사이트 저장 권한을 확인한 뒤 다시 시도해 주세요.";
    submissionMessage.classList.add("is-error");
    confirmButton.textContent = "다시 신청하기";
  } finally {
    setSubmitting(false);
    confirmButton.disabled = currentStep === 3;
  }
};

const restartFlow = () => {
  if (isSubmitting) return;
  subscribeForm.reset();
  syncRequestField();
  setSubmitting(false);
  submissionMessage.textContent = "내용이 맞으면 ‘소식 신청하기’를 눌러주세요.";
  submissionMessage.classList.remove("is-error");
  document.querySelector("#review-request-row").hidden = true;
  document.querySelector("#complete-request-row").hidden = true;
  resetVault();
  document.querySelector("#vault").hidden = true;
  document.querySelector("#open-vault").setAttribute("aria-expanded", "false");
  touched = { capacity: false, email: false, request: false };
  for (const id of ["review-capacity", "review-email", "review-request", "complete-capacity", "complete-email", "complete-request", "complete-message"]) {
    document.getElementById(id).textContent = "";
  }
  confirmButton.disabled = false;
  confirmButton.textContent = "소식 신청하기";
  validate();
  showStep(0);
  navigateToSection("subscribe", "replace", false);
};
document.querySelector("#restart-button").addEventListener("click", restartFlow);
document.querySelector("#reset-progress").addEventListener("click", restartFlow);
validate();
showStep(0, false);

// 중간고사 새 기능: 실제 파일 내용은 읽지 않고 이름·크기 정보로 보관함을 체험합니다.
const vault = document.querySelector("#vault");
const fileInput = document.querySelector("#vault-files");
const storedList = document.querySelector("#stored-files");
const pendingList = document.querySelector("#pending-list");
const vaultFeedback = document.querySelector("#vault-feedback");
const resetConfirmation = document.querySelector("#vault-reset-confirm");
const exampleFiles = {
  video: { name: "예시 동영상.mp4", size: 6_000_000_000, lastModified: 0, sample: true },
  photos: { name: "예시 사진 모음.zip", size: 5_000_000_000, lastModified: 0, sample: true },
  document: { name: "예시 과제.pdf", size: 1_000_000, lastModified: 0, sample: true },
  image: { name: "예시 여행 사진.jpg", size: 2_000_000, lastModified: 0, sample: true },
};
let storedFiles = [];
let pendingFiles = [];
let nextFileId = 1;
let activeFilter = "all";
const filterLabels = { all: "전체", document: "문서", image: "사진", video: "동영상", other: "기타" };
const fileCategory = (file) => {
  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
  if (["pdf", "txt", "md", "doc", "docx", "hwp", "hwpx", "xls", "xlsx", "ppt", "pptx", "csv"].includes(extension)) return "document";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "heic", "bmp"].includes(extension)) return "image";
  if (["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(extension)) return "video";
  return "other";
};
const usedBytes = () => storedFiles.reduce((total, file) => total + file.size, 0);
// 단위는 십진수로 통일: 1GB = 1,000,000,000 B, 1TB = 1,000GB.
const limitBytes = () => Number(capacitySelect.value) * 1_000_000_000;
const fileKey = (file) => JSON.stringify([file.name, file.size, file.lastModified, Boolean(file.sample)]);
const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1000)), units.length - 1);
  return `${Number((bytes / 1000 ** unit).toFixed(2)).toLocaleString("ko-KR")} ${units[unit]}`;
};
const setVaultFeedback = (type, message) => {
  vaultFeedback.textContent = message;
  vaultFeedback.classList.toggle("is-error", type === "error");
  vaultFeedback.classList.toggle("is-success", type === "success");
  fileInput.setAttribute("aria-invalid", String(type === "error"));
};

const renderVault = () => {
  const used = usedBytes();
  const limit = limitBytes();
  const plan = plans[capacitySelect.value];
  document.querySelector("#vault-owner").textContent = `${emailInput.value.trim()}님의 파일 보관함`;
  document.querySelector("#vault-plan").textContent = plan ? `${plan.label} 보관함` : "용량 미선택";
  document.querySelector("#usage-text").textContent = `사용량 ${formatBytes(used)} / ${formatBytes(limit)}`;
  const meter = document.querySelector("#usage-meter");
  meter.max = limit || 1;
  meter.value = used;
  const percentage = limit ? used / limit * 100 : 0;
  const percentText = percentage > 0 && percentage < 0.01 ? "0.01% 미만" : `${Number(percentage.toFixed(2))}%`;
  const spaceNotice = limit > 0 && used >= limit ? " · 저장 공간이 가득 찼습니다. 파일을 삭제하면 공간을 확보할 수 있습니다." : limit > 0 && used >= limit * 0.9 ? " · 저장 공간이 거의 찼습니다. 필요 없는 파일을 정리해 주세요." : "";
  document.querySelector("#remaining-text").textContent = `남은 용량 ${formatBytes(Math.max(0, limit - used))} · ${percentText} 사용${spaceNotice}`;
  document.querySelector(".usage-card").classList.toggle("is-near-full", limit > 0 && used >= limit * 0.9);
  document.querySelector("#file-count").textContent = `${storedFiles.length}개`;
  document.querySelector("#vault-empty").hidden = storedFiles.length > 0;
  const visibleFiles = storedFiles.filter((file) => activeFilter === "all" || fileCategory(file) === activeFilter);
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.filter === activeFilter));
  });
  document.querySelector("#filter-results").textContent = `전체 ${storedFiles.length}개 중 ${visibleFiles.length}개 표시 · ${filterLabels[activeFilter]}`;
  document.querySelector("#filter-empty").hidden = storedFiles.length === 0 || visibleFiles.length > 0;
  document.querySelector("#filter-empty-message").textContent = `‘${filterLabels[activeFilter]}’에 해당하는 파일이 없습니다`;

  storedList.replaceChildren();
  visibleFiles.forEach((file) => {
    const item = document.createElement("li");
    const info = document.createElement("div");
    const name = document.createElement("strong");
    const size = document.createElement("span");
    const remove = document.createElement("button");
    name.textContent = file.name;
    size.textContent = `${filterLabels[fileCategory(file)]} · ${formatBytes(file.size)}${file.sample ? " · 예시 파일" : ""}`;
    info.append(name, size);
    remove.type = "button";
    remove.className = "vault-secondary";
    remove.dataset.fileId = String(file.id);
    remove.textContent = "삭제";
    remove.setAttribute("aria-label", `${file.name} 삭제`);
    item.append(info, remove);
    storedList.append(item);
  });

  const selectedBytes = pendingFiles.reduce((total, file) => total + file.size, 0);
  document.querySelector("#pending-summary").textContent = pendingFiles.length ? `${pendingFiles.length}개 선택 · 합계 ${formatBytes(selectedBytes)}` : "선택한 파일이 없습니다.";
  pendingList.replaceChildren();
  pendingFiles.forEach((file) => {
    const item = document.createElement("li");
    item.textContent = `${file.name} · ${formatBytes(file.size)}${file.sample ? " · 예시 파일" : ""}`;
    pendingList.append(item);
  });
  document.querySelector("#cancel-files").disabled = pendingFiles.length === 0;
  document.querySelector("#reset-vault").disabled = storedFiles.length === 0 && pendingFiles.length === 0;
  document.querySelector("#add-files").textContent = pendingFiles.length ? `${pendingFiles.length}개 파일 보관함에 추가` : "보관함에 추가";
};

const resetVault = () => {
  storedFiles = [];
  pendingFiles = [];
  nextFileId = 1;
  activeFilter = "all";
  fileInput.value = "";
  resetConfirmation.hidden = true;
  setVaultFeedback("default", "파일을 선택하거나 예시 파일로 시작해 보세요.");
  renderVault();
};

document.querySelector("#open-vault").addEventListener("click", () => {
  if (currentStep !== 3) return;
  navigateToSection("vault");
});
document.querySelector("#vault-back").addEventListener("click", () => {
  vault.hidden = true;
  resetConfirmation.hidden = true;
  const openButton = document.querySelector("#open-vault");
  openButton.setAttribute("aria-expanded", "false");
  navigateToSection("subscribe");
});

fileInput.addEventListener("change", () => {
  // File 객체나 원본 내용 대신 표시와 용량 계산에 필요한 정보만 유지합니다.
  pendingFiles = Array.from(fileInput.files, (file) => ({ name: file.name, size: file.size, lastModified: file.lastModified, sample: false }));
  resetConfirmation.hidden = true;
  setVaultFeedback("default", pendingFiles.length ? "선택한 파일을 확인한 뒤 ‘보관함에 추가’를 누르세요. 새로 선택하면 대기 목록이 바뀝니다." : "파일 선택을 취소했습니다. 다시 파일을 선택할 수 있습니다.");
  renderVault();
});
fileInput.addEventListener("cancel", () => {
  setVaultFeedback("default", pendingFiles.length ? "파일 선택창을 닫았습니다. 기존 선택은 유지됩니다." : "선택한 파일이 없습니다. 파일을 선택하거나 예시 파일로 시작해 보세요.");
});
document.querySelectorAll("[data-sample]").forEach((button) => {
  button.addEventListener("click", () => {
    pendingFiles = [{ ...exampleFiles[button.dataset.sample] }];
    fileInput.value = "";
    resetConfirmation.hidden = true;
    setVaultFeedback("default", "예시 파일을 선택했습니다. ‘보관함에 추가’를 눌러 용량 변화를 확인하세요.");
    renderVault();
  });
});
document.querySelector("#cancel-files").addEventListener("click", () => {
  pendingFiles = [];
  fileInput.value = "";
  resetConfirmation.hidden = true;
  renderVault();
  setVaultFeedback("default", "파일 선택을 취소했습니다. 보관한 파일은 그대로 유지됩니다.");
  fileInput.focus();
});

document.querySelector("#vault-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (currentStep !== 3 || vault.hidden || document.querySelector("#vault-content").hidden) return;
  resetConfirmation.hidden = true;
  let error = "";
  const keys = new Set(storedFiles.map(fileKey));
  const bytes = pendingFiles.reduce((total, file) => total + file.size, 0);
  if (!pendingFiles.length) error = "추가할 파일을 먼저 선택해 주세요. 예시 파일로도 체험할 수 있습니다.";
  else if (pendingFiles.some((file) => file.size === 0)) error = "내용이 없는 0 B 파일이 포함되어 있습니다. 내용이 있는 파일만 다시 선택해 주세요.";
  else {
    for (const file of pendingFiles) {
      if (keys.has(fileKey(file))) {
        error = `‘${file.name}’ 파일이 중복되었습니다. 다른 파일을 선택하거나 기존 항목을 삭제한 뒤 다시 추가해 주세요.`;
        break;
      }
      keys.add(fileKey(file));
    }
    if (!error && usedBytes() + bytes > limitBytes()) {
      error = `용량이 부족합니다. 선택한 파일은 ${formatBytes(bytes)}, 남은 공간은 ${formatBytes(limitBytes() - usedBytes())}입니다. 보관한 파일을 삭제하거나 더 작은 파일을 선택해 주세요.`;
    }
  }
  if (error) {
    setVaultFeedback("error", `${error} 보관함 목록은 변경되지 않았습니다.`);
    fileInput.focus();
    return;
  }
  const count = pendingFiles.length;
  storedFiles.push(...pendingFiles.map((file) => ({ ...file, id: nextFileId++ })));
  pendingFiles = [];
  fileInput.value = "";
  renderVault();
  setVaultFeedback("success", `${count}개 파일을 보관함에 추가했습니다. 목록과 남은 용량을 확인하세요.${activeFilter !== "all" ? " 현재 필터와 다른 종류는 ‘전체’에서 볼 수 있습니다." : ""}`);
});

storedList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-file-id]");
  if (!button) return;
  const visibleIndex = [...storedList.querySelectorAll("button")].indexOf(button);
  const index = storedFiles.findIndex((file) => file.id === Number(button.dataset.fileId));
  if (index < 0) return;
  const [removed] = storedFiles.splice(index, 1);
  resetConfirmation.hidden = true;
  renderVault();
  setVaultFeedback("success", `‘${removed.name}’ 항목을 삭제했습니다. ${formatBytes(removed.size)}의 공간이 확보되었습니다.`);
  const remainingButtons = storedList.querySelectorAll("button");
  (remainingButtons[Math.min(visibleIndex, remainingButtons.length - 1)] || (storedFiles.length ? document.querySelector("#show-all-files") : fileInput)).focus();
});
document.querySelector("#reset-vault").addEventListener("click", () => {
  resetConfirmation.hidden = false;
  document.querySelector("#cancel-vault-reset").focus();
});
document.querySelector("#cancel-vault-reset").addEventListener("click", () => {
  resetConfirmation.hidden = true;
  setVaultFeedback("default", "초기화를 취소했습니다. 보관한 파일과 선택 중인 파일이 유지됩니다.");
  document.querySelector("#reset-vault").focus();
});
document.querySelector("#confirm-vault-reset").addEventListener("click", () => {
  resetVault();
  setVaultFeedback("success", "보관함 체험을 초기화했습니다. 파일을 다시 선택해 시작하세요.");
  fileInput.focus();
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    renderVault();
  });
});
document.querySelector("#show-all-files").addEventListener("click", () => {
  activeFilter = "all";
  renderVault();
  document.querySelector('[data-filter="all"]').focus();
});

// 메뉴 이동과 화면 위치를 URL 해시로 연결합니다.
const menuToggle = document.querySelector("#menu-toggle");
const mainMenu = document.querySelector("#main-menu");
const navLinks = [...mainMenu.querySelectorAll("a")];
const navSections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
const compactMenu = window.matchMedia("(max-width: 768px)");
const navigationBar = document.querySelector(".site-navigation");
let menuOpen = false;
let navigating = false;
let navigationFrame = 0;
let scrollFrame = 0;

function updateMenu(open = false) {
  const previousFocus = document.activeElement;
  menuOpen = compactMenu.matches && open;
  mainMenu.hidden = compactMenu.matches && !menuOpen;
  menuToggle.hidden = !compactMenu.matches;
  menuToggle.textContent = menuOpen ? "메뉴 닫기" : "메뉴 열기";
  menuToggle.setAttribute("aria-expanded", String(!compactMenu.matches || menuOpen));
  document.documentElement.style.setProperty("--navigation-offset", `${navigationBar.offsetHeight + 18}px`);
  if (mainMenu.hidden && mainMenu.contains(previousFocus)) menuToggle.focus();
  else if (menuToggle.hidden && previousFocus === menuToggle) mainMenu.querySelector('[aria-current="location"]').focus();
}

function markCurrentMenu(id) {
  navLinks.forEach((link) => {
    if (link.hash === `#${id}`) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  const activeLink = navLinks.find((link) => link.hash === `#${id}`);
  document.querySelector("#current-location").textContent = `현재 위치: ${activeLink.textContent}`;
}

function prepareVault() {
  const unlocked = currentStep === 3;
  vault.hidden = false;
  document.querySelector("#vault-locked").hidden = unlocked;
  document.querySelector("#vault-content").hidden = !unlocked;
  document.querySelector("#vault-back").textContent = unlocked ? "신청 완료로 돌아가기" : "소식 신청으로 이동";
  document.querySelector("#open-vault").setAttribute("aria-expanded", String(unlocked));
  if (unlocked) renderVault();
}

function navigateToSection(id, historyMode = "push", moveFocus = true) {
  if (!navSections.some((section) => section.id === id)) id = "about";
  if (id === "vault") prepareVault();
  const section = document.getElementById(id);
  updateMenu(false);
  markCurrentMenu(id);
  if (location.hash !== `#${id}` && historyMode !== "none") {
    history[historyMode === "replace" ? "replaceState" : "pushState"](null, "", `#${id}`);
  }
  navigating = true;
  cancelAnimationFrame(navigationFrame);
  navigationFrame = requestAnimationFrame(() => {
    const top = window.scrollY + section.getBoundingClientRect().top - navigationBar.offsetHeight - 18;
    window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    if (moveFocus) {
      const heading = section.querySelector("h2");
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    navigationFrame = requestAnimationFrame(() => { navigating = false; });
  });
}

// 일반 앵커도 같은 이동 규칙을 사용합니다. Ctrl/Command 클릭은 브라우저 동작을 유지합니다.
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const id = link.getAttribute("href").slice(1);
  if (!navSections.some((section) => section.id === id)) return;
  event.preventDefault();
  navigateToSection(id);
});
menuToggle.addEventListener("click", () => updateMenu(!menuOpen));
navigationBar.addEventListener("focusout", (event) => {
  if (menuOpen && event.relatedTarget && !navigationBar.contains(event.relatedTarget)) updateMenu(false);
});
// 역방향 Tab 이동이나 오류 항목으로 이동할 때도 고정 메뉴 아래에 초점을 보여줍니다.
document.querySelector("main").addEventListener("focusin", (event) => {
  requestAnimationFrame(() => {
    const target = event.target;
    if (document.activeElement !== target) return;
    const rect = target.getBoundingClientRect();
    const menuBottom = navigationBar.getBoundingClientRect().bottom;
    if (rect.top < menuBottom + 12) window.scrollBy({ top: rect.top - menuBottom - 12, behavior: "instant" });
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuOpen) {
    updateMenu(false);
    menuToggle.focus();
  }
});
compactMenu.addEventListener("change", () => updateMenu(false));
new ResizeObserver(() => {
  document.documentElement.style.setProperty("--navigation-offset", `${navigationBar.offsetHeight + 18}px`);
}).observe(navigationBar);

function restoreLocation() {
  const id = location.hash.slice(1);
  if (!id) {
    // 첫 방문에는 서비스 이름이 있는 페이지 맨 위부터 보여줍니다.
    updateMenu(false);
    markCurrentMenu("about");
    window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  navigateToSection(id, "replace", false);
}
window.addEventListener("popstate", restoreLocation);
window.addEventListener("hashchange", restoreLocation);
window.addEventListener("pageshow", restoreLocation);
// 사용자가 직접 스크롤한 위치도 현재 메뉴와 새로고침 후 목적지에 반영합니다.
window.addEventListener("scroll", () => {
  if (scrollFrame || navigating || menuOpen) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    if (navigating || menuOpen) return;
    const visible = navSections.filter((section) => !section.hidden);
    const marker = navigationBar.offsetHeight + 40;
    let current = visible[0];
    visible.forEach((section) => {
      if (section.getBoundingClientRect().top <= marker) current = section;
    });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3) current = visible[visible.length - 1];
    markCurrentMenu(current.id);
    if (location.hash !== `#${current.id}`) history.replaceState(null, "", `#${current.id}`);
  });
}, { passive: true });
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
updateMenu(false);
restoreLocation();
