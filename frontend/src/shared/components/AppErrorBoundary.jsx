import React from 'react'

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Ứng dụng gặp lỗi không xác định',
    }
  }

  componentDidCatch(error) {
    // Keep the stack in browser console for debugging.
    console.error('App runtime error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="flex min-h-screen items-center justify-center bg-black px-4 text-zinc-100">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center">
            <h1 className="text-2xl font-semibold">Đã xảy ra lỗi hiển thị</h1>
            <p className="mt-3 text-sm text-zinc-300">{this.state.message}</p>
            <button
              type="button"
              className="mt-5 rounded-md bg-red-600 px-4 py-2 font-medium hover:bg-red-500"
              onClick={() => window.location.assign('/login')}
            >
              Tải lại trang đăng nhập
            </button>
          </div>
        </section>
      )
    }
    return this.props.children
  }
}
