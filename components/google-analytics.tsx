'use client'

import { Suspense, useEffect } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

function GoogleAnalyticsLogic() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!GA_ID) return
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '')

    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('config', GA_ID, {
        page_path: url,
      })
    }
  }, [pathname, searchParams])

  if (!GA_ID) return null

  return (
    <>
      {/* This is the async script you pasted, but "Next-ified" */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  )
}

export default function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsLogic />
    </Suspense>
  )
}
