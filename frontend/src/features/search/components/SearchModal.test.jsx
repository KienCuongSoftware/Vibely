import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SearchModal } from '@/features/search/components/SearchModal'

vi.mock('@/features/search/hooks/useSearch', () => ({
  useSearch: vi.fn(),
}))

vi.mock('@/features/search/hooks/useSearchHistory', () => ({
  useSearchHistory: vi.fn(),
}))

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ token: null }),
}))

vi.mock('@/features/search/hooks/useSearchNavigation', () => ({
  useSearchNavigation: vi.fn(),
}))

import { useSearch } from '@/features/search/hooks/useSearch'
import { useSearchHistory } from '@/features/search/hooks/useSearchHistory'
import { useSearchNavigation } from '@/features/search/hooks/useSearchNavigation'

function renderModal(props = {}) {
  return render(
    <MemoryRouter>
      <SearchModal open onClose={vi.fn()} {...props} />
    </MemoryRouter>,
  )
}

describe('SearchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSearchNavigation.mockReturnValue({
      goToSearchResults: vi.fn(),
      navigateTo: vi.fn(),
    })
    useSearch.mockReturnValue({
      query: '',
      setQuery: vi.fn(),
      debouncedQuery: '',
      suggest: {
        trending: [{ keyword: 'dance', searchCount: 12 }],
        users: [],
        hashtags: [],
        videos: [],
      },
      loading: false,
      error: '',
      isEmpty: false,
      showHistory: true,
      refresh: vi.fn(),
    })
    useSearchHistory.mockReturnValue({
      items: [],
      loading: false,
      removingId: null,
      record: vi.fn(),
      remove: vi.fn(),
      canUseHistory: false,
    })
  })

  it('renders search panel title and input', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Tìm kiếm')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tìm kiếm')).toBeInTheDocument()
  })

  it('shows recent and you-might-like sections from suggest payload', () => {
    renderModal()
    expect(screen.getByText('dance')).toBeInTheDocument()
    expect(screen.getByText('Bạn có thể thích')).toBeInTheDocument()
  })

  it('calls onClose when escape is pressed', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows view-all CTA when suggest is empty but query is set', () => {
    useSearch.mockReturnValue({
      query: 'zzz',
      setQuery: vi.fn(),
      debouncedQuery: 'zzz',
      suggest: { trending: [], users: [], hashtags: [], videos: [] },
      loading: false,
      error: '',
      isEmpty: true,
      showHistory: false,
      refresh: vi.fn(),
    })
    renderModal()
    expect(screen.getByRole('button', { name: 'Xem tất cả kết quả' })).toBeInTheDocument()
  })

  it('navigates to search results on Enter', async () => {
    const goToSearchResults = vi.fn()
    useSearchNavigation.mockReturnValue({
      goToSearchResults,
      navigateTo: vi.fn(),
    })
    useSearch.mockReturnValue({
      query: 'kiencuong',
      setQuery: vi.fn(),
      debouncedQuery: 'kiencuong',
      suggest: { trending: [], users: [], hashtags: [], videos: [] },
      loading: false,
      error: '',
      isEmpty: true,
      showHistory: false,
      refresh: vi.fn(),
    })
    renderModal()
    await userEvent.keyboard('{Enter}')
    expect(goToSearchResults).toHaveBeenCalledWith('kiencuong')
  })
})
