export const THEMES = [
    'Subway Chaos',
    'Bodega Cat Energy',
    'Overpriced Coffee',
    'Midwest Kid vs. NYC',
    'Dorm Life',
    'Weekend Adventures',
    'Rats & Pigeons',
    'Columbia Campus Life',
    'Only in New York',
    'Rent Is How Much?!',
    'Tourist Traps',
    'Late-Night Food',
]

export function getTodaysTheme() {
    const day = Math.floor(Date.now() / 86400000)
    return THEMES[day % THEMES.length]
}