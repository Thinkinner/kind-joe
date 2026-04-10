import { redirect } from "next/navigation";

export default function AdminVenturaPostsPage() {
  redirect("/admin/posts?feed=ventura");
}
