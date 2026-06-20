export async function copyExternalUrl(url: string): Promise<void> {
  await navigator.clipboard.writeText(url)
}
