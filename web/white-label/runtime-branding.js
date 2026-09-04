(function () {
  const business = window.WHITE_LABEL_BUSINESS;
  if (!business) return;

  const apply = () => {
    document.documentElement.style.setProperty("--business-primary", business.primaryColor || "#111111");
    document.documentElement.style.setProperty("--business-accent", business.accentColor || "#ffffff");
    document.documentElement.style.setProperty("--business-background", business.backgroundColor || "#ffffff");

    document.title = business.name || document.title;

    document.querySelectorAll("[data-business-name]").forEach((el) => {
      el.textContent = business.name || "";
    });

    document.querySelectorAll("[data-business-tagline]").forEach((el) => {
      el.textContent = business.tagline || "";
    });

    document.querySelectorAll("[data-business-logo]").forEach((img) => {
      if (business.logoUrl) {
        img.src = business.logoUrl;
        img.alt = business.name || "Business logo";
      }
    });

    document.querySelectorAll("[data-feature]").forEach((el) => {
      const key = el.getAttribute("data-feature");
      if (key && business.features && business.features[key] === false) {
        el.hidden = true;
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
