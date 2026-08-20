import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IoAdd,
  IoChevronDown,
  IoClose,
  IoLockClosedOutline,
  IoPencil,
  IoTrash,
} from "react-icons/io5";
import { adminApi } from "@/features/admin/api";
import { userApi } from "@/features/user/api";
import { AdminLayout } from "@/features/admin/components/AdminLayout.jsx";
import { AdminUsersPageSkeleton } from "@/features/admin/components/AdminListSkeletons.jsx";
import { AdminPagination } from "@/features/admin/components/AdminPagination.jsx";
import { BirthDateFields } from "@/features/auth/components/BirthDateSelect.jsx";
import { validateBirthDateParts } from "@/features/auth/utils/birthDate.js";
import { useAuth } from "@/features/auth/hooks/useAuth.js";
import {
  DEFAULT_AVATAR_URL,
  sanitizeAvatarUrl,
} from "@/features/profile/utils/avatarUrl.js";

const PAGE_SIZE = 20;
const DEFAULT_AVATAR = DEFAULT_AVATAR_URL;
const BIRTH_MONTH_OPTIONS = [
  t('admin.users.months.m1'),
  t('admin.users.months.m2'),
  t('admin.users.months.m3'),
  t('admin.users.months.m4'),
  t('admin.users.months.m5'),
  t('admin.users.months.m6'),
  t('admin.users.months.m7'),
  t('admin.users.months.m8'),
  t('admin.users.months.m9'),
  t('admin.users.months.m10'),
  t('admin.users.months.m11'),
  t('admin.users.months.m12'),
];
const EMPTY_FORM = {
  email: "",
  username: "",
  displayName: "",
  role: "USER",
  password: "",
};

function normalizeVibelyId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
}

function roleLabel(role) {
  return String(role ?? "").toUpperCase() === "ADMIN"
    ? t("admin.users.roleAdmin")
    : t("admin.users.roleUser");
}

function resolveAdminAvatarUrl(avatarUrl, userId) {
  return sanitizeAvatarUrl(avatarUrl, DEFAULT_AVATAR, userId);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RoleBadge({ role }) {
  const admin = String(role ?? "").toUpperCase() === "ADMIN";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        admin
          ? "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30"
          : "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30"
      }`}
    >
      {roleLabel(role)}
    </span>
  );
}

function OnboardingBadge({ completed }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        completed
          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
          : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
      }`}
    >
      {completed ? t('admin.users.onboardingDone') : t('admin.users.onboardingPending')}
    </span>
  );
}

