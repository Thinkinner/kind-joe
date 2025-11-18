import React, { useEffect, useState } from 'react';
import { NewsCard } from '@/components/ventura-county/news-card';
import { SocialWidget } from '@/components/ventura-county/social-widget';
import { SidebarList } from '@/components/ventura-county/sidebar-list';
import { Article } from '@/types/article';
import { Menu, Search } from 'lucide-react';

const App: React.FC = () => {
  const [mainArticles, setMainArticles] = useState<Article[]>([]);
  const [sidebarArticles, setSidebarArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchNewsData();
        setMainArticles(data.mainArticles);
        setSidebarArticles(data.sidebarArticles);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-news-red border-t-transparent rounded-full animate-spin"></div>
            <div className="text-news-blue font-poppins font-medium animate-pulse">Curating your feed with Gemini AI...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      {/* Navigation Bar Placeholder */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 md:px-8 py-4 shadow-sm">
        <div className="max-w-[1440px] mx-auto flex justify-between items-center">
             <div className="flex items-center gap-4">
                <Menu className="w-6 h-6 cursor-pointer hover:text-news-red transition-colors" />
                <div className="text-2xl font-black font-poppins tracking-tighter text-black">
                    THE<span className="text-news-red">DAILY</span>
                </div>
             </div>
             <div className="hidden md:flex gap-6 font-poppins text-sm font-semibold text-gray-600">
                <a href="#" className="hover:text-news-red transition-colors">Politics</a>
                <a href="#" className="hover:text-news-red transition-colors">Technology</a>
                <a href="#" className="hover:text-news-red transition-colors">Entertainment</a>
                <a href="#" className="hover:text-news-red transition-colors">Sports</a>
             </div>
             <Search className="w-5 h-5 cursor-pointer hover:text-news-red transition-colors" />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-[1440px] mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row justify-start items-start gap-8">
          
          {/* Left Column - Main News Grid */}
          {/* Replaced w-[888px] with flex-1 and max-width constraints for large screens */}
          <div className="flex-1 w-full lg:w-[65%] xl:w-[70%] flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10">
              {mainArticles.map((article, index) => (
                <NewsCard key={index} article={article} />
              ))}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          {/* Replaced w-[462px] with w-full on mobile, fixed width on large desktop if needed, or percentage */}
          <div className="w-full lg:w-[35%] xl:w-[30%] lg:max-w-[420px] flex flex-col gap-8 sticky top-24">
            
            {/* Social Widget */}
            <SocialWidget />

            {/* Sidebar News List */}
            <div className="bg-white p-4 rounded-md border border-neutral-200 shadow-sm">
                <div className="mb-4 pb-2 border-b-2 border-black">
                    <h3 className="text-lg font-bold font-poppins">Trending Now</h3>
                </div>
                <SidebarList articles={sidebarArticles} />
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-12 mt-12 px-6">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-xl font-bold font-poppins">THE<span className="text-news-red">DAILY</span></div>
            <div className="text-gray-400 text-sm font-poppins">© 2025 FlexyNews Aggregator. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default App;