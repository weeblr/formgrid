// [weeblr] Instance settings

/**
 * Account creation and deletion are only available when ENABLE_ACCOUNTS=true.
 */
export const accountsEnabled = (): boolean => process.env.ENABLE_ACCOUNTS === 'true';
