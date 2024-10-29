'use strict'

// const TRANSCRIPT_TIME_SELECTOR = '#segments-container > ytd-transcript-segment-renderer:nth-child(36) div.segment-timestamp'
function injectedFunction({ funcName: _funcName, searchTerm: _searchTerm, pageIdx: _pageIdx }) {
    const _argsObj = {
        _funcName,
        _searchTerm,
        _pageIdx
    }
    const TRANSCRIPTS_SEGS_SELECTOR = '#segments-container > ytd-transcript-segment-renderer > div';
    (function () {

        var matchedElScriptSegs
        var matchIdx = 0

        function sleep(time = 0) {
            return new Promise(resolve => setTimeout(resolve, time))
        }

        /**
         * Evaluates the given expression by replacing sub-expressions enclosed in parentheses with their results.
         * @param {string} expr - The expression to evaluate.
         * @param {string} title - The title to use for evaluation.
         * @returns {boolean} - The result of the evaluation.
         */
        function evaluateExpression(expr, title) {
            while (true) {
                const startIdx = expr.lastIndexOf('(') // z || (w && t && (a || b) && (c && (d || e)))
                if (startIdx === -1) break
                const endIdx = expr.indexOf(')', startIdx)
                if (endIdx === -1) break

                const subExpr = expr.substring(startIdx + 1, endIdx)
                const result = evaluateSimpleExpression(subExpr, title) ? 'TRUE' : 'FALSE'
                expr = expr.substring(0, startIdx) + result + expr.substring(endIdx + 1)
            }
            return evaluateSimpleExpression(expr, title)
        }

        // a || b && c
        /**
         * Evaluates a simple expression based on the given title.
         * The expression can contain logical operators (|| and &&) and terms.
         * Terms can be true, false, or prefixed with '-' to negate them.
         * 
         * @param {string} expr - The expression to evaluate.
         * @param {string} title - The title to evaluate the expression against.
         * @returns {boolean} - The result of the evaluation.
         */
        function evaluateSimpleExpression(expr, title) {
            const orTerms = expr.split('||').map(term => term.trim())

            return orTerms.some(orTerm => {
                const andTerms = orTerm.split('&&').map(term => term.trim())
                return andTerms.every(andTerm => {
                    if (andTerm === 'TRUE' || andTerm === '-FALSE') return true
                    if (andTerm === 'FALSE' || andTerm === '-TRUE') return false

                    if (andTerm.startsWith('-')) {
                        const term = andTerm.slice(1)
                        return !evaluateTerm(term, title)
                    }
                    return evaluateTerm(andTerm, title)
                })
            })
        }

        function evaluateTerm(term, title) {
            let regexFlag = 'i'
            if (term[0] === '/') {
                const lastSlashIdx = term.lastIndexOf('/')
                if (lastSlashIdx > 0) { // if second "/" exist (not -1) and not equal to the the first one (not 0) 
                    regexFlag = term.slice(lastSlashIdx + 1)
                    term = term.slice(1, lastSlashIdx)
                }
            }

            const termRegexp = new RegExp(term, regexFlag)
            return termRegexp.test(title)
        }

        function setMatchedScriptsSegs(_searchTerm) {
            let elTranScriptsSegs = [...document.querySelectorAll(TRANSCRIPTS_SEGS_SELECTOR)]
            matchedElScriptSegs = elTranScriptsSegs.filter((elScriptSeg, idx) => {
                const elSeg = elScriptSeg.querySelector('.segment-text')
                const scriptSegText = elSeg.innerText
                const isStartWithTime = /^\d{1,2}:/.test(elScriptSeg.innerText)
                return isStartWithTime && evaluateExpression(_searchTerm, scriptSegText)
            })
            
            return matchedElScriptSegs
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
            // alert(elMatch + '')
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
                setMatchedScriptsSegs(_searchTerm)
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
    })()


}

