// 클릭한 탭만 선택하고, 연결된 콘텐츠만 표시합니다.
const tabs = [...document.querySelectorAll('[role="tab"]')];
const activateTab = (selectedTab) => {
  tabs.forEach((tab) => {
    const selected = tab === selectedTab;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !selected;
  });
};

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateTab(tab));
  // 키보드 사용자도 방향키와 Home/End로 탭을 이동할 수 있습니다.
  tab.addEventListener("keydown", (event) => {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    activateTab(tabs[nextIndex]);
    tabs[nextIndex].focus();
  });
});

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
const panels = [...document.querySelectorAll(".flow-panel")];
const progressItems = [...document.querySelectorAll(".flow-progress li")];
const stageNames = ["시작", "정보 입력", "확인", "완료"];
let currentStep = 0;
let touched = { capacity: false, email: false };

const getValues = () => ({ capacity: capacitySelect.value, email: emailInput.value.trim() });
const isValid = () => Boolean(plans[capacitySelect.value]) && Boolean(emailInput.value.trim()) && emailInput.validity.valid;

const showStep = (step, moveFocus = true) => {
  currentStep = step;
  panels.forEach((panel, index) => { panel.hidden = index !== step; });
  progressItems.forEach((item, index) => {
    if (index === step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
    item.classList.toggle("is-complete", index < step || step === 3);
  });
  document.querySelector("#flow-status").textContent = `${step + 1} / 4단계 · ${stageNames[step]}`;
  document.querySelector(".flow-reset").hidden = step === 3 || (step === 0 && !touched.capacity && !touched.email);
  if (moveFocus) panels[step].querySelector("h3").focus();
};

const setFieldState = (field, message, type, text) => {
  field.setAttribute("aria-invalid", String(type === "error"));
  for (const element of [field, message]) {
    element.classList.toggle("is-error", type === "error");
    element.classList.toggle("is-success", type === "success");
  }
  message.textContent = text;
};

const validate = (showAllErrors = false) => {
  if (showAllErrors) touched = { capacity: true, email: true };
  const { capacity, email } = getValues();
  const plan = plans[capacity];
  const validEmail = Boolean(email) && emailInput.validity.valid;
  setFieldState(capacitySelect, capacityMessage,
    plan ? "success" : touched.capacity ? "error" : "default",
    plan ? `${plan.label} 선택 · ${plan.description}` : touched.capacity ? "저장 용량을 선택해 주세요. 10GB, 100GB, 1TB 중 하나를 고르면 됩니다." : "보관할 파일에 맞는 용량을 선택해 주세요.");
  setFieldState(emailInput, emailMessage,
    validEmail ? "success" : touched.email ? "error" : "default",
    validEmail ? "사용 가능한 이메일 형식입니다." : touched.email ? (email ? "이메일 형식을 확인해 주세요. 예: name@example.com" : "소식을 받을 이메일을 입력해 주세요. 예: name@example.com") : "소식을 받을 이메일을 입력해 주세요.");
  const valid = Boolean(plan) && validEmail;
  const hasError = (!plan && touched.capacity) || (!validEmail && touched.email);
  formMessage.textContent = valid ? "입력이 완료되었습니다. 다음 단계에서 내용을 확인해 주세요." : hasError ? "표시된 항목을 수정하면 다음 단계로 이동할 수 있습니다." : "용량과 이메일을 입력해 주세요.";
  formMessage.classList.toggle("is-error", hasError);
  formMessage.classList.toggle("is-success", valid);
  reviewButton.classList.toggle("is-ready", valid);
  // 버튼을 눌러 오류 안내를 받을 수 있게 두되, submit에서 이동을 차단합니다.
  reviewButton.textContent = valid ? "입력 내용 확인하기" : "필수 항목 확인하기";
  return valid;
};

document.querySelector("#start-button").addEventListener("click", () => {
  if (currentStep === 0) showStep(1);
});
capacitySelect.addEventListener("change", () => {
  touched.capacity = true;
  validate();
});
emailInput.addEventListener("input", () => {
  touched.email = true;
  validate();
});
document.querySelector("#input-back").addEventListener("click", () => {
  if (currentStep === 1) showStep(0);
});
document.querySelector("#review-back").addEventListener("click", () => {
  if (currentStep === 2) showStep(1);
});

subscribeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (currentStep !== 1) return;
  if (!validate(true)) {
    (plans[capacitySelect.value] ? emailInput : capacitySelect).focus();
    return;
  }
  const values = getValues();
  // textContent로 사용자 입력을 문자열로만 표시합니다.
  document.querySelector("#review-capacity").textContent = plans[values.capacity].label;
  document.querySelector("#review-email").textContent = values.email;
  showStep(2);
});

