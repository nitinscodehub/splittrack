"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BellRing,
  Camera,
  Check,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Save,
  ShieldAlert,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { apiFetch } from "@/lib/client";
import { formatDate } from "@/lib/date";

export interface SettingsUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  upiId: string | null;
  notifyExpense: boolean;
  notifySettlement: boolean;
  notifyFriendRequest: boolean;
  notifyDailyCreditor: boolean;
  remindersOptOut: boolean;
  userIdChangedAt: string | null;
  emailVerified: string | null;
}

interface UpdateResponse {
  user: SettingsUser;
}

async function fileToAvatarDataUrl(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Could not read that photo. Try a JPG, PNG or WebP.");
  }

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not read this photo.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 320, 320);
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      320,
      320,
    );

    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    bitmap.close();
  }
}

export function SettingsClient({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const [profile, setProfile] = useState({
    name: user.name,
    userId: user.userId,
    upiId: user.upiId ?? "",
    userIdChangedAt: user.userIdChangedAt,
  });
  const [notifications, setNotifications] = useState({
    notifyExpense: user.notifyExpense,
    notifySettlement: user.notifySettlement,
    notifyFriendRequest: user.notifyFriendRequest,
    notifyDailyCreditor: user.notifyDailyCreditor,
    remindersOptOut: user.remindersOptOut,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const userIdLocked = Boolean(profile.userIdChangedAt);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const response = await apiFetch<UpdateResponse>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: profile.name,
          userId: profile.userId,
          upiId: profile.upiId,
        }),
      });
      setProfile((previous) => ({
        ...previous,
        userId: response.user.userId,
        userIdChangedAt: response.user.userIdChangedAt,
        upiId: response.user.upiId ?? "",
      }));
      toast.success("Profile updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Photo is too large. Choose one under 8 MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const image = await fileToAvatarDataUrl(file);
      const response = await apiFetch<{ avatarUrl: string }>("/api/me/avatar", {
        method: "POST",
        body: JSON.stringify({ image }),
      });
      setAvatarUrl(response.avatarUrl);
      toast.success("Profile photo updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    if (!avatarUrl) return;
    setUploadingAvatar(true);
    try {
      await apiFetch("/api/me/avatar", { method: "DELETE" });
      setAvatarUrl(null);
      toast.success("Profile photo removed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveNotifications() {
    setSavingNotifications(true);
    try {
      await apiFetch<UpdateResponse>("/api/me", {
        method: "PATCH",
        body: JSON.stringify(notifications),
      });
      toast.success("Notification preferences saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your preferences.");
    } finally {
      setSavingNotifications(false);
    }
  }

  async function changePassword() {
    if (password.newPassword !== password.confirm) {
      toast.error("New passwords don't match.");
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch("/api/me/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: password.currentPassword,
          newPassword: password.newPassword,
        }),
      });
      setPassword({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password changed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change your password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await apiFetch("/api/me", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      toast.success("Account deleted", {
        description: "Your identity was removed. Shared history stays available to your friends.",
      });
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete your account.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Tabs defaultValue="profile" className="space-y-4">
      <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
        <TabsTrigger value="profile">
          <UserRound className="mr-1.5 size-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <BellRing className="mr-1.5 size-4" />
          Reminders
        </TabsTrigger>
        <TabsTrigger value="security">
          <KeyRound className="mr-1.5 size-4" />
          Security
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserRound className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold">Public profile</h2>
                <p className="text-xs text-muted-foreground">
                  How friends find you and share bills with you.
                </p>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <UserAvatar
                name={profile.name || user.name}
                avatarUrl={avatarUrl}
                className="size-20 ring-4 ring-background"
                fallbackClassName="text-xl"
              />
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Profile photo</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Friends see this on bills, payments and friend lists. JPG, PNG or WebP.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Camera className="size-3.5" />
                    )}
                    {avatarUrl ? "Change photo" : "Upload photo"}
                  </Button>
                  {avatarUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeAvatar}
                      disabled={uploadingAvatar}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  We crop it square and keep it small automatically.
                </p>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadAvatar}
                className="sr-only"
                aria-label="Choose profile photo"
              />
            </div>

            <div className="mt-5 grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  value={profile.name}
                  onChange={(event) =>
                    setProfile((previous) => ({ ...previous, name: event.target.value }))
                  }
                  maxLength={60}
                  autoComplete="name"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-user-id">Public ID</Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      @
                    </span>
                    <Input
                      id="profile-user-id"
                      value={profile.userId}
                      onChange={(event) =>
                        setProfile((previous) => ({
                          ...previous,
                          userId: event.target.value.toLowerCase(),
                        }))
                      }
                      className="pl-8"
                      disabled={userIdLocked}
                      pattern="[a-z0-9_]{3,24}"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {userIdLocked
                      ? "Your public ID can only be changed once. It is locked now."
                      : "Lowercase letters, numbers and underscores. You can change this once."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="profile-email" value={user.email} disabled className="pl-9" />
                  </div>
                  <p className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-300">
                    <Check className="size-3" />
                    Verified {user.emailVerified ? formatDate(user.emailVerified) : ""}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-upi">UPI ID (optional)</Label>
                <div className="relative">
                  <Wallet className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profile-upi"
                    value={profile.upiId}
                    onChange={(event) =>
                      setProfile((previous) => ({ ...previous, upiId: event.target.value }))
                    }
                    placeholder="yourname@bank"
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Used to make a payment QR when a friend pays you. Your UPI ID is only visible to
                  friends with an open balance.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save profile
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-5 text-white">
                <div className="text-xs font-bold uppercase tracking-wide text-white/70">
                  Your SplitTrack identity
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <UserAvatar
                    name={profile.name || user.name}
                    avatarUrl={avatarUrl}
                    className="size-12 ring-white/40"
                    fallbackClassName="text-sm"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg font-bold">
                      {profile.name || user.name}
                    </div>
                    <div className="truncate text-xs text-white/75">@{profile.userId}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Email</span>
                  <span className="truncate font-medium">{user.email}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">UPI</span>
                  <span className="truncate font-medium">{profile.upiId || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-medium">
                    {user.emailVerified ? formatDate(user.emailVerified) : "Today"}
                  </span>
                </div>
                <p className="rounded-xl bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  Share your ID <span className="font-semibold text-foreground">@{profile.userId}</span>{" "}
                  so friends can find you without needing your email.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="notifications">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <BellRing className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold">Notifications & reminders</h2>
              <p className="text-xs text-muted-foreground">
                Choose what lands in your inbox and when.
              </p>
            </div>
          </div>

          <Separator className="my-5" />

          <div className="space-y-3">
            <PreferenceRow
              title="New bills"
              description="Email when someone adds a bill that includes you."
              checked={notifications.notifyExpense}
              onCheckedChange={(checked) =>
                setNotifications((previous) => ({ ...previous, notifyExpense: checked }))
              }
            />
            <PreferenceRow
              title="Payments"
              description="Email when someone marks a payment or confirms yours."
              checked={notifications.notifySettlement}
              onCheckedChange={(checked) =>
                setNotifications((previous) => ({ ...previous, notifySettlement: checked }))
              }
            />
            <PreferenceRow
              title="Friend requests"
              description="Email when someone asks to connect."
              checked={notifications.notifyFriendRequest}
              onCheckedChange={(checked) =>
                setNotifications((previous) => ({ ...previous, notifyFriendRequest: checked }))
              }
            />
            <PreferenceRow
              title="Money you will get"
              description="Get a daily email of payments coming to you."
              checked={notifications.notifyDailyCreditor}
              onCheckedChange={(checked) =>
                setNotifications((previous) => ({ ...previous, notifyDailyCreditor: checked }))
              }
            />
          </div>

          <Separator className="my-5" />

          <p className="mb-4 rounded-xl bg-muted/40 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
            Daily payment summaries are sent at{" "}
            <span className="font-semibold text-foreground">9:00 AM IST</span>. Friend reminders stay
            limited to one per 24 hours.
          </p>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  Pause all reminder emails
                  {notifications.remindersOptOut ? (
                    <Badge variant="warning">Paused</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Bill and payment emails still work. Daily and manual reminders stop.
                </p>
              </div>
              <Switch
                checked={notifications.remindersOptOut}
                onCheckedChange={(checked) =>
                  setNotifications((previous) => ({ ...previous, remindersOptOut: checked }))
                }
                aria-label="Pause all reminder emails"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={saveNotifications} disabled={savingNotifications}>
              {savingNotifications ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save preferences
            </Button>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold">Change password</h2>
                <p className="text-xs text-muted-foreground">Use at least 8 characters with a number.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={password.currentPassword}
                  onChange={(event) =>
                    setPassword((previous) => ({ ...previous, currentPassword: event.target.value }))
                  }
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password.newPassword}
                  onChange={(event) =>
                    setPassword((previous) => ({ ...previous, newPassword: event.target.value }))
                  }
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={password.confirm}
                  onChange={(event) =>
                    setPassword((previous) => ({ ...previous, confirm: event.target.value }))
                  }
                  autoComplete="new-password"
                />
              </div>
              <Button
                onClick={changePassword}
                disabled={
                  savingPassword ||
                  !password.currentPassword ||
                  password.newPassword.length < 8 ||
                  !password.confirm
                }
                className="w-full"
              >
                {savingPassword ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Lock className="size-4" />
                )}
                Update password
              </Button>
            </div>
          </Card>

          <Card className="border-destructive/25 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <ShieldAlert className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-destructive">Delete account</h2>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              <p>
                Deleting your account hides your name, email, public ID and photo. Your share of past
                bills stays in history as a deleted member so your friends&apos; balances stay correct.
              </p>
              <ul className="list-inside list-disc space-y-1 text-xs">
                <li>Waiting payments and friendships are removed</li>
                <li>Your history entries stay, with your name hidden</li>
                <li>You will be signed out everywhere</li>
              </ul>
            </div>

            <Button
              variant="destructive"
              className="mt-5 w-full"
              onClick={() => {
                setDeletePassword("");
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="size-4" />
              Delete my account
            </Button>
          </Card>
        </div>
      </TabsContent>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Enter your password to confirm. This hides your identity and signs you out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-password">Password</Label>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteAccount}
              disabled={deleting || !deletePassword}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

function PreferenceRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
    </div>
  );
}
