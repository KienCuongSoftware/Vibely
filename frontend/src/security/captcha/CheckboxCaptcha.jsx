import React, { useState } from "react";

export function CheckboxCaptcha({ onAttestedChange }) {
  const [checked, setChecked] = useState(false);

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          setChecked(e.target.checked);
          onAttestedChange?.(e.target.checked);
        }}
        className="h-4 w-4 accent-red-500"
      />
      <span className="text-sm text-zinc-200">Tôi xác nhận mình không phải robot</span>
    </label>
  );
}
