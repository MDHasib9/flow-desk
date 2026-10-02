import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

import { createClient } from '@/lib/server'
import { safeNextPath } from '@/lib/safe-next-path'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const _next = searchParams.get('next')
  const next = safeNextPath(_next, '/', request.nextUrl.origin)

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      redirect(next)
    } else {
      redirect(`/auth/error?${new URLSearchParams({ error: error.message })}`)
    }
  }

  redirect(`/auth/error?${new URLSearchParams({ error: 'No token hash or type' })}`)
}
