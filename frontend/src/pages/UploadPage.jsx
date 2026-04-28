import React from 'react'
import { useState } from 'react'
import { apiClient } from '../api/client'
import { useAuth } from '../state/useAuth'

export function UploadPage() {
  const { token } = useAuth()
  const [form, setForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
  })
  const [status, setStatus] = useState('Điền thông tin video và gửi.')

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!token) {
      setStatus('Bạn cần đăng nhập trước khi đăng tải.')
      return
    }
    try {
      await apiClient.createVideo(form, token)
      setStatus('Đăng thông tin video thành công.')
      setForm({ title: '', description: '', videoUrl: '', thumbnailUrl: '' })
    } catch (error) {
      setStatus(error.message)
    }
  }

  return (
    <section className="mx-auto max-w-xl space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-xl font-semibold">Đăng tải thông tin video</h2>
      <form className="space-y-3" onSubmit={submit}>
        <input
          className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
          placeholder="Tiêu đề"
          value={form.title}
          onChange={(event) => updateField('title', event.target.value)}
        />
        <textarea
          className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
          placeholder="Mô tả"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
        />
        <input
          className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
          placeholder="Đường dẫn video"
          value={form.videoUrl}
          onChange={(event) => updateField('videoUrl', event.target.value)}
        />
        <input
          className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
          placeholder="Đường dẫn ảnh thumbnail (không bắt buộc)"
          value={form.thumbnailUrl}
          onChange={(event) => updateField('thumbnailUrl', event.target.value)}
        />
        <button className="rounded bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500" type="submit">
          Gửi
        </button>
      </form>
      <p className="text-sm text-zinc-300">{status}</p>
    </section>
  )
}
