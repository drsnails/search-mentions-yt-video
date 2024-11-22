chrome.commands.onCommand.addListener(async (command) => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        //* Try to send to popup first
        try {
            await chrome.runtime.sendMessage({
                type: 'command',
                command: command
            });
        } catch (err) {
            //* If popup is closed, send to content script without pageIdx
            //* Let content script handle the index calculation
            chrome.tabs.sendMessage(tab.id, {
                type: 'command',
                command: command
            });
        }
    } catch (err) {
        console.error('Error handling command:', err);
    }
}); 



function handleCustomKeybind(command) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) return;
        const tab = tabs[0];
        chrome.tabs.sendMessage(tab.id, {
            type: 'command',
            command: command
        });
    });
}


// Listen for Alt+Shift+X and Alt+Shift+Z
chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'keybind') {
        if (msg.key === 'x' && msg.altKey) {
            handleCustomKeybind(msg.shiftKey ? 'increment-page-from-time' : 'increment-page');
        } else if (msg.key === 'z' && msg.altKey) {
            handleCustomKeybind(msg.shiftKey ? 'decrement-page-from-time' : 'decrement-page');
        }
    }
});