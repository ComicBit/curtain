chrome.runtime.onInstalled.addListener(() => {
  console.log("Curtain installed");
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'showControlPanel' }, response => {
    if (chrome.runtime.lastError) {
      console.error('Error sending message:', chrome.runtime.lastError);
    } else {
      console.log('Panel shown:', response);
    }
  });
});