if (typeof controlPanelInjected === "undefined") {
  let controlPanelInjected = true;
  let currentUrl = window.location.hostname;
  let mediaSettings = {
    images: true,
    backgrounds: true,
    videos: true,
    svgs: true,
  };

  function injectControlPanel() {
    if (document.getElementById("control-panel")) return;

    const controlPanel = document.createElement("div");
    controlPanel.id = "control-panel";

    fetch(chrome.runtime.getURL("control-panel.html"))
      .then((response) => response.text())
      .then((html) => {
        controlPanel.innerHTML = html;
        document.body.appendChild(controlPanel);
        attachStyles();
        attachEventListeners();
        restoreSettings();
      })
      .catch((err) => console.error("Error loading control panel HTML:", err));
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
    const closePanel = document.getElementById("close-panel");

    if (
      toggleImages &&
      toggleBackgrounds &&
      toggleVideos &&
      toggleSvgs &&
      closePanel
    ) {
      toggleImages.addEventListener("change", handleCheckboxChange);
      toggleBackgrounds.addEventListener("change", handleCheckboxChange);
      toggleVideos.addEventListener("change", handleCheckboxChange);
      toggleSvgs.addEventListener("change", handleCheckboxChange);
      closePanel.addEventListener("click", function () {
        document.getElementById("control-panel").style.display = "none";
      });
    } else {
      console.error(
        "Control panel elements not found for attaching event listeners."
      );
    }
  }

  function handleCheckboxChange() {
    mediaSettings.images = document.getElementById("toggle-images").checked;
    mediaSettings.backgrounds =
      document.getElementById("toggle-backgrounds").checked;
    mediaSettings.videos = document.getElementById("toggle-videos").checked;
    mediaSettings.svgs = document.getElementById("toggle-svgs").checked;
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
  }

  function toggleImages(enable) {
    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      if (enable) {
        if (img.removed) {
          img.style.display = img.originalDisplay;
          img.removed = false;
        }
      } else {
        if (img.style.display !== "none") {
          img.originalDisplay = img.style.display;
          img.style.display = "none";
          img.removed = true;
        }
      }
    });
  }

  function toggleBackgrounds(enable) {
    const elements = document.querySelectorAll(
      "*:not(#control-panel):not(#control-panel *)"
    );
    elements.forEach((element) => {
      const bgImage = window.getComputedStyle(element).backgroundImage;
      if (bgImage && bgImage !== "none") {
        if (enable) {
          if (element.removedBg) {
            element.style.backgroundImage = element.originalBgImage;
            element.removedBg = false;
          }
        } else {
          if (!element.removedBg) {
            element.originalBgImage = element.style.backgroundImage;
            element.style.backgroundImage = "none";
            element.removedBg = true;
          }
        }
      }
    });
  }

  function toggleMedia(elements, enable, type) {
    elements.forEach((element) => {
      if (enable) {
        if (element.removed) {
          element.style.display = element.originalDisplay;
          element.removed = false;
        }
      } else {
        if (element.style.display !== "none") {
          element.originalDisplay = element.style.display;
          element.style.display = "none";
          element.removed = true;
        }
      }
    });
  }

  function restoreSettings() {
    chrome.storage.local.get(["rules"], (result) => {
      if (result.rules && result.rules[currentUrl]) {
        mediaSettings = result.rules[currentUrl];
        document.getElementById("toggle-images").checked = mediaSettings.images;
        document.getElementById("toggle-backgrounds").checked =
          mediaSettings.backgrounds;
        document.getElementById("toggle-videos").checked = mediaSettings.videos;
        document.getElementById("toggle-svgs").checked = mediaSettings.svgs;
        handleMediaSettings(); // Apply settings immediately
      }
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
    restoreSettings();
  }

  // Automatically apply settings on page load
  init();

  // Apply settings when the page is fully loaded
  window.addEventListener("load", () => {
    handleMediaSettings(); // Apply settings after the page has fully loaded
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "showControlPanel") {
      if (document.readyState === "complete") {
        injectControlPanel();
        const controlPanel = document.getElementById("control-panel");
        if (controlPanel) {
          controlPanel.style.display = "block";
        }
        sendResponse({ status: "Panel displayed" });
      } else {
        showLoadingPopup();
        window.addEventListener("load", () => {
          hideLoadingPopup();
          injectControlPanel();
          const controlPanel = document.getElementById("control-panel");
          if (controlPanel) {
            controlPanel.style.display = "block";
          }
          sendResponse({ status: "Panel displayed" });
        });
      }
    }
  });

  function showLoadingPopup() {
    const loadingPopup = document.createElement("div");
    loadingPopup.id = "loading-popup";
    loadingPopup.style = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 10px 20px;
      background: #000;
      color: #fff;
      border-radius: 10px;
      font-family: Arial, sans-serif;
      z-index: 2147483647;
    `;
    loadingPopup.textContent = "Loading...";
    document.body.appendChild(loadingPopup);
  }

  function hideLoadingPopup() {
    const loadingPopup = document.getElementById("loading-popup");
    if (loadingPopup) {
      document.body.removeChild(loadingPopup);
    }
  }
}
