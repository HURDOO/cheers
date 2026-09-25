(() => {
  const measurementId = window.__CHEERS_GA_MEASUREMENT_ID__;
  if (window.location.hostname !== "cheers.app.hurdoo.kr") return;
  if (typeof measurementId !== "string" || !/^G-[A-Z0-9]+$/.test(measurementId)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
})();
