import React from 'react';
import { Users, Heart, Coffee, Star } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="w-full animate-fade-in pb-20">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 px-6 overflow-hidden">
        {/* Video Background */}
        <video
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="/featuredvideo.mp4" // Path to your video in the public folder
          autoPlay
          loop
          muted
          playsInline // Important for mobile autoplay
        />
        {/* Overlay to improve text readability */}
        <div className="absolute inset-0 bg-black opacity-40 z-0"></div>


        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10"> {/* Added relative z-10 to bring content above video */}
          <div className="relative z-10">
            <span className="inline-block py-1 px-3 rounded-full bg-indigo-50 text-indigo-600 text-sm font-semibold mb-6">
              Our Story
            </span>
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight"> {/* Changed text-slate-900 to text-white for better contrast */}
              We believe in <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-300"> {/* Adjusted gradient for better contrast */}
                kindness first.
              </span>
            </h1>
            <p className="text-lg text-indigo-100 mb-8 leading-relaxed max-w-lg"> {/* Changed text-slate-600 to text-indigo-100 */}
              KindJoe started with a simple idea: the internet needs more empathy.
              We are a collective of writers, thinkers, and creators dedicated to sharing
              stories that uplift, inform, and connect us all.
            </p>
          </div>
          <div className="relative lg:h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl shadow-indigo-100">
            <img
              src="https://picsum.photos/800/800"
              alt="Team working together"
              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Rest of your page content */}
      {/* Stats/Values Section */}
      <section className="py-20 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Heart size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Compassion</h3>
              <p className="text-slate-600">Every story we tell is rooted in empathy and understanding for the human experience.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Coffee size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Community</h3>
              <p className="text-slate-600">We are building a safe space where diverse voices are heard, respected, and celebrated.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Star size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Quality</h3>
              <p className="text-slate-600">We value depth over breadth, ensuring every piece of content adds real value to your day.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Meet the Kindness Crew</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            The people behind the screens who work tirelessly to bring you the best content.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="group">
              <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-slate-100 relative">
                <img
                  src={`https://picsum.photos/400/400?random=${item + 10}`}
                  alt="Team member"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 grayscale group-hover:grayscale-0"
                />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Alex Johnson</h3>
              <p className="text-sm text-indigo-600 font-medium mb-2">Editor in Chief</p>
              <p className="text-sm text-slate-500 line-clamp-2">
                Loves coffee, hiking, and finding the good in every situation.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto bg-indigo-600 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Want to join our mission?</h2>
            <p className="text-indigo-100 mb-8 max-w-xl mx-auto text-lg">
              We are always looking for contributors who share our values. If you have a story to tell, we want to hear it.
            </p>
            <button className="bg-white text-indigo-600 px-8 py-4 rounded-full font-bold hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/20">
              Become a Contributor
            </button>
          </div>
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-violet-500 rounded-full blur-3xl opacity-50"></div>
        </div>
      </section>
    </div>
  );
};

export default About;