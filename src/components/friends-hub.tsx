"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  FolderPlus,
  Group,
  Inbox,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvatarStack, UserAvatar } from "@/components/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { apiFetch } from "@/lib/client";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { AppGroup, AppUser } from "@/types/app";
import type { FriendRequestView, FriendshipState } from "@/lib/services/friends";
import type { PublicUser } from "@/lib/validators";

interface SearchResult extends PublicUser {
  friendship: FriendshipState | null;
}

export function FriendsHub({
  currentUser,
  friends,
  requests,
  groups,
}: {
  currentUser: AppUser;
  friends: PublicUser[];
  requests: { incoming: FriendRequestView[]; outgoing: FriendRequestView[] };
  groups: AppGroup[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const incomingCount = requests.incoming.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Friends"
          value={friends.length}
          description="Ready to share bills"
          tone="from-indigo-500/12 to-violet-500/5 text-primary"
        />
        <StatCard
          icon={Inbox}
          label="Requests"
          value={incomingCount + requests.outgoing.length}
          description={incomingCount > 0 ? `${incomingCount} waiting for you` : "Nothing waiting"}
          tone="from-amber-500/12 to-orange-500/5 text-amber-600 dark:text-amber-300"
        />
        <StatCard
          icon={Group}
          label="Groups"
          value={groups.length}
          description="Use the same people again"
          tone="from-emerald-500/12 to-teal-500/5 text-emerald-600 dark:text-emerald-300"
        />
      </div>

      <Tabs defaultValue="friends">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="friends">
              <Users className="mr-1.5 size-4" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Inbox className="mr-1.5 size-4" />
              Requests
              {incomingCount > 0 ? (
                <span className="ml-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {incomingCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Group className="mr-1.5 size-4" />
              Groups
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateGroupOpen(true)}>
              <FolderPlus className="size-3.5" />
              New group
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="size-3.5" />
              Add friend
            </Button>
          </div>
        </div>

        <TabsContent value="friends">
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <Card className="divide-y divide-border/60">
              {friends.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Users}
                    title="No friends yet"
                    description="Search by name or public ID, or send an invite link. You can only share bills with accepted friends."
                    action={
                      <Button onClick={() => setAddOpen(true)}>
                        <UserPlus className="size-4" />
                        Find friends
                      </Button>
                    }
                    className="border-0 bg-transparent py-8"
                  />
                </div>
              ) : (
                friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3 p-4">
                    <UserAvatar name={friend.name} avatarUrl={friend.avatarUrl} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{friend.name}</div>
                      <div className="truncate text-xs text-muted-foreground">@{friend.userId}</div>
                    </div>
                    <Badge variant="success">
                      <Check className="size-3" />
                      Connected
                    </Badge>
                  </div>
                ))
              )}
            </Card>

            <InviteCard currentUser={currentUser} />
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="grid gap-4 lg:grid-cols-2">
            <RequestList
              title="Incoming"
              description="People who want to share bills with you."
              requests={requests.incoming}
              incoming
            />
            <RequestList
              title="Outgoing"
              description="Requests you sent. They stay here until accepted."
              requests={requests.outgoing}
              incoming={false}
            />
          </div>
        </TabsContent>

        <TabsContent value="groups">
          {groups.length === 0 ? (
            <EmptyState
              icon={Group}
              title="No groups yet"
              description="Create a group for your flat, trip or regular dinner group. Groups let you add the same people in one tap."
              action={
                <Button onClick={() => setCreateGroupOpen(true)}>
                  <FolderPlus className="size-4" />
                  Create a group
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  currentUser={currentUser}
                  friends={friends}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddFriendDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        currentUser={currentUser}
        friends={friends}
      />
      <GroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        currentUser={currentUser}
        friends={friends}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  description: string;
  tone: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/70 bg-gradient-to-br p-5 shadow-card",
        tone,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className="size-4" />
      </div>
      <div className="mt-2 font-display text-2xl font-extrabold">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{description}</div>
    </div>
  );
}

function InviteCard({ currentUser }: { currentUser: AppUser }) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState<"email" | "link" | null>(null);

  async function createInvite(withEmail: boolean) {
    if (withEmail && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }
    setLoading(withEmail ? "email" : "link");
    try {
      const result = await apiFetch<{ token: string; url: string }>("/api/invites", {
        method: "POST",
        body: JSON.stringify({ email: withEmail ? email.trim() : undefined }),
      });
      setInviteUrl(result.url);
      toast.success(withEmail ? "Invite emailed" : "Invite link ready", {
        description: withEmail
          ? `We sent the link to ${email.trim()}. It expires in 14 days.`
          : "Share it anywhere. It expires in 14 days.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the invite.");
    } finally {
      setLoading(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${currentUser.name} invited you to SplitTrack — share bills without awkward math. Join here: ${inviteUrl}`,
  )}`;

  return (
    <Card className="relative overflow-hidden border-primary/15 p-5">
      <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div className="relative space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
            <Sparkles className="size-3.5" />
            Invite a friend
          </div>
          <h2 className="mt-1.5 font-display text-xl font-bold">Invite a friend</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a private link by email or WhatsApp. They become your friend automatically when they
            join.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-email">Email (optional)</Label>
          <div className="flex gap-2">
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="friend@example.com"
              autoComplete="email"
            />
            <Button
              size="icon"
              aria-label="Send email invite"
              onClick={() => createInvite(true)}
              disabled={loading !== null}
            >
              {loading === "email" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>

        {inviteUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/60 p-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                {inviteUrl}
              </span>
              <Button variant="ghost" size="icon-sm" onClick={copyLink} aria-label="Copy invite link">
                <Copy className="size-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-3.5" />
                  WhatsApp
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Share2 className="size-3.5" />
                Copy link
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => createInvite(false)}
            disabled={loading !== null}
          >
            {loading === "link" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Copy className="size-4" />
            )}
            Create invite link
          </Button>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Email invites connect after they verify their email. Link invites connect as soon as they
          sign in.
        </p>
      </div>
    </Card>
  );
}

function RequestList({
  title,
  description,
  requests,
  incoming,
}: {
  title: string;
  description: string;
  requests: FriendRequestView[];
  incoming: boolean;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function respond(friendshipId: string, action: "accept" | "reject") {
    setLoadingId(`${friendshipId}:${action}`);
    try {
      await apiFetch("/api/friends/respond", {
        method: "POST",
        body: JSON.stringify({ friendshipId, action }),
      });
      toast.success(action === "accept" ? "Friend added" : "Request declined");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not respond to the request.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-bold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant={requests.length > 0 ? "default" : "secondary"}>{requests.length}</Badge>
      </div>

      {requests.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
          {incoming ? "No requests waiting." : "You have not sent any requests."}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3"
            >
              <UserAvatar
                name={request.user.name}
                avatarUrl={request.user.avatarUrl}
                className="size-9"
                fallbackClassName="text-xs"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{request.user.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  @{request.user.userId} · {formatDate(request.createdAt)}
                </div>
              </div>
              {incoming ? (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => respond(request.id, "accept")}
                    disabled={loadingId !== null}
                  >
                    {loadingId === `${request.id}:accept` ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => respond(request.id, "reject")}
                    disabled={loadingId !== null}
                    aria-label={`Decline request from ${request.user.name}`}
                  >
                    {loadingId === `${request.id}:reject` ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                  </Button>
                </div>
              ) : (
                <Badge variant="warning">Waiting</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AddFriendDialog({
  open,
  onOpenChange,
  currentUser,
  friends,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: AppUser;
  friends: PublicUser[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const friendIds = useMemo(() => new Set(friends.map((friend) => friend.id)), [friends]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setHasSearched(false);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await apiFetch<{ results: SearchResult[] }>(
          `/api/friends/search?q=${encodeURIComponent(term)}`,
        );
        if (!active) return;
        setResults(response.results);
        setHasSearched(true);
      } catch (error) {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Search failed.");
        }
      } finally {
        if (active) setSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, open, refreshKey]);

  async function act(result: SearchResult) {
    const friendship = result.friendship;
    setActionId(result.id);
    try {
      if (friendship?.status === "PENDING" && friendship.direction === "incoming") {
        await apiFetch("/api/friends/respond", {
          method: "POST",
          body: JSON.stringify({ friendshipId: friendship.id, action: "accept" }),
        });
        toast.success(`You and ${result.name} are now friends.`);
      } else {
        const response = await apiFetch<{ autoAccepted: boolean }>("/api/friends/request", {
          method: "POST",
          body: JSON.stringify({ userId: result.id }),
        });
        toast.success(
          response.autoAccepted
            ? `You and ${result.name} are now friends.`
            : `Friend request sent to ${result.name}.`,
        );
      }
      setRefreshKey((key) => key + 1);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the request.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Find friends</DialogTitle>
          <DialogDescription>
            Search by name, public ID or email. Only verified accounts appear in results.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Aarav, aarav_4821 or friend@email.com"
            className="pl-10"
            autoFocus
            autoComplete="off"
          />
          {searching ? (
            <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {!hasSearched && !searching ? (
            <div className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search.
            </div>
          ) : null}

          {hasSearched && results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
              No matches. Try the invite link instead.
            </div>
          ) : null}

          {results.map((result) => {
            const friendship = result.friendship;
            const accepted = friendship?.status === "ACCEPTED" || friendIds.has(result.id);
            const outgoing = friendship?.status === "PENDING" && friendship.direction === "outgoing";
            const incoming = friendship?.status === "PENDING" && friendship.direction === "incoming";

            return (
              <div
                key={result.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3"
              >
                <UserAvatar
                  name={result.name}
                  avatarUrl={result.avatarUrl}
                  className="size-10"
                  fallbackClassName="text-xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{result.name}</div>
                  <div className="truncate text-xs text-muted-foreground">@{result.userId}</div>
                </div>
                {accepted ? (
                  <Badge variant="success">
                    <Check className="size-3" />
                    Friends
                  </Badge>
                ) : outgoing ? (
                  <Badge variant="warning">Requested</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => act(result)}
                    disabled={actionId !== null}
                    variant={incoming ? "success" : "default"}
                  >
                    {actionId === result.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : incoming ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    {incoming ? "Accept" : "Add"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground">
          You are signed in as @{currentUser.userId}. Your profile can be found by this ID.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function GroupCard({
  group,
  currentUser,
  friends,
}: {
  group: AppGroup;
  currentUser: AppUser;
  friends: PublicUser[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOwner = group.createdById === currentUser.id;

  async function remove() {
    setDeleting(true);
    try {
      await apiFetch(`/api/groups/${group.id}`, { method: "DELETE" });
      toast.success("Group deleted");
      setDeleteOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the group.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/12 to-fuchsia-500/12 text-primary">
              <Group className="size-5" />
            </span>
            <div>
              <h3 className="font-display font-bold">{group.name}</h3>
              <p className="text-xs text-muted-foreground">
                {group.members.length} members · {group.expenseCount ?? 0} bills
              </p>
            </div>
          </div>
          {isOwner ? <Badge variant="outline">Owner</Badge> : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <AvatarStack users={group.members} limit={5} size="size-8" />
          <div className="flex gap-1">
            {isOwner ? (
              <>
                <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)} aria-label="Edit group">
                  <Plus className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteOpen(true)}
                  aria-label="Delete group"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </Card>

      <GroupDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        currentUser={currentUser}
        friends={friends}
        group={group}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{group.name}”?</DialogTitle>
            <DialogDescription>
              Group membership is removed. Existing bills keep their history and stay visible to
              everyone who was in them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Keep group
            </Button>
            <Button variant="destructive" onClick={remove} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GroupDialog({
  open,
  onOpenChange,
  currentUser,
  friends,
  group,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: AppUser;
  friends: PublicUser[];
  group?: AppGroup;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? "");
    setSelected(
      new Set(
        group?.members
          .filter((member) => member.id !== currentUser.id)
          .map((member) => member.id) ?? [],
      ),
    );
    setSubmitting(false);
  }, [open, group, currentUser.id]);

  const isEditing = Boolean(group);
  const canSubmit = name.trim().length >= 2 && selected.size >= 1;

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (group) {
        await apiFetch(`/api/groups/${group.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: name.trim(), memberIds: [...selected] }),
        });
        toast.success("Group updated");
      } else {
        await apiFetch("/api/groups", {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), memberIds: [...selected] }),
        });
        toast.success("Group created");
      }
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the group.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit group" : "Create a group"}</DialogTitle>
          <DialogDescription>
            Groups save the same people for trips, flats and regular plans. You are always included.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="group-name">Group name</Label>
          <Input
            id="group-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Goa trip, Flat 4B, Sunday brunch…"
            maxLength={40}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Members</Label>
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
          </div>
          {friends.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
              Add a friend first, then create a group together.
            </p>
          ) : (
            <div className="flex max-h-60 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-border/70 bg-muted/20 p-3">
              {friends.map((friend) => {
                const active = selected.has(friend.id);
                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => toggle(friend.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition-all",
                      active
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-background/60 text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    <UserAvatar
                      name={friend.name}
                      avatarUrl={friend.avatarUrl}
                      className="size-6"
                      fallbackClassName="text-[9px]"
                    />
                    {friend.name}
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-full border",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {active ? <Check className="size-2.5" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit || submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
            {isEditing ? "Save group" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
