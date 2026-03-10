import Image from "next/image";
import Link from "next/link";

async function getPosts() {
  const managerUrl = process.env.NEXT_PUBLIC_ADMIN_API || "";

  // Clean up the URL to ensure it's valid
  const apiUrl = managerUrl.endsWith("/")
    ? `${managerUrl}posts`
    : `${managerUrl}/posts`;

  const res = await fetch(apiUrl, {
    // Changed to no-store so new posts show up instantly without revalidate logic
    cache: "no-store",
  });

  if (!res.ok) return [];
  return res.json();
}

export default async function LikeShop() {
  const allPosts = await getPosts();

  return (
    <main className="max-w-4xl mx-auto">
      <header className="py-10 text-center border-b mb-10">
        <h1 className="font-serif text-4xl italic font-bold tracking-tight">
          THE KIND JOE
        </h1>
      </header>

      <div className="grid grid-cols-2">
        {allPosts.map((post: any) => {
          // THE 4:5 THING: This AI-crops the image to 4:5 automatically
          const optimizedImage = post.imageUrl.replace(
            "/upload/",
            "/upload/ar_4:5,c_fill,g_auto,w_800/",
          );

          return (
            <Link
              key={post.id}
              href={post.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              // CHANGED: aspect-square -> aspect-[4/5]
              className="aspect-[4/5] relative group overflow-hidden bg-gray-50 border border-gray-100"
            >
              <Image
                src={optimizedImage}
                fill
                alt=""
                className="object-cover group-hover:scale-105 transition duration-700 ease-in-out"
                sizes="(max-width: 768px) 33vw, 400px"
              />

              {/* NYT Style Hover */}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white/90 px-3 py-1.5 text-[10px] font-bold shadow-sm uppercase tracking-tighter">
                  Read Story
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
