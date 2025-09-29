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
  // Global settings are applied by default to all sites unless site-specific rules are enabled
  let globalSettings = Object.assign({}, mediaSettings);

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
              border-radius: 14px;
              cursor: pointer;
              width: 100%;
              text-decoration: none;
              transition: background-color 0.3s ease, transform 0.3s ease;
            }

            .curtain-button a { color: #000000; }
            /* Do not change background for site-rules-button on hover */
            .curtain-button:hover:not(.site-rules-button) { background-color: #f0f0f0; }

            /* Site rules toggle button - consistent look in both states */
            .site-rules-button {
              border: 1px dashed #999;
              background: transparent;
              color: white;
              width: 100%;
              text-align: center;
              padding: 8px;
              box-sizing: border-box;
              border-radius: 14px;
              transition: background-color 0.2s ease, border-color 0.2s ease;
              cursor: pointer;
            }

            /* Keep active state visually identical to default for site-rules-button */
            .site-rules-button.active {
              border: 1px dashed #999;
              background: transparent;
              color: white;
            }

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
          // Initialize scope controls (site-rules-toggle)
          chrome.storage.local.get(["rules", "globalSettings"], (res) => {
            const rules = res.rules || {};
            if (res.globalSettings) globalSettings = res.globalSettings;
            const root = controlPanelHost.__shadow;
            if (root) {
              const siteRulesToggle = root.querySelector('#site-rules-toggle');
              if (siteRulesToggle) {
                if (rules[currentUrl]) {
                  siteRulesToggle.textContent = 'Remove site-specific rules';
                  siteRulesToggle.classList.add('active');
                  siteRulesToggle.setAttribute('aria-pressed', 'true');
                } else {
                  siteRulesToggle.textContent = 'Add website specific rules';
                  siteRulesToggle.classList.remove('active');
                  siteRulesToggle.setAttribute('aria-pressed', 'false');
                }
              }
            }
            restoreSettings().then(() => handleMediaSettings());
          });
          setTimeout(resolve, 50);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function attachStyles() {
    // Styles are inlined into the ShadowRoot; this function is deprecated.
    return;
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

      // Wire site rules toggle button which acts as either 'Add website specific rules' or 'Remove site-specific rules'
      const siteRulesToggle = root.querySelector('#site-rules-toggle');
      if (siteRulesToggle) {
        siteRulesToggle.addEventListener('click', function () {
          // Check whether a site-specific rule exists currently
          chrome.storage.local.get(['rules'], (res) => {
            const rules = res.rules || {};
            const hasRule = !!rules[currentUrl];
            if (hasRule) {
              // Remove site-specific rule and immediately apply global settings
              delete rules[currentUrl];
              chrome.storage.local.set({ rules }, () => {
                loadGlobalSettings().then(() => {
                  mediaSettings = Object.assign({}, globalSettings);
                  applySettingsToUI(globalSettings);
                  handleMediaSettings();
                  // update button appearance (toggle class)
                  siteRulesToggle.textContent = 'Add website specific rules';
                  siteRulesToggle.classList.remove('active');
                  siteRulesToggle.setAttribute('aria-pressed', 'false');
                });
              });
            } else {
              // Create a site-specific rule from current UI state
              // Ensure mediaSettings are current
              mediaSettings = {
                images: root.querySelector('#toggle-images').checked,
                backgrounds: root.querySelector('#toggle-backgrounds').checked,
                videos: root.querySelector('#toggle-videos').checked,
                svgs: root.querySelector('#toggle-svgs').checked,
                greyscale: root.querySelector('#toggle-greyscale').checked,
              };
              rules[currentUrl] = mediaSettings;
              chrome.storage.local.set({ rules }, () => {
                // update button appearance (toggle class)
                siteRulesToggle.textContent = 'Remove site-specific rules';
                siteRulesToggle.classList.add('active');
                siteRulesToggle.setAttribute('aria-pressed', 'true');
              });
            }
          });
        });
      }
    } else {
      console.error(
        "Control panel elements not found for attaching event listeners."
      );
    }
  }

  function loadGlobalSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["globalSettings"], (res) => {
        if (res.globalSettings) {
          globalSettings = res.globalSettings;
        } else {
          globalSettings = Object.assign({}, mediaSettings);
        }
        resolve();
      });
    });
  }

  function saveGlobalSettings() {
    chrome.storage.local.set({ globalSettings });
  }

  function applySettingsToUI(settings) {
    const root = getPanelRoot();
    if (!root) return;
    const img = root.querySelector("#toggle-images");
    const bg = root.querySelector("#toggle-backgrounds");
    const vid = root.querySelector("#toggle-videos");
    const svg = root.querySelector("#toggle-svgs");
    const grey = root.querySelector("#toggle-greyscale");
    if (img) img.checked = !!settings.images;
    if (bg) bg.checked = !!settings.backgrounds;
    if (vid) vid.checked = !!settings.videos;
    if (svg) svg.checked = !!settings.svgs;
    if (grey) grey.checked = !!settings.greyscale;
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
    // Decide whether to save as global or site-specific based on the site-rules toggle
    const siteRulesToggle = root.querySelector('#site-rules-toggle');
    const siteTogglePressed = siteRulesToggle && siteRulesToggle.getAttribute('aria-pressed') === 'true';
    if (siteTogglePressed) {
      saveSettings(true);
    } else {
      // Save as global defaults
      globalSettings = Object.assign({}, mediaSettings);
      saveGlobalSettings();
    }
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
      // Load global options first
      loadGlobalSettings().then(() => {
        chrome.storage.local.get(["rules"], (result) => {
          const root = getPanelRoot();
          const siteRulesToggle = root && root.querySelector('#site-rules-toggle');
          const rules = result.rules || {};
          const hasRule = !!rules[currentUrl];
          if (hasRule) {
            mediaSettings = rules[currentUrl];
            applySettingsToUI(mediaSettings);
            if (siteRulesToggle) {
              siteRulesToggle.textContent = 'Remove site-specific rules';
              siteRulesToggle.classList.add('active');
              siteRulesToggle.setAttribute('aria-pressed', 'true');
            }
          } else {
            // Default to global settings
            mediaSettings = Object.assign({}, globalSettings);
            applySettingsToUI(globalSettings);
            if (siteRulesToggle) {
              siteRulesToggle.textContent = 'Add website specific rules';
              siteRulesToggle.classList.remove('active');
              siteRulesToggle.setAttribute('aria-pressed', 'false');
            }
          }
          resolve();
        });
      });
    });
  }

  function saveSettings() {
    // default: save site-specific unless flag false
    const saveAsSite = arguments.length ? arguments[0] === true : true;
    if (saveAsSite) {
      chrome.storage.local.get(["rules"], (result) => {
        const rules = result.rules || {};
        rules[currentUrl] = mediaSettings;
        chrome.storage.local.set({ rules });
      });
    } else {
      // Save as global settings
      globalSettings = Object.assign({}, mediaSettings);
      saveGlobalSettings();
    }
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
