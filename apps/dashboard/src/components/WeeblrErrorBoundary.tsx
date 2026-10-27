import React from 'react'

// [weeblr] Keeps a rendering error in one part of a page from blanking the whole dashboard

interface WeeblrErrorBoundaryProps {
    children: React.ReactNode
}

interface WeeblrErrorBoundaryState {
    failed: boolean
}

export class WeeblrErrorBoundary extends React.Component<WeeblrErrorBoundaryProps, WeeblrErrorBoundaryState> {
    state: WeeblrErrorBoundaryState = { failed: false }

    static getDerivedStateFromError(): WeeblrErrorBoundaryState {
        return { failed: true }
    }

    componentDidCatch(error: unknown): void {
        console.error('Submissions could not be displayed:', error)
    }

    render() {
        if (this.state.failed) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800" role="alert">
                    These submissions could not be displayed: one of them contains data in an unexpected format.
                </div>
            )
        }
        return this.props.children
    }
}
