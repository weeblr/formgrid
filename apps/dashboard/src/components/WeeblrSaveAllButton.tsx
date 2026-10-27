import React from 'react'

// [weeblr] "Save all changes" button repeated at the bottom of each settings card.
// Every copy saves the whole page, so the save error is shown next to each one.

interface WeeblrSaveAllButtonProps {
    onSave: () => void
    hasChanges: boolean
    saving: boolean
    error: string | null
}

export const WeeblrSaveAllButton: React.FC<WeeblrSaveAllButtonProps> = ({ onSave, hasChanges, saving, error }) => {
    const enabled = hasChanges && !saving

    return (
        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-3">
            <button
                type="button"
                onClick={onSave}
                disabled={!enabled}
                className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center ${enabled
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
            >
                {saving && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {saving ? 'Saving...' : 'Save all changes'}
            </button>
            {error && (
                <p className="text-sm text-red-700" role="alert">{error}</p>
            )}
        </div>
    )
}
