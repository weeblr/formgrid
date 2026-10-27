// [weeblr] Submission dates in the viewer's own locale and timezone.
// The API sends ISO timestamps in UTC (with "Z"), so Date reads them as instants;
// no timeZone is named, so each viewer sees their local time.

/**
 * Date and time, e.g. "27 oct. 2026, 17:46".
 */
export const weeblrDateTime = (iso: string): string =>
    new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

/**
 * Full date and time with seconds, e.g. "27 octobre 2026 à 17:46:13".
 */
export const weeblrDateTimeFull = (iso: string): string =>
    new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'medium' }).format(new Date(iso))

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * 24 * 3600],
    ['month', 30 * 24 * 3600],
    ['week', 7 * 24 * 3600],
    ['day', 24 * 3600],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
]

/**
 * Time elapsed since, e.g. "il y a 12 minutes".
 */
export const weeblrRelativeTime = (iso: string): string => {
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
    const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size || unit === 'second') {
            return formatter.format(Math.round(seconds / size), unit)
        }
    }
    return formatter.format(0, 'second')
}
