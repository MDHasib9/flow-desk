export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid absolute URL.')
  }

  if (
    !['https:', 'http:'].includes(parsedUrl.protocol) ||
    !parsedUrl.hostname
  ) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must use HTTP or HTTPS.')
  }

  return { url, publishableKey }
}
