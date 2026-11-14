import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

const gradients = [
  "from-indigo-500 to-violet-500",
  "from-fuchsia-500 to-pink-500",
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-red-500",
];

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

export function UserAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const gradient = gradients[hash(name) % gradients.length] ?? gradients[0];

  return (
    <Avatar className={cn("size-10 ring-2 ring-background", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} referrerPolicy="no-referrer" /> : null}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br text-white",
          gradient,
          fallbackClassName,
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function AvatarStack({
  users,
  limit = 4,
  size = "size-8",
}: {
  users: Array<{ id: string; name: string; avatarUrl?: string | null }>;
  limit?: number;
  size?: string;
}) {
  const shown = users.slice(0, limit);
  const rest = users.length - shown.length;

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((user) => (
        <UserAvatar
          key={user.id}
          name={user.name}
          avatarUrl={user.avatarUrl}
          className={cn(size, "ring-2 ring-card")}
          fallbackClassName="text-[10px]"
        />
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground ring-2 ring-card",
            size,
          )}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
