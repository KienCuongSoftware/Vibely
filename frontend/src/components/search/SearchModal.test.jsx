import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SearchModal } from './SearchModal'

vi.mock('../../hooks/useSearch', () => ({
  useSearch: vi.fn(),
}))

vi.mock('../../hooks/useSearchHistory', () => ({
  useSearchHistory: vi.fn(),
}))

vi.mock('../../state/useAuth', () => ({
  useAuth: () => ({ token: null }),
}))

import { useSearch } from '../../hooks/useSearch'
import { useSearchHistory } from '../../hooks/useSearchHistory'

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
      clearing: false,
      record: vi.fn(),
      clearAll: vi.fn(),
      canUseHistory: false,
    })
  })

  it('renders search panel title and input', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Tìm kiếm')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tìm kiếm')).toBeInTheDocument()
  })

  it('shows trending section from suggest payload', () => {
    renderModal()
    expect(screen.getByText('dance')).toBeInTheDocument()
    expect(screen.getByText('Trending')).toBeInTheDocument()
  })

  it('calls onClose when escape is pressed', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows empty state when search returns nothing', () => {
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
    expect(screen.getByText('Không có kết quả')).toBeInTheDocument()
  })
})
