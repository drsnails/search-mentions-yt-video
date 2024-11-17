chrome.commands.onCommand.addListener(async (command) => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        // Try to send to popup first
        try {
            await chrome.runtime.sendMessage({
                type: 'command',
                command: command
            });
        } catch (err) {
            // If popup is closed, send to content script without pageIdx
            // Let content script handle the index calculation
            chrome.tabs.sendMessage(tab.id, {
                type: 'command',
                command: command
            });
        }
    } catch (err) {
        console.error('Error handling command:', err);
    }
}); 