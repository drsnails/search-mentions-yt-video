'use strict'






function injectedFunction({ funcName: _funcName, searchTerm: _searchTerm }) {
    console.clear();

    (function () {

        function sleep(time = 0) {
            return new Promise(resolve => setTimeout(resolve, time));
        }


        function getTranscriptTimestamps({ _searchTerm }) {

            var matchIdx = 0
            var prevMatchIdx = 0


            setTimeout(() => {
                document.querySelector('#primary-button > ytd-button-renderer > yt-button-shape > button')?.click?.()
            }, 0)
            let intervalId
            intervalId = setTimeout(() => {
                let elTranScriptsSegs = [...document.querySelectorAll('#segments-container > ytd-transcript-segment-renderer > div')]
                let matchedElScriptSegs = elTranScriptsSegs.filter(elScriptSeg => {
                    const scriptSegText = elScriptSeg.querySelector('.segment-text').innerText
                    const regex = new RegExp(_searchTerm, 'i')
                    return regex.test(scriptSegText)
                })

                async function handleMatchIdxSelection() {
                    scrollTo(0, 0)
                    await sleep()
                    matchIdx = prompt('Enter match idx (cancel to exit the process)', prevMatchIdx) || null
                    if (!matchIdx) {
                        elTranScriptsSegs = null
                        matchedElScriptSegs = null
                        return
                    }
                    const elMatch = matchedElScriptSegs[matchIdx]
                    if (!elMatch) return
                    clearInterval(intervalId)
                    elMatch.click()
                    prevMatchIdx = matchIdx
                    setTimeout(handleMatchIdxSelection, 1000)
                }
                handleMatchIdxSelection()

            }, 1000)

        }



        const mainFunctions = {
            getTranscriptTimestamps
        }


        //* Execute the main function
        mainFunctions[_funcName]({ _searchTerm })
    })();
}