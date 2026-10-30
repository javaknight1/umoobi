/** COPPA: accounts are for people 13 and over. Year-only, so someone turning 13 this year passes. */
export function isOldEnough(birthYear: number, now = new Date()): boolean {
  return now.getFullYear() - birthYear >= 13;
}
