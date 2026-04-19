function initHomeSearch() {
  const form = document.getElementById("homeSearchForm");
  const keywordInput = document.getElementById("homeSearchKeyword");
  const locationSelect = document.getElementById("homeSearchLocation");

  if (!form || !keywordInput || !locationSelect) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const query = keywordInput.value.trim();
    const location = locationSelect.value.trim();

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("location", location);

    const target = params.toString() ? `trabajos.html?${params.toString()}` : "trabajos.html";
    window.location.href = target;
  });
}

document.addEventListener("DOMContentLoaded", initHomeSearch);
