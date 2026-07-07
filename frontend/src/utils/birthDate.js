const MIN_BIRTH_YEAR = 1900;
export const MIN_SIGNUP_AGE_YEARS = 18;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getToday() {
  return startOfDay(new Date());
}

export function getLatestAllowedBirthDate(today = getToday()) {
  return new Date(
    today.getFullYear() - MIN_SIGNUP_AGE_YEARS,
    today.getMonth(),
    today.getDate(),
  );
}

export function getMinBirthDate() {
  return new Date(MIN_BIRTH_YEAR, 0, 1);
}

function compareDateOnly(a, b) {
  return a.getTime() - b.getTime();
}

export function toBirthDate(month, day, year) {
  const m = Number(month);
  const d = Number(day);
  const y = Number(year);
  if (!Number.isFinite(m) || !Number.isFinite(d) || !Number.isFinite(y)) {
    return null;
  }
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return startOfDay(date);
}

export function buildBirthYearOptions(today = getToday()) {
  const currentYear = today.getFullYear();
  return Array.from({ length: currentYear - MIN_BIRTH_YEAR + 1 }, (_, index) =>
    String(currentYear - index),
  );
}

export function buildBirthMonthOptions() {
  return Array.from({ length: 12 }, (_, index) => String(index + 1));
}

export function buildBirthDayOptions(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m)) {
    return Array.from({ length: 31 }, (_, index) => String(index + 1));
  }
  const daysInMonth = new Date(y, m, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => String(index + 1));
}

export function validateBirthDateParts(month, day, year, today = getToday()) {
  if (!month || !day || !year) {
    return { valid: false, message: "Vui lòng chọn ngày sinh" };
  }

  const birthDate = toBirthDate(month, day, year);
  if (!birthDate) {
    return { valid: false, message: "Ngày sinh không hợp lệ" };
  }

  const maxDate = today;
  const latestAllowed = getLatestAllowedBirthDate(today);
  const minDate = getMinBirthDate();

  if (compareDateOnly(birthDate, maxDate) > 0) {
    return { valid: false, message: "Ngày sinh không thể sau ngày hiện tại" };
  }
  if (compareDateOnly(birthDate, latestAllowed) > 0) {
    return {
      valid: false,
      message: `Bạn phải đủ ${MIN_SIGNUP_AGE_YEARS} tuổi để sử dụng Vibely`,
    };
  }
  if (compareDateOnly(birthDate, minDate) < 0) {
    return { valid: false, message: "Ngày sinh không hợp lệ" };
  }

  return { valid: true, message: "" };
}
