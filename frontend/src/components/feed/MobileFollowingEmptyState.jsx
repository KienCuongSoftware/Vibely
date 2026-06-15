import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../../api/client.js'
import { SuggestedCreatorCard } from '../SuggestedCreatorsPanel.jsx'

const MOBILE_GRID_CLASS = 'grid w-full grid-cols-2 gap-3 sm:max-w-[420px] sm:grid-cols-3'
const MOBILE_SKELETON_CLASS =
  'aspect-[2/3] w-full animate-pulse overflow-hidden rounded-xl bg-zinc-900'

function MobileSuggestedCreatorsGrid({ token }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(Boolean(token))
  const [previewCreatorId, setPreviewCreatorId] = useState(null)

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await apiClient.getSuggestedCreators(token, { page: 0, size: 12 })
      setItems(Array.isArray(res?.items) ? res.items : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  if (!token) return null

  return (
    <section className="mt-8 w-full sm:max-w-[420px]">
      <h2 className="mb-3 px-1 text-center text-[15px] font-bold text-white">
        Tài khoản được đề xuất
      </h2>
      {loading ? (
        <div className={MOBILE_GRID_CLASS}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={MOBILE_SKELETON_CLASS} aria-hidden />
          ))}
        </div>
      ) : items.length === 0 ? null : (
        <div className={MOBILE_GRID_CLASS}>
          {items.map((creator) => (
            <SuggestedCreatorCard
              key={String(creator.id)}
              creator={creator}
              token={token}
              playing={previewCreatorId === creator.id}
              onHover={setPreviewCreatorId}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export function MobileFollowingEmptyState({ token }) {
  return (
    <div className="scrollbar-none flex h-full min-h-0 w-full flex-1 flex-col items-center overflow-y-auto overscroll-y-contain px-4 pb-6 pt-10">
      {!token ? (
        <div className="mx-auto max-w-sm text-center">
          <p className="text-[17px] font-semibold leading-snug text-white">
            Follow các tác giả để xem video của họ
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Đăng nhập để thích, bình luận và theo dõi nhà sáng tạo trên Vibely.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-[#fe2c55] px-8 py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#ff4d70]"
          >
            Đăng nhập
          </Link>
        </div>
      ) : (
        <>
          <p className="mx-auto max-w-sm text-center text-[17px] font-semibold leading-snug text-white">
            Follow các tác giả để xem video của họ
          </p>
          <MobileSuggestedCreatorsGrid token={token} />
        </>
      )}
    </div>
  )
}
