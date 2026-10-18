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
