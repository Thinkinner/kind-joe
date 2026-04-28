import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import type { SocialPostView } from "@/lib/social/queries";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function createdAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / min))}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}

export function SocialPostCard({
  post,
  dark = true,
}: {
  post: SocialPostView;
  dark?: boolean;
}) {
  const imageAttachment = post.attachments.find((a) => a.type === "image");
  const linkAttachment = post.attachments.find((a) => a.type === "link");

  return (
    <article
      className={
        dark
          ? "border-b border-white/10 bg-transparent px-5 py-4"
          : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      <div className="mb-2 flex items-center gap-2 text-xs text-white/60">
        <Avatar className={dark ? "size-8 border border-white/20" : "size-8 border border-slate-200"}>
          {post.author.image ? <AvatarImage src={post.author.image} alt="" /> : null}
          <AvatarFallback className={dark ? "bg-white/10 text-[10px] text-white" : "text-[10px]"}>
            {initials(post.author.name)}
          </AvatarFallback>
        </Avatar>
        <span className={dark ? "font-semibold text-white" : "font-semibold text-slate-900"}>
          {post.author.name}
        </span>
        <span>·</span>
        <span>{createdAgo(post.createdAt)}</span>
      </div>

      <p className={dark ? "whitespace-pre-wrap text-[15px] leading-6 text-white/90" : "whitespace-pre-wrap text-[15px] leading-6 text-slate-800"}>
        {post.body}
      </p>

      {imageAttachment ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
          <Image
            src={optimizeCloudinaryUrl(imageAttachment.url, { width: 1200 })}
            alt=""
            width={1200}
            height={675}
            className="h-auto w-full object-cover"
          />
        </div>
      ) : null}

      {linkAttachment ? (
        <a
          href={linkAttachment.url}
          target="_blank"
          rel="noreferrer"
          className={
            dark
              ? "mt-3 block rounded-xl border border-white/15 bg-white/[0.03] p-3 hover:bg-white/[0.05]"
              : "mt-3 block rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
          }
        >
          <div className={dark ? "text-xs uppercase tracking-wide text-white/50" : "text-xs uppercase tracking-wide text-slate-500"}>
            {linkAttachment.siteName || "Link"}
          </div>
          <div className={dark ? "mt-1 text-sm font-semibold text-white" : "mt-1 text-sm font-semibold text-slate-900"}>
            {linkAttachment.title || linkAttachment.url}
          </div>
          {linkAttachment.description ? (
            <p className={dark ? "mt-1 text-xs text-white/65" : "mt-1 text-xs text-slate-600"}>
              {linkAttachment.description}
            </p>
          ) : null}
        </a>
      ) : null}

      <div className={dark ? "mt-4 border-t border-white/10 pt-3" : "mt-4 border-t border-slate-100 pt-3"}>
        <Link
          href={`/posts/${post.id}`}
          className={
            dark
              ? "inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white"
              : "inline-flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900"
          }
        >
          <MessageCircle size={16} />
          <span>{post.commentCount.toLocaleString()}</span>
        </Link>
      </div>
    </article>
  );
}
