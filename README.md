# YouTube Video Search Chrome Extension

## Description

This Chrome extension allows users to search for specific terms within YouTube video transcripts and navigate through video heatmaps. It provides an easy-to-use interface for searching and navigating through video content based on user-defined search terms or engagement hotspots.

## Features

- Search for specific terms or phrases within YouTube video transcripts
- Navigate through search results using previous and next buttons
- Visual heatmap navigation showing video engagement peaks
- Keyboard shortcuts for quick navigation
- Display current timestamp and total video duration
- Support for complex search queries using AND/OR operators
- Persistent search term storage for convenience
- Play/pause control with timestamp display
- Interactive timeline scrubbing

## Installation

1. Clone this repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the directory containing the extension files.

## Usage

### Transcript Search
1. Navigate to a YouTube video page
2. Click on the extension icon in your Chrome toolbar
3. Select "Transcript" tab
4. Enter your search term in the provided input field
5. Click "Search" or press Enter to initiate the search
6. Use the "Prev" and "Next" buttons to navigate through results

### Heatmap Navigation
1. Select the "Heatmap" tab
2. View the video engagement visualization
3. Click on the timeline to jump to specific moments
4. Use navigation buttons to move between engagement peaks

### Keyboard Shortcuts
- `Alt + .` : Jump to next peak/result from current time
- `Alt + ,` : Jump to previous peak/result from current time
- `Alt + Shift + .` : Next peak/result
- `Alt + Shift + ,` : Previous peak/result

## File Structure

- `manifest.json`: Extension configuration file
- `index.html`: Popup HTML structure
- `css/style.css`: Styles for the popup interface
- `popup.js`: Main script for the popup functionality
- `main.js`: Content script for interacting with YouTube pages
- `background.js`: Background service worker for handling keyboard shortcuts

## Development

To modify or extend the extension:

1. Edit the relevant files (`popup.js`, `main.js`, `index.html`, `css/style.css`)
2. Make sure to update `manifest.json` if you add new permissions or scripts
3. Reload the extension in Chrome to see your changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Add your chosen license here]
