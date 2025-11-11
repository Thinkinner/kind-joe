export default function CardTwo() {
  return (
    <div className="w-full flex flex-col justify-start items-start gap-4 p-4 rounded-2xl overflow-hidden">
      {/* Image + headline */}
      <div className="w-full flex items-start gap-2.5">
        <img
          className="w-36 h-36 object-cover shrink-0 rounded"
          src="https://placehold.co/148x148"
          alt="News thumbnail"
        />
        <div className="flex-1 min-w-0 text-blue-950 text-xl font-bold font-['Poppins'] underline leading-snug">
          South Park’ Creators Break Silence on Why This Season Keeps Slamming Trump
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-300 w-full my-2" />

      {/* Links */}
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
