'use strict'

// const TRANSCRIPT_TIME_SELECTOR = '#segments-container > ytd-transcript-segment-renderer:nth-child(36) div.segment-timestamp'
function injectedFunction({ funcName: _funcName, searchTerm: _searchTerm, pageIdx: _pageIdx }) {
    const _argsObj = {
        _funcName,
        _searchTerm,
        _pageIdx
    };
    
    const TRANSCRIPTS_SEGS_SELECTOR = '#segments-container > ytd-transcript-segment-renderer > div';
    (function () {

        var matchedElScriptSegs;
        var matchIdx = 0

        function sleep(time = 0) {
            return new Promise(resolve => setTimeout(resolve, time));
        }

        function setMatchedScriptsSegs(_searchTerm) {
            let elTranScriptsSegs = [...document.querySelectorAll(TRANSCRIPTS_SEGS_SELECTOR)];
            matchedElScriptSegs = elTranScriptsSegs.filter(elScriptSeg => {
                const scriptSegText = elScriptSeg.querySelector('.segment-text').innerText;
                const regex = new RegExp(_searchTerm, 'i');
                return regex.test(scriptSegText)
            });
            return matchedElScriptSegs;
        }

        async function handleMatchIdxSelection(pageIdx = 0) {
            setMatchedScriptsSegs(_searchTerm)
            if (!matchedElScriptSegs.length) return console.log('No matches found')
            if (pageIdx < 0) pageIdx = matchedElScriptSegs.length - 1
            if (pageIdx >= matchedElScriptSegs.length) pageIdx = 0
            matchIdx = pageIdx
            scrollTo(0, 0)
            await sleep()
            const elMatch = matchedElScriptSegs[matchIdx]
            elMatch.click()
            const segTime = elMatch.querySelector('div.segment-timestamp').innerText
            
            chrome.runtime.sendMessage({ type: 'setPageIdx', pageIdx, segTime })
        }

        function getTranscriptTimestamps({ _searchTerm }) {

            setTimeout(() => {
                document.querySelector('#primary-button > ytd-button-renderer > yt-button-shape > button')?.click?.()
            }, 0)
            let intervalId
            intervalId = setTimeout(() => {
                setMatchedScriptsSegs(_searchTerm);
                if (!matchedElScriptSegs.length) {
                    chrome.runtime.sendMessage({ type: 'no-matches' })
                    return console.log('No matches found')
                }
                handleMatchIdxSelection()
                const elTimeDuration = document.querySelector('.ytp-time-display .ytp-time-duration')
                chrome.runtime.sendMessage({ type: 'search', totalTime: elTimeDuration.innerText })
                clearTimeout(intervalId)
            }, 1000)

        }

        function onChangePageIdx({ _pageIdx }) {
            handleMatchIdxSelection(_pageIdx)
        }

        const mainFunctions = {
            getTranscriptTimestamps,
            onChangePageIdx
        }


        //* Execute the main function
        mainFunctions[_funcName](_argsObj)
    })();


}