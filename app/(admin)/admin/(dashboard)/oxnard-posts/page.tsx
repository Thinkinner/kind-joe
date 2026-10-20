import { redirect } from "next/navigation";

export default function AdminOxnardPostsPage() {
  redirect("/admin/posts?feed=oxnard");
}
