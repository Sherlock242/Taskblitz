import type { PropsWithChildren } from 'react';
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LayoutDashboard, Users, ClipboardList, Send, Workflow, Menu } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle, SheetHeader, SheetDescription } from '@/components/ui/sheet';
import { UserNav } from '@/components/UserNav';

const NavLink = ({ href, icon: Icon, children }: PropsWithChildren<{ href: string; icon: React.ElementType }>) => (
  <Link href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
    <Icon className="h-4 w-4" />
    {children}
  </Link>
);

export default async function AppLayout({ children }: PropsWithChildren) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const userProfile = {
      name: profile?.name || '',
      email: user.email || '',
      avatar_url: profile?.avatar_url || '',
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-headline font-semibold text-primary">
              <Workflow className="h-6 w-6" />
              <span className="">Task Blitz</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <NavLink href="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
              <NavLink href="/users" icon={Users}>Users</NavLink>
              {profile?.role === 'Admin' && (
                <>
                  <NavLink href="/templates" icon={ClipboardList}>Templates</NavLink>
                  <NavLink href="/assign" icon={Send}>Assign Tasks</NavLink>
                </>
              )}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <SheetHeader>
                <SheetTitle>Task Blitz</SheetTitle>
                <SheetDescription className="sr-only">A list of navigation links for the app.</SheetDescription>
              </SheetHeader>
              <nav className="grid gap-2 text-lg font-medium">
                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Workflow className="h-6 w-6" />
                  <span>Task Blitz</span>
                </Link>
                <SheetClose asChild>
                  <Link href="/dashboard" className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground">
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/users" className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground">
                    <Users className="h-5 w-5" />
                    Users
                  </Link>
                </SheetClose>
                {profile?.role === 'Admin' && (
                  <>
                    <SheetClose asChild>
                      <Link href="/templates" className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground">
                        <ClipboardList className="h-5 w-5" />
                        Templates
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/assign" className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground">
                        <Send className="h-5 w-5" />
                        Assign Tasks
                      </Link>
                    </SheetClose>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1" />
          <UserNav user={userProfile} />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
