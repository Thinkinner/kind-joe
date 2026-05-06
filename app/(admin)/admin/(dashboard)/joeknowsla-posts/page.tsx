import { redirect } from "next/navigation";

export default function AdminJoeKnowsLaPostsPage() {
  redirect("/admin/posts?feed=joeknowsla");
}
