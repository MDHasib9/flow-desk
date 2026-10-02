'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Activity, Bell, ChevronDown, Command, FolderKanban, Layers3, LayoutDashboard, ListTodo, LogOut, Menu, Receipt, Settings, Users, X } from 'lucide-react'
import { createClient } from '@/lib/client'

const mainNav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard }, { href: '/customers', label: 'Customers', icon: Users }, { href: '/projects', label: 'Projects', icon: FolderKanban }, { href: '/tasks', label: 'Tasks', icon: ListTodo }, { href: '/invoices', label: 'Invoices', icon: Receipt },
]
const workspaceNav = [{ href: '/team', label: 'Team', icon: Users }, { href: '/activity', label: 'Activity', icon: Activity }, { href: '/settings', label: 'Settings', icon: Settings }]

type Props = { children: React.ReactNode; user: { name: string; email: string }; organization: { name: string; slug: string }; role: string }

export function WorkspaceShell({ children, user, organization, role }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const initials = user.name.slice(0, 2).toUpperCase()
  const navigation = (items: typeof mainNav) => <nav className="space-y-1">{items.map(({ href, label, icon: Icon }) => <Link onClick={() => setMobileOpen(false)} key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${pathname === href ? 'bg-zinc-100 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-white' : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}><Icon size={17}/>{label}</Link>)}</nav>
  const sidebar = <aside className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
    <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 font-semibold"><span className="grid size-7 place-items-center rounded-md bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"><Layers3 size={15}/></span>FlowDesk</Link>
    <div className="mt-6 flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"><span className="min-w-0"><b className="block truncate text-sm">{organization.name}</b><small className="text-zinc-500">{role}</small></span><ChevronDown size={15}/></div>
    <div className="mt-5">{navigation(mainNav)}</div><p className="mt-7 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Workspace</p><div className="mt-2">{navigation(workspaceNav)}</div>
    <div className="mt-auto rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900"><p className="text-sm font-medium">{organization.slug}</p><p className="mt-1 text-xs text-zinc-500">Your secure team workspace.</p></div>
  </aside>
  return <div className="min-h-screen bg-[#fafafa] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
    <div className="fixed inset-y-0 left-0 z-40 hidden md:block">{sidebar}</div>
    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)}/><div className="relative h-full">{sidebar}<button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute right-3 top-4"><X size={18}/></button></div></div>}
    <div className="md:pl-64"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 sm:px-7"><button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="md:hidden"><Menu size={20}/></button><Link href="/customers" className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500 sm:flex dark:border-zinc-800 dark:bg-zinc-900"><Command size={14}/>Search customers</Link><div className="ml-auto flex items-center gap-2"><button aria-label="Toggle color theme" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900">{resolvedTheme === 'dark' ? '☀' : '◐'}</button><Link aria-label="Open notifications" href="/notifications" className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"><Bell size={18}/></Link><details className="relative"><summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900"><span className="grid size-7 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{initials}</span><span className="hidden text-left sm:block"><b className="block max-w-28 truncate text-xs">{user.name}</b><small className="block max-w-28 truncate text-[10px] text-zinc-500">{user.email}</small></span></summary><div className="absolute right-0 mt-2 w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"><Link href="/settings" className="block rounded p-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">Profile settings</Link><button onClick={() => createClient().auth.signOut().then(() => location.assign('/'))} className="flex w-full items-center gap-2 rounded p-2 text-sm text-red-600 hover:bg-red-50"><LogOut size={14}/>Sign out</button></div></details></div></header><main className="mx-auto max-w-[1600px] p-4 sm:p-7">{children}</main></div>
  </div>
}
