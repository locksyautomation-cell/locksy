export function formatLocator(prefix: string, seq: number): string {
  return `${prefix}-${seq.toString().padStart(4, "0")}`;
}

/** Extract the numeric portion from any locator format (#0001, AB-0001) */
export function extractLocatorNumber(locator: string): number {
  const match = locator.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}
