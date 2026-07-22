import { redirect } from "next/navigation";

export default function AdminJoeFromSloPostsPage() {
  redirect("/admin/posts?feed=joefromslo");
}
