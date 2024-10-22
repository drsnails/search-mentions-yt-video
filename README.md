# YouTube Video Search Chrome Extension

## Description

This Chrome extension allows users to search for specific terms within YouTube video transcripts. It provides an easy-to-use interface for searching and navigating through video content based on user-defined search terms.

## Features

-   Search for specific terms or phrases within YouTube video transcripts
-   Navigate through search results using previous and next buttons
-   Display current timestamp and total video duration
-   Support for complex search queries using AND/OR operators
-   Persistent search term storage for convenience

## Installation

1. Clone this repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the directory containing the extension files.

## Usage

1. Navigate to a YouTube video page.
2. Click on the extension icon in your Chrome toolbar.
3. Enter your search term in the provided input field.
4. Click "Search" or press Enter to initiate the search.
5. Use the "Prev" and "Next" buttons to navigate through the search results.
6. Click "Back" to return to the search input.

## File Structure

-   `manifest.json`: Extension configuration file
-   `index.html`: Popup HTML structure
-   `css/style.css`: Styles for the popup interface
-   `popup.js`: Main script for the popup functionality
-   `main.js`: Content script for interacting with YouTube pages

## Development

To modify or extend the extension:

1. Edit the relevant files (`popup.js`, `main.js`, `index.html`, `css/style.css`).
2. Make sure to update `manifest.json` if you add new permissions or scripts.
3. Reload the extension in Chrome to see your changes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Add your chosen license here]
