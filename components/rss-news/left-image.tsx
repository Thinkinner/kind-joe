export default function CardOne() {
  return (
    <div className="w-full flex flex-col justify-start items-start gap-2.5 p-4 rounded-2xl overflow-hidden">
      {/* Top section: text + image */}
      <div className="flex justify-between items-start gap-2.5 w-full">
        <div className="flex-1 min-w-0 leading-snug">
          <span className="text-black text-xl font-bold font-['Poppins']">P</span>
          <span className="text-black text-xl font-bold font-['Poppins'] underline">
            resident&apos;s enforcer inspires fear and vexation across Washington...
          </span>
        </div>
        <img
          className="w-auto h-auto object-cover shrink-0 rounded"
          src="https://placehold.co/148x148"
          alt="News image"
        />
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-300 w-full my-2" />

      {/* Headlines */}
      <a
        href="#"
        className="w-full text-black text-base font-bold font-['Poppins'] underline hover:opacity-90"
      >
        South Park’ Creators Break Silence on Why This Season Keeps Slamming Trump
      </a>
      <a
        href="#"
        className="w-full text-black text-base font-bold font-['Poppins'] underline hover:opacity-90"
      >
        FEDERALIST Boss Savages &apos;Weak and Rudderless&apos; Don in Scathing Rant
      </a>
      <a
        href="#"
        className="w-full text-black text-base font-bold font-['Poppins'] underline hover:opacity-90"
      >
        TRAVEL HELL DAY 41: FAA &apos;Effectively Prohibits&apos; Private Jets at Major Airports...
      </a>

      {/* Bottom divider */}
      <div className="border-t border-neutral-300 w-full mt-2" />
    </div>
  );
}