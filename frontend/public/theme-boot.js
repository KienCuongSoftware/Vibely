(function () {
  try {
    var stored = localStorage.getItem("vibely:appearance");
    var theme = "light";
    if (stored === "light") theme = "light";
    else if (stored === "dark") theme = "dark";
    else if (stored === "system") {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.dataset.vibelyTheme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.dataset.vibelyTheme = "light";
  }
})();
