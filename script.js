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

const resetButton = () => {
  submitButton.disabled = false;
  submitButton.textContent = "소식 신청하기";
};

emailInput.addEventListener("input", () => {
  resetButton();

  if (emailInput.value.trim() === "") {
    setFormState("default", "이메일을 입력해 주세요.");
    return;
  }

  if (!emailInput.validity.valid) {
    setFormState("error", "올바른 이메일 형식으로 입력해 주세요.");
    return;
  }

  setFormState("success", "신청 가능한 이메일입니다.");
});

subscribeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (emailInput.value.trim() === "") {
    setFormState("error", "이메일을 입력한 후 신청해 주세요.");
    emailInput.focus();
    return;
  }

  if (!emailInput.validity.valid) {
    setFormState("error", "이메일 형식을 다시 확인해 주세요.");
    emailInput.focus();
    return;
  }

  setFormState("success", "소식 신청이 완료되었습니다.");
  submitButton.disabled = true;
  submitButton.textContent = "신청 완료";
});
