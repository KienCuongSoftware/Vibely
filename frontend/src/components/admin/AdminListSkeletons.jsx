import React from "react";

export function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-800/90 ${className}`}
      aria-hidden
    />
  );
}

function AdminPaginationSkeleton() {
  return (
    <div className="mt-4 flex items-center justify-end gap-1.5">
      <SkeletonBlock className="h-9 w-9 rounded-lg" />
      <SkeletonBlock className="h-9 w-9 rounded-lg" />
      <SkeletonBlock className="h-9 w-9 rounded-lg" />
      <SkeletonBlock className="h-9 w-9 rounded-lg" />
      <SkeletonBlock className="h-9 w-9 rounded-lg" />
      <SkeletonBlock className="h-9 w-9 rounded-lg" />
    </div>
  );
}

export function AdminUsersPageSkeleton() {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
      aria-busy="true"
      aria-label="Đang tải danh sách tài khoản"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(160px,220px)_minmax(320px,1fr)_auto] xl:items-center">
        <SkeletonBlock className="h-5 w-44" />
        <SkeletonBlock className="h-12 w-full rounded-full" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
          <SkeletonBlock className="h-12 w-44 rounded-full" />
          <SkeletonBlock className="h-12 w-40 rounded-full" />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {["w-28", "w-32", "w-20", "w-24", "w-24", "w-24", "w-28"].map(
                (width, index) => (
                  <th key={index} className="px-3 py-3">
                    <SkeletonBlock className={`mx-auto h-3 ${width}`} />
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }, (_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-zinc-800/80">
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="min-w-0 space-y-2">
                      <SkeletonBlock className="h-4 w-32" />
                      <SkeletonBlock className="h-3 w-24" />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="mx-auto h-4 w-40" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="mx-auto h-7 w-24 rounded-full" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="mx-auto h-7 w-24 rounded-full" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="mx-auto h-4 w-28" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="mx-auto h-4 w-28" />
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <SkeletonBlock className="h-9 w-9 rounded-full" />
                    <SkeletonBlock className="h-9 w-9 rounded-full" />
                    <SkeletonBlock className="h-9 w-9 rounded-full" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPaginationSkeleton />
    </section>
  );
}

export function AdminPostsPageSkeleton() {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
      aria-busy="true"
      aria-label="Đang tải danh sách bài đăng"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(160px,220px)_minmax(320px,1fr)_auto] xl:items-center">
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-40" />
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        </div>
        <SkeletonBlock className="h-12 w-full rounded-full" />
        <div className="flex justify-end">
          <SkeletonBlock className="h-12 w-44 rounded-full" />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {[
                "w-28",
                "w-24",
                "w-20",
                "w-12",
                "w-12",
                "w-16",
                "w-12",
                "w-24",
                "w-20",
              ].map((width, index) => (
                <th key={index} className="px-3 py-3 first:pl-0">
                  <SkeletonBlock className={`h-3 ${width}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }, (_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-zinc-800/80">
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-16 w-12 shrink-0 rounded-lg" />
                    <div className="min-w-0 space-y-2">
                      <SkeletonBlock className="h-4 w-48" />
                      <SkeletonBlock className="h-3 w-24" />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4">
                  <div className="space-y-2">
                    <SkeletonBlock className="h-4 w-28" />
                    <SkeletonBlock className="h-3 w-20" />
                  </div>
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="h-7 w-24 rounded-full" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="mx-auto h-4 w-10" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="mx-auto h-4 w-10" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="mx-auto h-4 w-10" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="mx-auto h-4 w-10" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="h-4 w-28" />
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <SkeletonBlock className="h-9 w-16 rounded-full" />
                    <SkeletonBlock className="h-9 w-9 rounded-full" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPaginationSkeleton />
    </section>
  );
}

export function AdminBanAppealsPageSkeleton() {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
      aria-busy="true"
      aria-label="Đang tải danh sách khiếu nại"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <SkeletonBlock className="h-5 w-40" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonBlock key={index} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </div>

      <SkeletonBlock className="mt-4 h-12 w-full rounded-full" />

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {["w-12", "w-44", "w-64", "w-24", "w-28", "w-28"].map(
                (width, index) => (
                  <th key={index} className="px-3 py-3 first:pl-0">
                    <SkeletonBlock className={`h-3 ${width}`} />
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }, (_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-zinc-800/80">
                <td className="py-4 pr-4">
                  <SkeletonBlock className="h-4 w-10" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="h-4 w-44" />
                </td>
                <td className="px-3 py-4">
                  <div className="space-y-2">
                    <SkeletonBlock className="h-3 w-full max-w-sm" />
                    <SkeletonBlock className="h-3 w-4/5 max-w-xs" />
                  </div>
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="h-7 w-24 rounded-full" />
                </td>
                <td className="px-3 py-4">
                  <SkeletonBlock className="h-4 w-28" />
                </td>
                <td className="px-3 py-4">
                  <div className="flex justify-end">
                    <SkeletonBlock className="h-9 w-28 rounded-full" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPaginationSkeleton />
    </section>
  );
}
