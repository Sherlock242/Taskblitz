import type { PropsWithChildren } from 'react';
import { LayoutDashboard, Users, ClipboardList, Send, Workflow } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const adminAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar-admin')?.imageUrl || '';

const NavLink = ({ href, icon: Icon, children }: PropsWithChildren<{ href: string; icon: React.ElementType }>) => (
  <Link href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
    <Icon className="h-4 w-4" />
    {children}
  </Link>
);

const UserNav = () => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={adminAvatar} alt="Admin" data-ai-hint="person face" />
                    <AvatarFallback>AD</AvatarFallback>
                </Avatar>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Admin</p>
                    <p className="text-xs leading-none text-muted-foreground">admin@example.com</p>
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log out</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);

export default function AppLayout({ children }: PropsWithChildren) {
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
              <NavLink href="/templates" icon={ClipboardList}>Templates</NavLink>
              <NavLink href="/assign" icon={Send}>Assign Tasks</NavLink>
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <div className="w-full flex-1">
            {/* Mobile Nav Trigger could be added here */}
          </div>
          <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
