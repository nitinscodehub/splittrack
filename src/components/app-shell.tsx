"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Activity,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { AddPaymentDialog } from "@/components/add-payment-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { BrandMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AppGroup, AppUser } from "@/types/app";
import type { PublicUser } from "@/lib/validators";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dues", label: "Payments", icon: HandCoins },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/activity", label: "History", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

const mobileItems = navItems.slice(0, 4);

export function AppShell({
  user,
  friends,
  groups,
  children,
}: {
  user: AppUser;
  friends: PublicUser[];
  groups: AppGroup[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border/60 bg-card/60 backdrop-blur-xl lg:flex">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 via-primary/[0.03] to-transparent" />
        <div className="relative flex h-20 items-center px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-display text-lg font-extrabold tracking-tight">SplitTrack</span>
          </Link>
        </div>

        <nav className="relative flex-1 space-y-1 px-3 py-2" aria-label="Main">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 -z-10 rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <Icon className="size-[18px]" strokeWidth={active ? 2.25 : 1.9} />
                {item.label}
                {item.href === "/dues" ? (
                  <span className="ml-auto rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Live
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="relative px-3 pb-3">
          <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
              <Sparkles className="size-3.5" />
              Clear for everyone
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Every bill, edit and payment is visible to everyone in it.
            </p>
          </div>

          <Button className="mt-3 w-full" size="lg" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add bill
          </Button>
        </div>

        <div className="relative border-t border-border/60 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Account menu"
              >
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="size-9" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{user.name}</div>
                  <div className="truncate text-xs text-muted-foreground">@{user.userId}</div>
                </div>
                <Settings className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-64">
              <DropdownMenuLabel>
                <div className="truncate text-sm font-bold text-foreground">{user.name}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="size-4" />
                  Profile & settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/friends">
                  <Users className="size-4" />
                  Invite friends
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onSelect={() => {
                  void signOut({ callbackUrl: "/" });
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandMark className="size-8 text-sm" />
          <span className="font-display text-base font-extrabold tracking-tight">SplitTrack</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Account menu" className="rounded-full">
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="size-9" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="truncate text-sm font-bold text-foreground">{user.name}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">@{user.userId}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="size-4" />
                  Profile & settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onSelect={() => {
                  void signOut({ callbackUrl: "/" });
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="lg:pl-72">
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-14 lg:pt-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/85 backdrop-blur-xl lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="relative mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-1 pt-2">
          {mobileItems.slice(0, 2).map((item) => (
            <MobileNavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              aria-label="Add bill"
              className="-mt-7 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-glow ring-4 ring-background transition-transform active:scale-95"
            >
              <Plus className="size-6" />
            </button>
          </div>
          {mobileItems.slice(2).map((item) => (
            <MobileNavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      <AddPaymentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        currentUser={user}
        friends={friends}
        groups={groups}
      />

    </div>
  );
}

function MobileNavItem({
  item,
  active,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={cn("size-5", active && "drop-shadow-[0_0_6px_rgba(124,58,237,0.45)]")} />
      {item.label}
    </Link>
  );
}