confirmButton.addEventListener("click", () => {
  if (currentStep !== 2) return;
  if (!isValid()) {
    showStep(1);
    validate(true);
    (plans[capacitySelect.value] ? emailInput : capacitySelect).focus();
    return;
  }
  const values = getValues();
  document.querySelector("#complete-capacity").textContent = plans[values.capacity].label;
  document.querySelector("#complete-email").textContent = values.email;
  document.querySelector("#complete-message").textContent = `${values.email} 주소로 소식 신청이 완료되었습니다.`;
  confirmButton.disabled = true;
  confirmButton.textContent = "신청 완료";
  showStep(3);
});

const restartFlow = () => {
  subscribeForm.reset();
  resetVault();
  document.querySelector("#vault").hidden = true;
  document.querySelector("#open-vault").setAttribute("aria-expanded", "false");
  touched = { capacity: false, email: false };
  for (const id of ["review-capacity", "review-email", "complete-capacity", "complete-email", "complete-message"]) {
    document.getElementById(id).textContent = "";
  }
  confirmButton.disabled = false;
  confirmButton.textContent = "소식 신청하기";
  validate();
  showStep(0);
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
};
let storedFiles = [];
let pendingFiles = [];
let nextFileId = 1;
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
  document.querySelector("#remaining-text").textContent = `남은 용량 ${formatBytes(Math.max(0, limit - used))} · ${percentText} 사용`;
  document.querySelector(".usage-card").classList.toggle("is-near-full", limit > 0 && used >= limit * 0.9);
  document.querySelector("#file-count").textContent = `${storedFiles.length}개`;
  document.querySelector("#vault-empty").hidden = storedFiles.length > 0;

  storedList.replaceChildren();
  storedFiles.forEach((file) => {
    const item = document.createElement("li");
    const info = document.createElement("div");
    const name = document.createElement("strong");
    const size = document.createElement("span");
    const remove = document.createElement("button");
    name.textContent = file.name;
    size.textContent = `${formatBytes(file.size)}${file.sample ? " · 예시 파일" : ""}`;
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
  fileInput.value = "";
  resetConfirmation.hidden = true;
  setVaultFeedback("default", "파일을 선택하거나 예시 파일로 시작해 보세요.");
  renderVault();
};

document.querySelector("#open-vault").addEventListener("click", () => {
  if (currentStep !== 3) return;
  vault.hidden = false;
  document.querySelector("#open-vault").setAttribute("aria-expanded", "true");
  renderVault();
  document.querySelector("#vault-title").focus();
});
document.querySelector("#vault-back").addEventListener("click", () => {
  vault.hidden = true;
  resetConfirmation.hidden = true;
  const openButton = document.querySelector("#open-vault");
  openButton.setAttribute("aria-expanded", "false");
  openButton.focus();
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
  if (currentStep !== 3 || vault.hidden) return;
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
  setVaultFeedback("success", `${count}개 파일을 보관함에 추가했습니다. 목록과 남은 용량을 확인하세요.`);
});

storedList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-file-id]");
  if (!button) return;
  const index = storedFiles.findIndex((file) => file.id === Number(button.dataset.fileId));
  if (index < 0) return;
  const [removed] = storedFiles.splice(index, 1);
  resetConfirmation.hidden = true;
  renderVault();
  setVaultFeedback("success", `‘${removed.name}’ 항목을 삭제했습니다. ${formatBytes(removed.size)}의 공간이 확보되었습니다.`);
  const remainingButtons = storedList.querySelectorAll("button");
  (remainingButtons[Math.min(index, remainingButtons.length - 1)] || fileInput).focus();
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
