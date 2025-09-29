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
      if (document.getElementById("curtain-control-panel-container")) {
        resolve();
        return;
      }

      const controlPanelHost = document.createElement("div");
      controlPanelHost.id = "curtain-control-panel-container";
      controlPanelHost.setAttribute('data-layer', 'curtain');

      // Create shadow root to isolate styles from page
      const shadow = controlPanelHost.attachShadow({ mode: "open" });

      fetch(chrome.runtime.getURL("control-panel.html"))
        .then((response) => response.text())
        .then((html) => {
          // Inline the HTML into the shadow root
          const wrapper = document.createElement("div");
          wrapper.innerHTML = html;

          // Inline CSS into a <style> inside shadow root to prevent page styles from leaking in
          const styleEl = document.createElement("style");
          styleEl.textContent = `
            /* Inlined control-panel.css - scoped to shadow root */
            #curtain-control-panel {
              all: unset;
              position: fixed;
              right: 20px;
              bottom: 20px;
              width: 170px;
              padding: 15px;
              background: #000;
              border-radius: 20px;
              box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
              outline: 1px solid rgba(255, 255, 255, 0.1);
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              align-items: flex-start;
              gap: 10px;
              color: white;
              font-family: Arial, sans-serif;
              z-index: 2147483647; /* max z-index to ensure visibility */
              filter: none !important;
              display: none;
              opacity: 0;
              transition: opacity 0.3s ease;
            }

            #curtain-control-panel.visible {
              display: block;
              opacity: 1;
            }

            #curtain-control-panel-content {
              width: 100%;
              display: flex;
              flex-direction: column;
              gap: 10px;
            }

            #curtain-control-panel h3 {
              all: unset;
              margin: 0;
              border-bottom: 1px solid rgba(255, 255, 255, 0.2);
              padding-bottom: 10px;
              width: 100%;
              display: flex;
              align-items: center;
              font-family: Arial, sans-serif;
              color: white;
            }

            .curtain-label {
              all: unset;
              display: flex;
              justify-content: flex-start;
              align-items: center;
              width: 100%;
              font-family: Arial, sans-serif;
              color: white;
            }

            .curtain-icon {
              margin-left: 10px;
            }

            .curtain-label input[type="checkbox"] {
              margin-right: 10px;
            }

            .curtain-close-button {
              all: unset;
              position: absolute;
              top: 15px;
              right: 15px;
              cursor: pointer;
            }

            .curtain-close-button svg {
              width: 16px;
              height: 16px;
              fill: none;
              stroke: #999;
              stroke-width: 2;
            }

            #curtain-control-buttons {
              display: flex;
              justify-content: space-between;
              width: 100%;
            }

            .curtain-button {
              background-color: white;
              border: none;
              color: black;
              padding: 5px 10px;
              text-align: center;
              text-decoration: none;
              display: inline-block;
              font-size: 12px;
              border-radius: 5px;
              cursor: pointer;
              width: 100%;
              text-decoration: none;
              transition: background-color 0.3s ease, transform 0.3s ease;
            }

            .curtain-button a { color: #000000; }
            .curtain-button:hover { background-color: #f0f0f0; }

            .no-greyscale { filter: none !important; }
          `;

          // Append style and content inside shadow root
          shadow.appendChild(styleEl);
          // Move children of wrapper into shadow root
          Array.from(wrapper.children).forEach((child) => shadow.appendChild(child));

          document.body.appendChild(controlPanelHost);

          // Save references for other functions
          controlPanelHost.__shadow = shadow;

          // After injecting, attach listeners and restore settings
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
    const root = getPanelRoot();
    if (!root) return;

  const toggleImages = root.querySelector("#toggle-images");
  const toggleBackgrounds = root.querySelector("#toggle-backgrounds");
  const toggleVideos = root.querySelector("#toggle-videos");
  const toggleSvgs = root.querySelector("#toggle-svgs");
  const toggleGreyscale = root.querySelector("#toggle-greyscale");
  const closePanel = root.querySelector("#curtain-close-panel");

    if (
      toggleImages &&
      toggleBackgrounds &&
      toggleVideos &&
      toggleSvgs &&
      toggleGreyscale &&
      closePanel
    ) {
      // Remove previous listeners if any by cloning nodes
      [toggleImages, toggleBackgrounds, toggleVideos, toggleSvgs, toggleGreyscale].forEach((el) => {
        const newEl = el.cloneNode(true);
        el.parentNode.replaceChild(newEl, el);
      });

      // Re-obtain references after cloning
      const tImg = root.querySelector("#toggle-images");
      const tBg = root.querySelector("#toggle-backgrounds");
      const tVid = root.querySelector("#toggle-videos");
      const tSvg = root.querySelector("#toggle-svgs");
      const tGrey = root.querySelector("#toggle-greyscale");

      tImg.addEventListener("change", handleCheckboxChange);
      tBg.addEventListener("change", handleCheckboxChange);
      tVid.addEventListener("change", handleCheckboxChange);
      tSvg.addEventListener("change", handleCheckboxChange);
      tGrey.addEventListener("change", handleCheckboxChange);

      // Ensure single click listener on close button
  const newClose = closePanel.cloneNode(true);
  closePanel.parentNode.replaceChild(newClose, closePanel);
      newClose.addEventListener("click", function () {
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

  // Returns the element root (shadow root or document) that contains the control panel elements
  function getPanelRoot() {
    const host = document.getElementById("curtain-control-panel-container");
    if (!host) return null;
    return host.__shadow || host; // shadow root or the host element (itself contains the nodes if not shadowed)
  }

  function addDocumentClickListener() {
    document.addEventListener("click", handleDocumentClick);
  }

  function removeDocumentClickListener() {
    document.removeEventListener("click", handleDocumentClick);
  }

  function handleDocumentClick(event) {
    const host = document.getElementById("curtain-control-panel-container");
    if (!host) return;

    // If using shadow DOM, the actual panel is inside host.__shadow; clicking inside the shadow root will still have composedPath entries
    const path = event.composedPath ? event.composedPath() : [event.target];
    const clickedInsidePanel = path.some((node) => {
      return node === host || node === host.__shadow || (host.__shadow && host.__shadow.host === node) || (node && node.getAttribute && node.getAttribute('data-layer') === 'curtain');
    });

    const clickedOutsidePanel = !clickedInsidePanel;
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
    const root = getPanelRoot();
    if (!root) return;
  const panel = root.querySelector("#curtain-control-panel");
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
    const root = getPanelRoot();
    if (!root) return;
  const panel = root.querySelector("#curtain-control-panel");
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
    const root = getPanelRoot();
    if (!root) return;
    mediaSettings.images = root.querySelector("#toggle-images").checked;
    mediaSettings.backgrounds =
      root.querySelector("#toggle-backgrounds").checked;
    mediaSettings.videos = root.querySelector("#toggle-videos").checked;
    mediaSettings.svgs = root.querySelector("#toggle-svgs").checked;
    mediaSettings.greyscale =
      root.querySelector("#toggle-greyscale").checked;
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
          const root = getPanelRoot();
          if (root) {
              const img = root.querySelector("#toggle-images");
              const bg = root.querySelector("#toggle-backgrounds");
              const vid = root.querySelector("#toggle-videos");
              const svg = root.querySelector("#toggle-svgs");
              const grey = root.querySelector("#toggle-greyscale");
            if (img) img.checked = mediaSettings.images;
            if (bg) bg.checked = mediaSettings.backgrounds;
            if (vid) vid.checked = mediaSettings.videos;
            if (svg) svg.checked = mediaSettings.svgs;
            if (grey) grey.checked = mediaSettings.greyscale;
          }
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
