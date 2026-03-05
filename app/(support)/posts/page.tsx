import Image from "next/image";
import Link from "next/link";

async function getPosts() {
  const managerUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL;
  
  // We fetch from the Manager's API
  const res = await fetch(`${managerUrl}/api/posts`, { 
    // This tells Next.js to cache the data until we manually revalidate it
    next: { tags: ['posts-grid'] } 
  });

  if (!res.ok) return [];
  return res.json();
}

export default async function LikeShop() {
  const allPosts = await getPosts();

  return (
    <main className="max-w-4xl mx-auto p-4">
      <header className="py-10 text-center border-b mb-10">
        <h1 className="font-serif text-4xl italic font-bold tracking-tight">The Shop</h1>
      </header>

      <div className="grid grid-cols-3 gap-1 md:gap-4">
        {allPosts.map((post: any) => (
          <Link
            key={post.id} 
            href={post.destinationUrl} 
            target="_blank"
            rel="noopener noreferrer"
            className="aspect-square relative group overflow-hidden bg-gray-50 border"
          >
            <Image 
              src={post.imageUrl} 
              fill 
              alt="" 
              className="object-cover group-hover:scale-105 transition duration-700 ease-in-out" 
              sizes="(max-width: 768px) 33vw, 300px"
            />
            {/* NYT Style Hover */}
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <span className="bg-white/90 px-3 py-1 text-[10px] font-bold shadow-sm">READ STORY</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}