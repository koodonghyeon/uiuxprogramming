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

// change: 선택 용량에 따라 문구, 카드 스타일, 버튼 상태가 함께 바뀝니다.
const plans = {
  "10": { label: "10GB", description: "문서와 과제 파일을 가볍게 모아두기에 알맞아요." },
  "100": { label: "100GB", description: "사진과 일상 기록을 여유 있게 정리하고 싶은 분께 추천해요." },
  "1000": { label: "1TB", description: "동영상과 대용량 프로젝트 자료를 보관하고 싶은 분께 추천해요." },
};
const capacitySelect = document.querySelector("#capacity");
const capacitySummary = document.querySelector("#capacity-summary");
const capacityTitle = document.querySelector("#capacity-title");
const capacityMessage = document.querySelector("#capacity-message");
const capacityButton = document.querySelector("#capacity-button");

capacitySelect.addEventListener("change", () => {
  const plan = plans[capacitySelect.value];
  capacitySummary.classList.toggle("is-selected", Boolean(plan));
  capacitySummary.classList.remove("is-confirmed");
  capacityTitle.textContent = plan ? `${plan.label} 보관소` : "아직 선택한 용량이 없어요";
  capacityMessage.textContent = plan ? plan.description : "용량을 선택하면 추천 용도와 선택 버튼이 바뀝니다.";
  capacityButton.disabled = !plan;
  capacityButton.textContent = plan ? `${plan.label} 선택 완료하기` : "용량을 먼저 선택해 주세요";
});

capacityButton.addEventListener("click", () => {
  const plan = plans[capacitySelect.value];
  if (!plan) return;
  capacitySummary.classList.add("is-confirmed");
  capacityTitle.textContent = `${plan.label} 선택 완료`;
  capacityMessage.textContent = "관심 용량을 선택했어요. 다른 용량으로 바꾸어 다시 체험할 수 있습니다.";
  capacityButton.textContent = "선택 완료";
  capacityButton.disabled = true;
});

const subscribeForm = document.querySelector("#subscribe form");
const emailInput = document.querySelector("#email");
const submitButton = subscribeForm.querySelector('button[type="submit"]');
const formMessage = document.querySelector("#form-message");

const setFormState = (type, message) => {
  formMessage.textContent = message;
  formMessage.classList.toggle("is-error", type === "error");
  formMessage.classList.toggle("is-success", type === "success");
  emailInput.classList.toggle("is-error", type === "error");
  emailInput.classList.toggle("is-success", type === "success");
  emailInput.setAttribute("aria-invalid", String(type === "error"));
};

// input: 입력 중에도 즉시 안내, 입력란 색상, 신청 가능 여부를 갱신합니다.
const updateEmailState = () => {
  const empty = emailInput.value.trim() === "";
  const valid = !empty && emailInput.validity.valid;
  submitButton.disabled = !valid;
  submitButton.textContent = valid ? "소식 신청 체험하기" : "이메일을 확인해 주세요";
  if (empty) {
    submitButton.textContent = "이메일을 입력해 주세요";
    setFormState("default", "출시 소식을 받을 이메일을 입력해 주세요.");
  } else if (!valid) {
    setFormState("error", "올바른 이메일 형식으로 입력해 주세요. 예: name@example.com");
  } else {
    setFormState("success", "사용 가능한 이메일 형식입니다. 소식 신청을 체험해 보세요.");
  }
};
emailInput.addEventListener("input", updateEmailState);

subscribeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!emailInput.value.trim() || !emailInput.validity.valid) {
    updateEmailState();
    emailInput.focus();
    return;
  }
  setFormState("success", "소식 신청 체험이 완료되었습니다. 실제 이메일은 저장하거나 발송하지 않습니다.");
  submitButton.disabled = true;
  submitButton.textContent = "체험 완료";
});
updateEmailState();
