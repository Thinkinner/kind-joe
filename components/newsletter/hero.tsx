import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="relative isolate overflow-hidden h-full"> {/* Removed bg-slate-900 and added h-screen for video */}
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/featuredvideo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Optional: Overlay for better text readability */}
      <div className="absolute inset-0 bg-black opacity-50"></div> 

      {/* Hero Content - make sure it's above the video and overlay */}
      <div className="relative z-10 flex items-center justify-center h-full px-6 py-24 sm:py-32 lg:px-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Stay Connected to What Matters
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-300">
              Curated stories, local updates, and positive vibes. Choose the
              newsletters that fit your life and get them delivered straight to
              your inbox.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;