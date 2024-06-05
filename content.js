if (typeof controlPanelInjected === "undefined") {
  let controlPanelInjected = false;
  let controlPanelVisible = false;
  let currentUrl = window.location.hostname;
  let mediaSettings = {
    images: true,
    backgrounds: true,
    videos: true,
    svgs: true,
    greyscale: false,
  };

  function injectControlPanel() {
    return new Promise((resolve, reject) => {
      if (document.getElementById("curtain-control-panel")) {
        resolve();
        return;
      }

      const controlPanelContainer = document.createElement("div");
      controlPanelContainer.id = "curtain-control-panel-container";

      fetch(chrome.runtime.getURL("control-panel.html"))
        .then((response) => response.text())
        .then((html) => {
          controlPanelContainer.innerHTML = html;
          document.body.appendChild(controlPanelContainer);
          attachStyles();
          attachEventListeners();
          restoreSettings().then(() => handleMediaSettings());
          setTimeout(resolve, 50);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function attachStyles() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("control-panel.css");
    document.head.appendChild(link);
  }

  function attachEventListeners() {
    const toggleImages = document.getElementById("toggle-images");
    const toggleBackgrounds = document.getElementById("toggle-backgrounds");
    const toggleVideos = document.getElementById("toggle-videos");
    const toggleSvgs = document.getElementById("toggle-svgs");
    const toggleGreyscale = document.getElementById("toggle-greyscale");
    const closePanel = document.getElementById("curtain-close-panel");

    if (
      toggleImages &&
      toggleBackgrounds &&
      toggleVideos &&
      toggleSvgs &&
      toggleGreyscale &&
      closePanel
    ) {
      toggleImages.addEventListener("change", handleCheckboxChange);
      toggleBackgrounds.addEventListener("change", handleCheckboxChange);
      toggleVideos.addEventListener("change", handleCheckboxChange);
      toggleSvgs.addEventListener("change", handleCheckboxChange);
      toggleGreyscale.addEventListener("change", handleCheckboxChange);
      closePanel.addEventListener("click", function () {
        fadeOutPanel();
        chrome.runtime.sendMessage({
          action: "updatePanelState",
          isVisible: false,
        });
      });
    } else {
      console.error(
        "Control panel elements not found for attaching event listeners."
      );
    }
  }

  function addDocumentClickListener() {
    document.addEventListener("click", handleDocumentClick);
  }

  function removeDocumentClickListener() {
    document.removeEventListener("click", handleDocumentClick);
  }

  function handleDocumentClick(event) {
    const panel = document.getElementById("curtain-control-panel");
    if (!panel) return;

    const clickedOutsidePanel = !panel.contains(event.target);
    const isVideoElement = event.target.tagName === "VIDEO";

    if (clickedOutsidePanel && !isVideoElement && controlPanelVisible) {
      fadeOutPanel();
      chrome.runtime.sendMessage({
        action: "updatePanelState",
        isVisible: false,
      });
    }
  }

  function fadeInPanel() {
    const panel = document.getElementById("curtain-control-panel");
    if (panel) {
      panel.style.display = "block";
      setTimeout(() => {
        panel.classList.add("visible");
        addDocumentClickListener(); // Add listener when panel is visible
      }, 50);
      controlPanelVisible = true;
    }
  }

  function fadeOutPanel() {
    const panel = document.getElementById("curtain-control-panel");
    if (panel) {
      panel.classList.remove("visible");
      panel.addEventListener("transitionend", function handleTransitionEnd() {
        panel.style.display = "none";
        panel.removeEventListener("transitionend", handleTransitionEnd);
        removeDocumentClickListener(); // Remove listener when panel is hidden
      });
      controlPanelVisible = false;
    }
  }

  function handleCheckboxChange() {
    mediaSettings.images = document.getElementById("toggle-images").checked;
    mediaSettings.backgrounds =
      document.getElementById("toggle-backgrounds").checked;
    mediaSettings.videos = document.getElementById("toggle-videos").checked;
    mediaSettings.svgs = document.getElementById("toggle-svgs").checked;
    mediaSettings.greyscale =
      document.getElementById("toggle-greyscale").checked;
    saveSettings();
    handleMediaSettings();
  }

  function handleMediaSettings() {
    toggleImages(mediaSettings.images);
    toggleBackgrounds(mediaSettings.backgrounds);
    toggleMedia(
      document.querySelectorAll("video"),
      mediaSettings.videos,
      "videos"
    );
    toggleMedia(document.querySelectorAll("svg"), mediaSettings.svgs, "svgs");
    toggleGreyscale(mediaSettings.greyscale);
  }

  function toggleImages(enable) {
    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      if (enable) {
        if (img.dataset.removed) {
          img.style.display = img.dataset.originalDisplay;
          img.removeAttribute("data-removed");
        }
      } else {
        if (img.style.display !== "none") {
          img.dataset.originalDisplay = img.style.display;
          img.style.display = "none";
          img.dataset.removed = true;
        }
      }
    });
  }

  function toggleBackgrounds(enable) {
    const elements = document.querySelectorAll(
      "*:not(#curtain-control-panel):not(#curtain-control-panel *):not([data-layer])"
    );
    elements.forEach((element) => {
      if (enable) {
        element.style.removeProperty("background-image");
      } else {
        element.style.backgroundImage = "none";
      }
    });
  }

  function toggleMedia(elements, enable, type) {
    elements.forEach((element) => {
      if (enable) {
        if (element.dataset.removed) {
          element.style.display = element.dataset.originalDisplay;
          element.removeAttribute("data-removed");
        }
      } else {
        if (element.style.display !== "none") {
          element.dataset.originalDisplay = element.style.display;
          element.style.display = "none";
          element.dataset.removed = true;
        }
      }
    });
  }

  function toggleGreyscale(enable) {
    const greyscaleStyleId = "greyscale-style";
    let greyscaleStyle = document.getElementById(greyscaleStyleId);

    if (enable) {
      if (!greyscaleStyle) {
        greyscaleStyle = document.createElement("style");
        greyscaleStyle.id = greyscaleStyleId;
        greyscaleStyle.innerHTML = `
        html {
          filter: grayscale(100%);
        }
      `;
        document.head.appendChild(greyscaleStyle);
      }
    } else {
      if (greyscaleStyle) {
        greyscaleStyle.remove();
      }
    }
  }

  function restoreSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["rules"], (result) => {
        if (result.rules && result.rules[currentUrl]) {
          mediaSettings = result.rules[currentUrl];
          document.getElementById("toggle-images").checked =
            mediaSettings.images;
          document.getElementById("toggle-backgrounds").checked =
            mediaSettings.backgrounds;
          document.getElementById("toggle-videos").checked =
            mediaSettings.videos;
          document.getElementById("toggle-svgs").checked = mediaSettings.svgs;
          document.getElementById("toggle-greyscale").checked =
            mediaSettings.greyscale;
        }
        resolve();
      });
    });
  }

  function saveSettings() {
    chrome.storage.local.get(["rules"], (result) => {
      const rules = result.rules || {};
      rules[currentUrl] = mediaSettings;
      chrome.storage.local.set({ rules });
    });
  }

  function init() {
    restoreSettings().then(() => {
      handleMediaSettings(); // Apply settings after the settings are restored
    });
  }

  init(); // Automatically apply settings on page load

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "showControlPanel") {
      if (!controlPanelInjected) {
        injectControlPanel().then(() => {
          fadeInPanel();
        });
        controlPanelInjected = true;
      } else if (!controlPanelVisible) {
        fadeInPanel();
      }
      sendResponse({ status: "Panel displayed" });
    } else if (message.action === "hideControlPanel") {
      if (controlPanelVisible) {
        fadeOutPanel();
      }
      sendResponse({ status: "Panel hidden" });
    }
  });
}
