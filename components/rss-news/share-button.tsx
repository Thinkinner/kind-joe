'use client';

import { useEffect, useState } from 'react';
import { FaFacebookSquare, FaTwitter, FaLinkedin, FaWhatsapp, FaTelegramPlane, FaInstagram, FaLink } from 'react-icons/fa';
import { toast } from 'sonner';

export default function ShareIcons() {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrl(window.location.href);
    }
  }, []);

  const popup = (shareUrl: string | URL | undefined) => {
    const w = 600;
    const h = 500;
    const left = window.innerWidth / 2 - w / 2;
    const top = window.innerHeight / 2 - h / 2;

    window.open(
      shareUrl,
      '_blank',
      `width=${w},height=${h},top=${top},left=${left},scrollbars=yes`
    );
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const iconColor = "#4B5563"; // Gray-600 for uniform minimal styling
  const iconSize = 22; // Smaller minimal size

  const shareLinks = [
    {
      name: 'Facebook',
      icon: <FaFacebookSquare size={iconSize} color={iconColor} />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      name: 'X (Twitter)',
      icon: <FaTwitter size={iconSize} color={iconColor} />,
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
    },
    {
      name: 'LinkedIn',
      icon: <FaLinkedin size={iconSize} color={iconColor} />,
      url: `https://www.linkedin.com/shareArticle?url=${encodeURIComponent(url)}`,
    },
    {
      name: 'WhatsApp',
      icon: <FaWhatsapp size={iconSize} color={iconColor} />,
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(url)}`,
    },
    {
      name: 'Telegram',
      icon: <FaTelegramPlane size={iconSize} color={iconColor} />,
      url: `https://t.me/share/url?url=${encodeURIComponent(url)}`,
    },
    {
      name: 'Instagram',
      icon: <FaInstagram size={iconSize} color={iconColor} />,
      url: null,
      custom: () => toast.error('Instagram does not support link sharing'),
    },
  ];

  return (
    <div className="flex gap-3 items-center">
      {shareLinks.map((item, i) => (
        <button
          key={i}
          onClick={() => (item.url ? popup(item.url) : item.custom?.())}
          className="hover:opacity-70 transition cursor-pointer"
          title={item.name}
        >
          {item.icon}
        </button>
      ))}

      {/* Copy link button */}
      <button
        onClick={copyLink}
        className="hover:opacity-70 transition"
        title="Copy Link"
      >
        <FaLink size={iconSize} color={iconColor} />
      </button>
    </div>
  );
}