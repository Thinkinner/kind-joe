import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="min-h-screen flex items-center justify-center">
      <div
        className="flex-grow flex flex-col items-center justify-center 
      bg-white text-gray-900 
      dark:bg-[#0d0d0d] dark:text-white 
      relative p-6 text-center transition-colors"
      >
        {/* Background ambient glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
        w-[500px] h-[500px] 
        bg-red-400/20 blur-[100px] rounded-full pointer-events-none
        dark:bg-red-900/10"
        />

        <div className="relative z-10 flex flex-col items-center">
          {/* Large 404 Text */}
          <h1
            className="text-[120px] md:text-[180px] font-black leading-none select-none tracking-tighter
          text-gray-200 dark:text-[#1a1a1a]"
          >
            404
          </h1>

          {/* Overlay Content */}
          <div className="mt-[-20px] md:mt-[-40px] space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Page Not Found
            </h2>

            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto leading-relaxed">
              Oops! The page you are looking for seems to have wandered off.
              Let's get you back on track.
            </p>

            <div className="pt-4">
              <a href="/">
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white 
                px-8 py-6 rounded-full text-lg font-semibold transition-all
                shadow-lg shadow-red-500/20 hover:scale-105 hover:shadow-red-500/40
                dark:shadow-red-900/20 dark:hover:shadow-red-900/40 cursor-pointer"
                >
                  Return Home
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
