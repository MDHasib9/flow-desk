'use client'
import Link from 'next/link'
import { useState } from 'react'
import { acceptInvitation } from '@/app/(app)/actions'
export function InviteAccept({token}:{token:string}){const [message,setMessage]=useState('');return <div className="w-full max-w-md rounded-xl border bg-white p-7 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"><h1 className="text-xl font-semibold">Join this FlowDesk workspace</h1><p className="mt-2 text-sm text-zinc-500">Sign in with the email that received the invitation, then accept access.</p><button onClick={async()=>setMessage((await acceptInvitation(token)).message)} className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white">Accept invitation</button>{message&&<p className="mt-4 text-sm text-zinc-600">{message}</p>}<Link href="/auth/login" className="mt-5 block text-center text-sm text-indigo-600">Sign in first</Link></div>}
