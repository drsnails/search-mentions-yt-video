'use strict'

function injectedFunction({ funcName: _funcName, searchTerm: _searchTerm, pageIdx: _pageIdx }) {
    const _argsObj = {
        _funcName,
        _searchTerm,
        _pageIdx
    };

    (function () {

        var matchedElScriptSegs;
        var matchIdx = 0

        function sleep(time = 0) {
            return new Promise(resolve => setTimeout(resolve, time));
        }

        function setMatchedScriptsSegs(_searchTerm) {
            let elTranScriptsSegs = [...document.querySelectorAll('#segments-container > ytd-transcript-segment-renderer > div')];
            matchedElScriptSegs = elTranScriptsSegs.filter(elScriptSeg => {
                const scriptSegText = elScriptSeg.querySelector('.segment-text').innerText;
                const regex = new RegExp(_searchTerm, 'i');
                return regex.test(scriptSegText);
            });
            return matchedElScriptSegs;
        }

        async function handleMatchIdxSelection(pageIdx = 0) {

            setMatchedScriptsSegs(_searchTerm)
            if (!matchedElScriptSegs.length) return
            if (pageIdx < 0) pageIdx = matchedElScriptSegs.length - 1
            if (pageIdx >= matchedElScriptSegs.length) pageIdx = 0
            matchIdx = pageIdx
            scrollTo(0, 0)
            await sleep()
            const elMatch = matchedElScriptSegs[matchIdx]
            elMatch.click()
            chrome.runtime.sendMessage({ type: 'setPageIdx', pageIdx })
        }

        function getTranscriptTimestamps({ _searchTerm }) {

            setTimeout(() => {
                document.querySelector('#primary-button > ytd-button-renderer > yt-button-shape > button')?.click?.()
            }, 0)
            let intervalId
            intervalId = setTimeout(() => {
                setMatchedScriptsSegs(_searchTerm);
                handleMatchIdxSelection()
                chrome.runtime.sendMessage({ type: 'search' })
                clearInterval(intervalId)
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