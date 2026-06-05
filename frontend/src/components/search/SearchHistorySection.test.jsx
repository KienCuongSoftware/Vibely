import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchHistorySection } from './SearchHistorySection'

describe('SearchHistorySection', () => {
  it('does not show clear-all control', () => {
    render(
      <SearchHistorySection
        items={[{ id: 1, query: 'dance' }]}
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.queryByText('Xóa tất cả')).not.toBeInTheDocument()
  })

  it('calls onRemove when X is clicked', async () => {
    const onRemove = vi.fn()
    const item = { id: 2, query: 'vibely' }
    render(
      <SearchHistorySection
        items={[item]}
        onSelect={vi.fn()}
        onRemove={onRemove}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Xóa "vibely"' }))
    expect(onRemove).toHaveBeenCalledWith(item)
  })
})
