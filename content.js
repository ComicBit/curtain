if (typeof controlPanelInjected === "undefined") {
  let controlPanelInjected = true;
  let currentUrl = window.location.hostname;
  let mediaSettings = {
    images: true,
    backgrounds: true,
    videos: true,
    svgs: true,
    greyscale: false,
  };

  function injectControlPanel() {
    if (document.getElementById("curtain-control-panel")) return;

    const controlPanelContainer = document.createElement("div");
    controlPanelContainer.id = "curtain-control-panel-container";

    fetch(chrome.runtime.getURL("control-panel.html"))
      .then((response) => response.text())
      .then((html) => {
        controlPanelContainer.innerHTML = html;
        document.body.appendChild(controlPanelContainer);
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
        document.getElementById("curtain-control-panel").style.display = "none";
        chrome.runtime.sendMessage({
          action: "updatePanelState",
          isVisible: false,
        });
      });

      document.addEventListener("click", function (event) {
        const panel = document.getElementById("curtain-control-panel");
        if (panel && !panel.contains(event.target)) {
          panel.style.display = "none";
          chrome.runtime.sendMessage({
            action: "updatePanelState",
            isVisible: false,
          });
        }
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
      "*:not(#curtain-control-panel):not(#curtain-control-panel *)"
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
    chrome.storage.local.get(["rules"], (result) => {
      if (result.rules && result.rules[currentUrl]) {
        mediaSettings = result.rules[currentUrl];
        document.getElementById("toggle-images").checked = mediaSettings.images;
        document.getElementById("toggle-backgrounds").checked =
          mediaSettings.backgrounds;
        document.getElementById("toggle-videos").checked = mediaSettings.videos;
        document.getElementById("toggle-svgs").checked = mediaSettings.svgs;
        document.getElementById("toggle-greyscale").checked =
          mediaSettings.greyscale;
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
        const controlPanel = document.getElementById("curtain-control-panel");
        if (controlPanel) {
          controlPanel.style.display = "block";
        }
        sendResponse({ status: "Panel displayed" });
      } else {
        showLoadingPopup();
        window.addEventListener("load", () => {
          hideLoadingPopup();
          injectControlPanel();
          const controlPanel = document.getElementById("curtain-control-panel");
          if (controlPanel) {
            controlPanel.style.display = "block";
          }
          sendResponse({ status: "Panel displayed" });
        });
      }
    } else if (message.action === "hideControlPanel") {
      const controlPanel = document.getElementById("curtain-control-panel");
      if (controlPanel) {
        controlPanel.style.display = "none";
      }
      sendResponse({ status: "Panel hidden" });
    }
  });

  function showLoadingPopup() {
    const loadingPopup = document.createElement("div");
    loadingPopup.id = "curtain-loading-popup";
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
    const loadingPopup = document.getElementById("curtain-loading-popup");
    if (loadingPopup) {
      document.body.removeChild(loadingPopup);
    }
  }
}
