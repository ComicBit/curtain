chrome.runtime.onInstalled.addListener(() => {
  console.log("Curtain installed");
});

let isPanelVisible = false;

chrome.action.onClicked.addListener((tab) => {
  if (isPanelVisible) {
    chrome.tabs.sendMessage(
      tab.id,
      { action: "hideControlPanel" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
        } else {
          isPanelVisible = false;
          console.log("Panel hidden:", response);
        }
      }
    );
  } else {
    chrome.tabs.sendMessage(
      tab.id,
      { action: "showControlPanel" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
        } else {
          isPanelVisible = true;
          console.log("Panel shown:", response);
        }
      }
    );
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updatePanelState") {
    isPanelVisible = message.isVisible;
    sendResponse({ status: "Panel state updated" });
  }
});