function AccountStatusBadge({ accountStatus }) {
  const { t } = useTranslation();
  const status = String(accountStatus ?? "ACTIVE").toUpperCase();
  if (status === "BANNED") {
    return (
      <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-500/30">
        {t("admin.users.statusBanned")}
      </span>
    );
  }
  if (status === "DEACTIVATED") {
    return (
      <span className="inline-flex rounded-full bg-zinc-500/15 px-2.5 py-1 text-xs font-semibold text-zinc-300 ring-1 ring-zinc-500/30">
        {t("admin.users.statusDeactivated")}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
      {t("admin.users.statusActive")}
    </span>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </label>
  );
}

function RoleDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  buttonClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const selected =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center justify-between gap-3 border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-100 outline-none transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200 focus:border-red-500 ${buttonClassName}`}
      >
        <span className="truncate">{selected?.label}</span>
        <IoChevronDown
          className={`shrink-0 text-base transition ${open ? "rotate-180 text-red-300" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-b-2xl rounded-t-md border border-zinc-800 bg-black shadow-2xl shadow-black/70">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`block w-full px-5 py-3 text-left text-sm transition ${
                  active
                    ? "bg-red-500/10 font-semibold text-red-200"
                    : "text-zinc-200 hover:bg-red-500/10 hover:text-red-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function UserFormModal({
  mode,
  initialUser,
  submitting,
  error,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    email: initialUser?.email ?? "",
    username: initialUser?.username ?? "",
    displayName: initialUser?.displayName ?? "",
    role: String(initialUser?.role ?? "USER").toUpperCase(),
  }));
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailCanRecheck, setEmailCanRecheck] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState("");
  const [usernameCanRecheck, setUsernameCanRecheck] = useState(false);

  const normalizedEmail = form.email.trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const normalizedUsername = normalizeVibelyId(form.username);
  const birthDateValidation = validateBirthDateParts(
    birthMonth,
    birthDay,
    birthYear,
  );
  const isBirthDateValid = birthDateValidation.valid;

  const initialSnapshot = useMemo(
    () => ({
      username: String(initialUser?.username ?? "").trim(),
      displayName: String(initialUser?.displayName ?? "").trim(),
      role: String(initialUser?.role ?? "USER").toUpperCase(),
    }),
    [initialUser],
  );

  const hasChanges = useMemo(() => {
    if (!isEdit) return true;
    const passwordChanged = form.password.trim().length > 0;
    return (
      form.username.trim() !== initialSnapshot.username ||
      form.displayName.trim() !== initialSnapshot.displayName ||
      form.role !== initialSnapshot.role ||
      passwordChanged
    );
  }, [form, initialSnapshot, isEdit]);

  const canCompleteCreate = useMemo(() => {
    if (isEdit) return false;
    return (
      isEmailValid &&
      emailAvailable &&
      !emailChecking &&
      normalizedUsername.length >= 4 &&
      usernameAvailable &&
      !usernameChecking &&
      form.displayName.trim().length > 0 &&
      form.password.trim().length >= 6 &&
      birthMonth &&
      birthDay &&
      birthYear &&
      isBirthDateValid
    );
  }, [
    birthDay,
    birthMonth,
    birthYear,
    emailAvailable,
    emailChecking,
    form.displayName,
    form.password,
    isBirthDateValid,
    isEdit,
    isEmailValid,
    normalizedUsername.length,
    usernameAvailable,
    usernameChecking,
  ]);

  const profileCompletedPreview = isEdit
    ? Boolean(initialUser?.onboardingCompleted)
    : canCompleteCreate;

  useEffect(() => {
    if (isEdit || !isEmailValid) {
      setEmailAvailable(false);
      setEmailMessage("");
      setEmailChecking(false);
      return undefined;
    }

    setEmailChecking(true);
    const timeoutId = setTimeout(() => {
      userApi
        .checkEmail(normalizedEmail)
        .then((result) => {
          setEmailAvailable(Boolean(result?.available));
          setEmailMessage(result?.message ?? "");
          setEmailCanRecheck(Boolean(result?.canRecheck));
        })
        .catch((err) => {
          setEmailAvailable(false);
          setEmailMessage(err.message ?? t("admin.users.emailCheckFailed"));
          setEmailCanRecheck(false);
        })
        .finally(() => setEmailChecking(false));
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [isEdit, isEmailValid, normalizedEmail]);

  useEffect(() => {
    if (!normalizedUsername) {
      setUsernameAvailable(false);
      setUsernameMessage("");
      setUsernameChecking(false);
      return undefined;
    }

    if (
      isEdit &&
      normalizedUsername === normalizeVibelyId(initialSnapshot.username)
    ) {
      setUsernameAvailable(true);
      setUsernameMessage(t("admin.users.vibelyIdCurrent"));
      setUsernameChecking(false);
      return undefined;
    }

    setUsernameChecking(true);
    const timeoutId = setTimeout(() => {
      userApi
        .checkUsername(normalizedUsername)
        .then((result) => {
          setUsernameAvailable(Boolean(result?.available));
          setUsernameMessage(result?.message ?? "");
          setUsernameCanRecheck(Boolean(result?.canRecheck));
        })
        .catch((err) => {
          setUsernameAvailable(false);
          setUsernameMessage(err.message ?? t("admin.users.vibelyIdCheckFailed"));
          setUsernameCanRecheck(false);
        })
        .finally(() => setUsernameChecking(false));
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [initialSnapshot.username, isEdit, normalizedUsername]);

  const recheckEmailAvailability = async () => {
    if (!isEmailValid) return;
    setEmailChecking(true);
    setEmailCanRecheck(false);
    try {
      const result = await userApi.checkEmail(normalizedEmail, {
        confirm: true,
      });
      setEmailAvailable(Boolean(result?.available));
      setEmailMessage(result?.message ?? "");
      setEmailCanRecheck(Boolean(result?.canRecheck));
    } catch (err) {
      setEmailAvailable(false);
      setEmailMessage(err.message ?? t("admin.users.emailCheckFailed"));
      setEmailCanRecheck(false);
    } finally {
      setEmailChecking(false);
    }
  };

  const recheckUsernameAvailability = async () => {
    if (!normalizedUsername) return;
    setUsernameChecking(true);
    setUsernameCanRecheck(false);
    try {
      const result = await userApi.checkUsername(normalizedUsername, {
        confirm: true,
      });
      setUsernameAvailable(Boolean(result?.available));
      setUsernameMessage(result?.message ?? "");
      setUsernameCanRecheck(Boolean(result?.canRecheck));
    } catch (err) {
      setUsernameAvailable(false);
      setUsernameMessage(err.message ?? t("admin.users.vibelyIdCheckFailed"));
      setUsernameCanRecheck(false);
    } finally {
      setUsernameChecking(false);
    }
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isEdit && !hasChanges) return;
    if (!isEdit && !canCompleteCreate) return;

    const payload = { ...form };
    if (!isEdit) {
      payload.birthDate = `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;
    }
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              {isEdit ? t("admin.users.editUser") : t("admin.users.addUser")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {isEdit
                ? t("admin.users.editHint")
                : t("admin.users.addHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
            aria-label={t("admin.close")}
          >
            <IoClose className="text-xl" aria-hidden />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <FieldLabel>Email</FieldLabel>
            <input
              type="email"
              required
              disabled={isEdit}
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-red-500 disabled:cursor-not-allowed disabled:bg-zinc-900/70 disabled:text-zinc-500"
              placeholder="user@example.com"
            />
            {!isEdit && normalizedEmail && isEmailValid ? (
              <div className="space-y-1">
                <p
                  className={`text-xs ${emailAvailable ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {emailChecking ? t('admin.users.checkingEmail') : emailMessage}
                </p>
                {emailCanRecheck && !emailChecking ? (
                  <button
                    type="button"
                    className="text-xs text-zinc-300 underline hover:text-white"
                    onClick={() => void recheckEmailAvailability()}
                  >
                    {t("admin.users.recheckEmail")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Vibely ID</FieldLabel>
            <input
              required
              value={form.username}
              onChange={(e) => updateField("username", e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-red-500"
              placeholder="vibely.id"
            />
            {normalizedUsername ? (
              <div className="space-y-1">
                <p
                  className={`text-xs ${usernameAvailable ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {usernameChecking
                    ? t('admin.users.checkingVibelyId')
                    : usernameMessage}
                </p>
                {usernameCanRecheck && !usernameChecking ? (
                  <button
                    type="button"
                    className="text-xs text-zinc-300 underline hover:text-white"
                    onClick={() => void recheckUsernameAvailability()}
                  >
                    {t("admin.users.recheckVibelyId")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <FieldLabel>{t("admin.users.displayName")}</FieldLabel>
            <input
              required
              value={form.displayName}
              onChange={(e) => updateField("displayName", e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-red-500"
              placeholder={t('admin.users.username')}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>{t("admin.users.role")}</FieldLabel>
            <RoleDropdown
              value={form.role}
              onChange={(role) => updateField("role", role)}
              options={[
                { value: "USER", label: t("admin.users.roleUser") },
                { value: "ADMIN", label: t("admin.users.roleAdmin") },
              ]}
              ariaLabel={t('admin.users.selectRole')}
              buttonClassName="w-full rounded-xl px-4 py-3"
            />
          </div>
          {isEdit ? (
            <div className="space-y-1.5">
              <FieldLabel>{t("admin.users.status")}</FieldLabel>
              <div className="flex min-h-[48px] items-center rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
                <AccountStatusBadge
                  accountStatus={initialUser?.accountStatus}
                />
              </div>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <FieldLabel>{t("admin.users.profile")}</FieldLabel>
            <div className="flex min-h-[48px] items-center rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
              <OnboardingBadge completed={profileCompletedPreview} />
            </div>
          </div>
          {!isEdit ? (
            <div className="space-y-1.5 sm:col-span-2">
              <FieldLabel>{t("admin.users.birthDate")}</FieldLabel>
              <BirthDateFields
                birthMonth={birthMonth}
                birthDay={birthDay}
                birthYear={birthYear}
                onMonthChange={setBirthMonth}
                onDayChange={setBirthDay}
                onYearChange={setBirthYear}
                monthOptions={BIRTH_MONTH_OPTIONS}
              />
              {!isBirthDateValid && birthMonth && birthDay && birthYear ? (
                <p className="text-xs text-red-400">
                  {birthDateValidation.message}
                </p>
              ) : (
                <p className="text-xs text-zinc-500">
                  {t("admin.users.mustBe18")}
                </p>
              )}
            </div>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <FieldLabel>{t("admin.users.password")}</FieldLabel>
            <input
              type="password"
              required={!isEdit}
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-red-500"
              placeholder={
                isEdit
                  ? t('admin.users.passwordKeep')
                  : t('admin.users.passwordNew')
              }
            />
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
          >
            {t("admin.cancel")}
          </button>
          <button
            type="submit"
            disabled={
              submitting ||
              (isEdit && !hasChanges) ||
              (!isEdit && !canCompleteCreate)
            }
            className="rounded-xl border border-zinc-800 bg-black px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? t("admin.saving")
              : isEdit
                ? t("admin.users.saveChanges")
                : canCompleteCreate
                  ? t("admin.users.finish")
                  : t("admin.users.addUser")}
          </button>
        </div>
      </form>
    </div>
  );
}

function BanConfirmModal({ user, submitting, error, onClose, onConfirm }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();
  const canSubmit =
    trimmedReason.length >= 5 && trimmedReason.length <= 500 && !submitting;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onConfirm(trimmedReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">{t("admin.users.banTitle")}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {t("admin.users.banHint")}
              email.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
            aria-label={t("admin.close")}
          >
            <IoClose className="text-xl" aria-hidden />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          <p>
            {t("admin.users.banAbout")}{" "}
            <strong>{user?.displayName || t("admin.vibelyUser")}</strong> (@
            {user?.username || "unknown"}).
          </p>
          <p className="mt-2 break-all text-red-200/90">
            {t("admin.users.notifyEmail", { email: user?.email || t("admin.noEmail") })}
          </p>
        </div>

        <div className="mt-4 space-y-1.5">
          <FieldLabel>{t("admin.users.banReason")}</FieldLabel>
          <textarea
            required
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            className="w-full resize-y rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-red-500"
            placeholder={t("admin.users.banReasonPlaceholder")}
          />
          <p className="text-right text-xs text-zinc-500">
            {trimmedReason.length}/500
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
          >
            {t("admin.cancel")}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl border border-zinc-800 bg-black px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t("admin.users.banning") : t("admin.users.banAccount")}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteConfirmModal({ user, submitting, error, onClose, onConfirm }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              {t("admin.users.deleteTitle")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {t("admin.users.deleteHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
            aria-label={t("admin.close")}
          >
            <IoClose className="text-xl" aria-hidden />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          <p>
            {t("admin.users.deleteAbout")}{" "}
            <strong>{user?.displayName || t("admin.vibelyUser")}</strong> (@
            {user?.username || "unknown"}).
          </p>
          <p className="mt-2 break-all text-red-200/90">
            {t("admin.users.notifyEmail", { email: user?.email || t("admin.noEmail") })}
          </p>
          <p className="mt-3 text-red-200/90">
            {t("admin.users.deleteDataHint")}
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
          >
            {t("admin.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-xl border border-zinc-800 bg-black px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t("admin.deleting") : t("admin.users.deleteAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const { t } = useTranslation()
  const { token, user, authReady } = useAuth();
  const isAdmin = String(user?.role ?? "").toUpperCase() === "ADMIN";
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [formMode, setFormMode] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [banningUser, setBanningUser] = useState(null);
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = t("admin.docTitle.users");
  }, [t]);

  const loadUsers = useCallback(async () => {
    if (!authReady) return;
    if (!token || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.getAdminUsers(token, {
        page,
        size: PAGE_SIZE,
      });
      setUsers(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total ?? 0));
      setHasNext(Boolean(data?.hasNext));
    } catch (e) {
      setUsers([]);
      setTotal(0);
      setHasNext(false);
      setError(e.message ?? t("admin.users.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [authReady, isAdmin, page, token]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return users.filter(
      (item) =>
        (selectedRole === "ALL" ||
          String(item.role ?? "").toUpperCase() === selectedRole) &&
        (!keyword ||
          [item.username, item.displayName, item.email, roleLabel(item.role)]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))),
    );
  }, [query, selectedRole, users]);

  const availableRoles = useMemo(() => {
    const roles = new Set(
      users
        .map((item) => String(item.role ?? "").toUpperCase())
        .filter(Boolean),
    );
    return Array.from(roles).sort((a, b) =>
      roleLabel(a).localeCompare(roleLabel(b), "vi"),
    );
  }, [users]);

  const roleFilterOptions = useMemo(
    () => [
      { value: "ALL", label: t("admin.users.allRoles") },
      ...availableRoles.map((role) => ({
        value: role,
        label: roleLabel(role),
      })),
    ],
    [availableRoles],
  );

  const openCreateModal = () => {
    setModalError("");
    setEditingUser(null);
    setFormMode("create");
  };

  const openEditModal = (item) => {
    setModalError("");
    setEditingUser(item);
    setFormMode("edit");
  };

  const openDeleteModal = (item) => {
    setModalError("");
    setDeletingUser(item);
  };

  const openBanModal = (item) => {
    setModalError("");
    setBanningUser(item);
  };

  const closeModals = () => {
    if (submitting) return;
    setFormMode(null);
    setEditingUser(null);
    setDeletingUser(null);
    setBanningUser(null);
    setModalError("");
  };

  const handleSubmitUser = async (form) => {
    setSubmitting(true);
    setModalError("");
    try {
      const payload = {
        email: form.email.trim(),
        username: form.username.trim(),
        displayName: form.displayName.trim(),
        role: form.role,
        password: form.password,
      };
      if (formMode === "edit" && editingUser?.id) {
        await adminApi.updateAdminUser(token, editingUser.id, payload);
      } else {
        await adminApi.createAdminUser(token, {
          ...payload,
          birthDate: form.birthDate,
        });
      }
      setFormMode(null);
      setEditingUser(null);
      setModalError("");
      await loadUsers();
    } catch (e) {
      setModalError(e.message ?? t("admin.users.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser?.id) return;
    setSubmitting(true);
    setModalError("");
    try {
      await adminApi.deleteAdminUser(token, deletingUser.id);
      setDeletingUser(null);
      setModalError("");
      if (users.length === 1 && page > 0) {
        setPage((current) => Math.max(current - 1, 0));
      } else {
        await loadUsers();
      }
    } catch (e) {
      setModalError(e.message ?? t("admin.users.deleteFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBanUser = async (reason) => {
    if (!banningUser?.id) return;
    setSubmitting(true);
    setModalError("");
    try {
      await adminApi.banAdminUser(token, banningUser.id, { reason });
      setBanningUser(null);
      setModalError("");
      await loadUsers();
    } catch (e) {
      setModalError(e.message ?? t("admin.users.banFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      active="users"
      title={t("admin.users.title")}
      subtitle={t("admin.users.subtitle")}
    >
      {!authReady || loading ? (
        <AdminUsersPageSkeleton />
      ) : !isAdmin ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center">
          <p className="text-lg font-semibold text-zinc-100">
            {t("admin.noAccess")}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            {t("admin.noAccessHint")}
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(160px,220px)_minmax(320px,1fr)_auto] xl:items-center">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-zinc-200">
                  {t("admin.users.total", { count: total })}
                </p>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 w-full rounded-full border border-zinc-700 bg-zinc-950 px-5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-red-500"
                placeholder={t("admin.users.searchPlaceholder")}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
                <RoleDropdown
                  value={selectedRole}
                  onChange={setSelectedRole}
                  options={roleFilterOptions}
                  ariaLabel={t("admin.users.filterRoleAria")}
                  buttonClassName="h-12 min-w-44 rounded-full px-5"
                />
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-5 text-sm font-bold text-zinc-100 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200"
                >
                  <IoAdd className="text-lg" aria-hidden />
                  {t("admin.users.addUser")}
                </button>
              </div>
            </div>

            {error ? (
              <p className="mt-4 text-sm text-amber-400">{error}</p>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-sm text-zinc-200">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                    <th className="py-3 pr-4 text-center font-medium">
                      {t("admin.table.user")}
                    </th>
                    <th className="px-3 py-3 text-center font-medium">Email</th>
                    <th className="px-3 py-3 text-center font-medium">
                      {t("admin.table.role")}
                    </th>
                    <th className="px-3 py-3 text-center font-medium">
                      {t("admin.table.status")}
                    </th>
                    <th className="px-3 py-3 text-center font-medium">
                      {t("admin.table.created")}
                    </th>
                    <th className="px-3 py-3 text-center font-medium">
                      {t("admin.table.updated")}
                    </th>
                    <th className="px-3 py-3 text-center font-medium">
                      {t("admin.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => {
                    const avatarSrc = resolveAdminAvatarUrl(item.avatarUrl, item.id);
                    const itemIsAdmin =
                      String(item.role ?? "").toUpperCase() === "ADMIN";
                    const itemIsSelf = Number(item.id) === Number(user?.id);
                    const itemIsBanned =
                      String(item.accountStatus ?? "").toUpperCase() ===
                      "BANNED";
                    const cannotDelete = itemIsAdmin || itemIsSelf;
                    const cannotBan = itemIsAdmin || itemIsSelf || itemIsBanned;
                    return (
                      <tr key={item.id} className="border-b border-zinc-800/80">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={avatarSrc}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-zinc-800"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.src = DEFAULT_AVATAR;
                              }}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-zinc-100">
                                {item.displayName || t("admin.vibelyUser")}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-zinc-500">
                                @{item.username || "unknown"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[220px] px-3 py-3 text-zinc-300">
                          <span
                            className="block truncate"
                            title={item.email || undefined}
                          >
                            {item.email || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <RoleBadge role={item.role} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <AccountStatusBadge
                            accountStatus={item.accountStatus}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-center text-xs text-zinc-400">
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-center text-xs text-zinc-400">
                          {formatDateTime(item.updatedAt)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-200 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-300"
                              aria-label={t("admin.users.editAria", { username: item.username })}
                            >
                              <IoPencil className="text-base" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => openBanModal(item)}
                              disabled={cannotBan}
                              title={
                                cannotBan
                                  ? t("admin.users.cannotBanSelf")
                                  : t("admin.users.banAccount")
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-200 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label={t("admin.users.banAria", { username: item.username })}
                            >
                              <IoLockClosedOutline
                                className="text-base"
                                aria-hidden
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(item)}
                              disabled={cannotDelete}
                              title={
                                cannotDelete
                                  ? t("admin.users.cannotDeleteSelf")
                                  : t("admin.users.deleteUser")
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-200 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label={t("admin.users.deleteAria", { username: item.username })}
                            >
                              <IoTrash className="text-base" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-12 text-center text-sm text-zinc-500">
                {t("admin.users.empty")}
              </div>
            ) : null}

            <AdminPagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              hasNext={hasNext}
              onPageChange={setPage}
            />
          </section>
          {formMode ? (
            <UserFormModal
              mode={formMode}
              initialUser={editingUser}
              submitting={submitting}
              error={modalError}
              onClose={closeModals}
              onSubmit={handleSubmitUser}
            />
          ) : null}
          {deletingUser ? (
            <DeleteConfirmModal
              user={deletingUser}
              submitting={submitting}
              error={modalError}
              onClose={closeModals}
              onConfirm={handleDeleteUser}
            />
          ) : null}
          {banningUser ? (
            <BanConfirmModal
              user={banningUser}
              submitting={submitting}
              error={modalError}
              onClose={closeModals}
              onConfirm={handleBanUser}
            />
          ) : null}
        </>
      )}
    </AdminLayout>
  );
}
