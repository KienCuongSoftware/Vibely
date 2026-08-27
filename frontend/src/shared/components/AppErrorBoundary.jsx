import React from 'react'
import i18n from '@/i18n/i18n'

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message:
        error instanceof Error
          ? error.message
          : i18n.t('appError.unknown'),
    }
  }

  componentDidCatch(error) {
    // Keep the stack in browser console for debugging.
    console.error('App runtime error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="vibely-keep-dark flex min-h-screen items-center justify-center bg-black px-4 text-zinc-100">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center">
            <h1 className="text-2xl font-semibold text-zinc-100">
              {i18n.t('appError.title')}
            </h1>
            <p className="mt-3 text-sm text-zinc-300">{this.state.message}</p>
            <button
              type="button"
              className="mt-5 rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
              onClick={() => {
                try {
                  sessionStorage.removeItem('vibely:chunk-reload')
                } catch {
                  /* ignore */
                }
                window.location.assign('/')
              }}
            >
              {i18n.t('appError.reloadLogin')}
            </button>
          </div>
        </section>
      )
    }
    return this.props.children
  }
}
