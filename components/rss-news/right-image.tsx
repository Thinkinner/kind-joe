export default function CardThree() {
  return (
    <div className="w-full flex flex-col justify-start items-start gap-4 p-4 rounded-2xl overflow-hidden">
      {/* Image + main headline */}
      <div className="w-full flex flex-col gap-2.5">
        <div className="w-full rounded overflow-hidden">
          <div className="relative w-full aspect-[3/2]">
            <img
              className="absolute inset-0 w-full h-full object-cover"
              src="https://placehold.co/516x344"
              alt="Main news image"
            />
          </div>
        </div>

        <div className="w-full text-red-700 text-2xl font-bold font-['Poppins'] underline leading-snug">
          Putin clenching fists 'in agony' as bulging veins spark health rumors...
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-300 w-full my-2" />

      {/* Related links */}
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