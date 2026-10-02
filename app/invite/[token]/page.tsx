import { InviteAccept } from '@/components/invite-accept'
export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params;return <main className="grid min-h-screen place-items-center bg-zinc-50 p-5 dark:bg-zinc-950"><InviteAccept token={token}/></main>}
