import Left_Image from "@/components/rss-news/left-image";
import Right_Image from "@/components/rss-news/right-image";
import Main_Image from "@/components/rss-news/main-image";

export default function NewsPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-start bg-gray-50 py-10 px-4">
      <h1 className="text-3xl font-bold font-['Poppins'] text-gray-900 mb-8">
        Daily Highlights
      </h1>

      {/* 
        Full-page 3-column layout:
        - Fills viewport height (min-h-screen)
        - Mobile: flex-col (middle column first)
        - Desktop: grid with custom column widths
        - Middle column = larger (1.5fr)
      */}
      <div
        className="
          flex flex-col gap-8 flex-grow
          md:grid md:grid-cols-2
          lg:grid-cols-[1fr_1.5fr_1fr]
          md:gap-x-0 md:gap-y-0
          w-full
        "
      >
        {/* LEFT COLUMN (mobile second) */}
        <div
          className="
            order-2 md:order-1
            flex flex-col gap-6 items-stretch
            md:border-r md:border-neutral-300 md:pr-6
          "
        >
          <h1>left</h1>
          <Left_Image />
          <Right_Image />
          <Main_Image />
        </div>

        {/* MIDDLE COLUMN (mobile first, bigger width on desktop) */}
        <div
          className="
            order-1 md:order-2
            flex flex-col gap-6 items-stretch
            md:border-r md:border-neutral-300 md:px-6
          "
        >
          <h1>middle</h1>
          <Main_Image />
          <Right_Image />
          <Left_Image />
        </div>

        {/* RIGHT COLUMN (mobile third)*/}
        <div
          className="
            order-3 md:order-3
            flex flex-col gap-6 items-stretch
            md:pl-6
          "
        >
          <h1>right</h1>
          <Left_Image />
          <Main_Image />
          <Right_Image />
        </div>
      </div>
    </div>
  );
}
