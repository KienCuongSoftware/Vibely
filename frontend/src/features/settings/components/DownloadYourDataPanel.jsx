import { useMemo, useState } from 'react'
import { IoArrowBack, IoDownloadOutline } from 'react-icons/io5'

export const DATA_EXPORT_CATEGORIES = [
  { id: 'reviews', label: 'Bài đánh giá vị trí' },
  { id: 'posts', label: 'Bài đăng' },
  { id: 'comments', label: 'Bình luận' },
  {
    id: 'activity',
    label: 'Hoạt động của bạn',
    description: 'Bao gồm lịch sử xem và tìm kiếm, mức quan tâm về quảng cáo và hoạt động người Vibely cũng như hoạt động khác trên Vibely',
  },
  { id: 'profile', label: 'Hồ sơ và cài đặt' },
  { id: 'likes', label: 'Lượt thích và mục Yêu thích' },
  { id: 'live', label: 'Vibely LIVE' },
  { id: 'shop', label: 'Vibely Shop' },
  { id: 'direct_messages', label: 'Tin nhắn trực tiếp' },
  { id: 'income', label: 'Ví Income+' },
]

function formatExportDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Trang Tải về dữ liệu Vibely — tab Yêu cầu / Tải về (kiểu TikTok).
 */
export function DownloadYourDataPanel({
  requests = [],
  loading = false,
  submitting = false,
  error = '',
  onBack,
  onSubmit,
  onCancel,
}) {
  const [tab, setTab] = useState('request')
  const [format, setFormat] = useState('TXT')
  const [selected, setSelected] = useState(() => new Set())

  const processing = useMemo(
    () => requests.find((item) => item.status === 'PROCESSING') || null,
    [requests],
  )
  const pastRequests = useMemo(
    () => requests.filter((item) => item.status !== 'PROCESSING'),
    [requests],
  )

  const allSelected = selected.size === DATA_EXPORT_CATEGORIES.length

  const toggleCategory = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(DATA_EXPORT_CATEGORIES.map((item) => item.id)))
  }

  const canSubmit = selected.size > 0 && !submitting && !processing

  return (
    <div className="flex min-h-[520px] flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
        aria-label="Quay lại"
      >
        <IoArrowBack className="text-xl" aria-hidden />
      </button>

      <h1 className="text-2xl font-bold text-zinc-100">Tải về dữ liệu Vibely</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        Bạn có thể yêu cầu cung cấp bản sao dữ liệu của mình bất kỳ lúc nào để sao lưu tài khoản
        hoặc xuất dữ liệu đó sang các dịch vụ khác.
      </p>

      <div className="mt-6 flex border-b border-zinc-800">
        <button
          type="button"
          onClick={() => setTab('request')}
          className={`flex-1 pb-3 text-center text-sm font-semibold transition ${
            tab === 'request'
              ? 'border-b-2 border-zinc-100 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Yêu cầu dữ liệu
        </button>
        <button
          type="button"
          onClick={() => setTab('downloads')}
          className={`flex-1 pb-3 text-center text-sm font-semibold transition ${
            tab === 'downloads'
              ? 'border-b-2 border-zinc-100 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Tải dữ liệu về
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : null}

      {tab === 'request' ? (
        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          {processing ? (
            <div className="rounded-xl bg-zinc-900/80 px-4 py-4">
              <p className="text-sm font-semibold text-zinc-100">Yêu cầu hiện tại</p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-zinc-950/80 px-3 py-3">
                <div>
                  <p className="text-sm text-zinc-100">
                    Đã yêu cầu vào {formatExportDate(processing.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Tất cả dữ liệu hiện có trên Vibely
                  </p>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => onCancel?.(processing.id)}
                  className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  Hủy
                </button>
              </div>
              {pastRequests.length > 0 ? (
                <p className="mt-4 text-sm font-semibold text-zinc-100">Yêu cầu trước đó</p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-zinc-100">Chọn định dạng tập tin</p>
              <div className="mt-2 space-y-1">
                {[
                  { id: 'TXT', label: 'TXT', help: 'Tập tin văn bản dễ đọc' },
                  { id: 'JSON', label: 'JSON', help: 'Cho phép các dịch vụ khác nhập tin của bạn' },
                ].map((item) => {
                  const checked = format === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormat(item.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-zinc-900"
                    >
                      <span>
                        <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
                        <span className="mt-0.5 block text-xs text-zinc-500">{item.help}</span>
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          checked ? 'border-red-500' : 'border-zinc-500'
                        }`}
                        aria-hidden
                      >
                        {checked ? <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Chọn dữ liệu cần tải về</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Chọn ứng dụng và dữ liệu bạn muốn đưa vào tập tin.
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-zinc-900/70 px-3 py-3">
                <div className="mb-2 flex items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">Vibely</span>
                    <span className="text-xs text-zinc-500">
                      {selected.size}/{DATA_EXPORT_CATEGORIES.length} đã chọn
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-sm font-semibold text-red-400 transition hover:text-red-300"
                  >
                    {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
                <ul className="max-h-[320px] space-y-1 overflow-y-auto scrollbar-none">
                  {DATA_EXPORT_CATEGORIES.map((item) => {
                    const checked = selected.has(item.id)
                    return (
                      <li key={item.id}>
                        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg px-2 py-2.5 transition hover:bg-zinc-800/70">
                          <span className="min-w-0">
                            <span className="block text-sm text-zinc-100">{item.label}</span>
                            {item.description ? (
                              <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategory(item.id)}
                            className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-red-500"
                          />
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}

          <button
            type="button"
            disabled={!canSubmit && !processing}
            onClick={() => {
              if (processing) return
              onSubmit?.({ format, categories: [...selected] })
              setTab('downloads')
            }}
            className={`mt-auto w-full rounded-md px-4 py-3 text-sm font-semibold transition ${
              processing
                ? 'cursor-not-allowed bg-red-500/40 text-white/80'
                : canSubmit
                  ? 'bg-red-500 text-white hover:bg-red-500/90'
                  : 'cursor-not-allowed bg-red-500/35 text-white/70'
            }`}
          >
            {processing ? 'Đang xử lý yêu cầu' : submitting ? 'Đang gửi…' : 'Yêu cầu dữ liệu'}
          </button>
        </div>
      ) : (
        <div className="mt-8 flex flex-1 flex-col">
          {loading ? (
            <p className="text-center text-sm text-zinc-500">Đang tải…</p>
          ) : processing ? (
            <div className="rounded-xl bg-zinc-900/80 px-4 py-4">
              <p className="text-sm font-semibold text-zinc-100">Yêu cầu hiện tại</p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-zinc-950/80 px-3 py-3">
                <div>
                  <p className="text-sm text-zinc-100">
                    Đã yêu cầu vào {formatExportDate(processing.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Tất cả dữ liệu hiện có trên Vibely
                  </p>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => onCancel?.(processing.id)}
                  className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
              <IoDownloadOutline className="text-5xl text-zinc-600" aria-hidden />
              <p className="mt-4 text-base font-semibold text-zinc-100">Chưa có yêu cầu nào</p>
              <p className="mt-1 text-sm text-zinc-500">
                Bắt đầu gửi yêu cầu tải dữ liệu của bạn về.
              </p>
              <button
                type="button"
                onClick={() => setTab('request')}
                className="mt-8 rounded-md bg-red-500 px-8 py-3 text-sm font-semibold text-white transition hover:bg-red-500/90"
              >
                Yêu cầu dữ liệu
              </button>
            </div>
          )}

          {processing ? (
            <button
              type="button"
              disabled
              className="mt-auto w-full cursor-not-allowed rounded-md bg-red-500/40 px-4 py-3 text-sm font-semibold text-white/80"
            >
              Đang xử lý yêu cầu
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
