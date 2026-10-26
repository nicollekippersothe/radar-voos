import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// Google Analytics 4. Só carrega se NEXT_PUBLIC_GA_ID estiver definido (ex.: G-XXXXXXXXXX).
// A navegação entre páginas é contada sozinha pela medição otimizada do GA4.
export function Analytics() {
  if (!GA_ID || !/^G-[A-Z0-9]+$/.test(GA_ID)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
