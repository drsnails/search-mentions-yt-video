'use strict'

//* state management at content script level
let contentPageIdx = 0;
let contentSearchResults = null;

chrome.runtime.onMessage.addListener(({ type, command, pageIdx }) => {
    if (type === 'command') {
        //* If pageIdx is provided (from popup), use it, otherwise calculate new index
        const newPageIdx = (pageIdx !== undefined) ? 
            pageIdx : 
            contentPageIdx + (command === 'increment-page' ? 1 : -1);
            
        contentPageIdx = newPageIdx; //* Update our local state
        
        const args = {
            page: 'heatmap',
            funcName: 'onChangePageIdx',
            pageIdx: newPageIdx
        };
        injectedFunction(args);
    }
});

function injectedFunction({ funcName: _funcName, searchTerm: _searchTerm, pageIdx: _pageIdx, page: _page }) {
    const _argsObj = {
        _page,
        _funcName,
        _searchTerm,
        _pageIdx,
    }
    const TRANSCRIPTS_SEGS_SELECTOR = '#segments-container > ytd-transcript-segment-renderer > div';
    const SVG_SELECTOR = 'div.ytp-heat-map-container > div.ytp-heat-map-chapter > svg'
    const VIDEO_SELECTOR = "#movie_player > div.html5-video-container > video"


    //* ------------------- Transcript -------------------
    var _matchedElScriptSegs
    var _pickPercentages
    var _videoLength


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
        _matchedElScriptSegs = elTranScriptsSegs.filter((elScriptSeg, idx) => {
            const elSeg = elScriptSeg.querySelector('.segment-text')
            const scriptSegText = elSeg.innerText
            const isStartWithTime = /^\d{1,2}:/.test(elScriptSeg.innerText)
            return isStartWithTime && evaluateExpression(_searchTerm, scriptSegText)
        })
        
        // Store the results in the content script scope
        contentSearchResults = _matchedElScriptSegs;
        return _matchedElScriptSegs
    }



    function getTranscriptTimestamps({ _searchTerm }) {

        setTimeout(() => {
            document.querySelector('#primary-button > ytd-button-renderer > yt-button-shape > button')?.click?.()
        }, 0)
        let intervalId
        intervalId = setTimeout(() => {
            setMatchedScriptsSegs(_searchTerm)
            if (!_matchedElScriptSegs.length) {
                chrome.runtime.sendMessage({ type: 'no-matches' })
                return console.log('No matches found')
            }
            onChangePageIdx({})
            const elTimeDuration = document.querySelector('.ytp-time-display .ytp-time-duration')
            chrome.runtime.sendMessage({ type: 'search', totalTime: elTimeDuration.innerText })
            clearTimeout(intervalId)
        }, 1000)

    }

    //* ------------------- Heatmap -------------------


    function findHighestPeaksInSVGPath(pathData, prominenceThreshold = 2) {

        //* Extract all numbers from the path data
        const numbers = pathData
            .replace(/[a-zA-Z,]/g, ' ')
            .trim()
            .split(/\s+/)
            .map(parseFloat)

        //* Group numbers into x and y coordinate pairs
        const points = []
        for (let i = 0; i < numbers.length; i += 2) {
            points.push({ x: numbers[i], y: numbers[i + 1] })
        }
        //* Find peaks (local minima in y-values due to SVG coordinate system)
        const step = 1
        const peaks = []
        for (let i = step; i < points.length - step; i++) {
            const prevY = points[i - step].y
            const currY = points[i].y
            const nextY = points[i + step].y

            //* Check if the current point is a peak (local minimum)
            if (currY < prevY && currY < nextY) {
                peaks.push({ index: i, point: points[i] })
            }
        }

        //* Calculate prominence of each peak
        const prominences = peaks.map(peak => {
            let leftMin = peak.point.y
            let rightMin = peak.point.y

            //* Search left for the next valley
            for (let i = peak.index - 1; i >= 0; i--) {
                if (points[i].y > peak.point.y) {
                    leftMin = Math.max(leftMin, points[i].y)
                } else {
                    break
                }
            }

            //* Search right for the next valley
            for (let i = peak.index + 1; i < points.length; i++) {
                if (points[i].y > peak.point.y) {
                    rightMin = Math.max(rightMin, points[i].y)
                } else {
                    break
                }
            }

            //* Prominence is the minimum difference to the higher of the surrounding valleys
            const prominence = Math.min(leftMin, rightMin) - peak.point.y

            return { peak: peak.point, prominence }
        })

        //* Filter peaks based on prominence threshold
        const maxProminence = Math.max(...prominences.map(p => p.prominence))
        const thresholdValue = (prominenceThreshold / 100) * maxProminence

        const significantPeaks = prominences.filter(p => p.prominence >= thresholdValue)

        //* Calculate the total width (maximum x-value)
        const maxX = Math.max(...points.map(p => p.x))

        //* A constant representing the time correction factor, making the percent a bit before the peak itself
        const timeCorrection = 0.6

        //* Convert peak x-locations to percentages of the total width
        const peakPercentages = significantPeaks.map(p => ((p.peak.x / maxX) * 100 - timeCorrection).toFixed(2))


        return {
            peakPercentages
        }
    }


    function skipToPercent(percentage) {

        const elVideo = document.querySelector(VIDEO_SELECTOR)

        if (elVideo) {
            elVideo.currentTime = (percentage / 100) * elVideo.duration
        } else {
            console.error('No video element found on the page')
        }

    }


    function getHeatMapPath() {
        const elSvg = document.querySelector(SVG_SELECTOR)
        const path = elSvg.querySelector('path').getAttribute('d')
        return path
    }

    function setHeatPercentages() {
        const pathData = getHeatMapPath()
        const { peakPercentages } = findHighestPeaksInSVGPath(pathData, 4)
        _pickPercentages = peakPercentages
        // Store the results in the content script scope
        contentSearchResults = peakPercentages
    }

    function loopIdx(idx, length) {
        let newIdx = idx
        if (newIdx < 0) newIdx = length - 1
        if (newIdx >= length) newIdx = 0
        return newIdx
    }

    function onChangePageIdx({ _pageIdx = 0 }) {
        if (!contentSearchResults) {
            if (_page === 'heatmap') {
                setHeatPercentages();
            } else {
                setMatchedScriptsSegs(_searchTerm);
            }
        }
        
        if (contentSearchResults) {
            contentPageIdx = loopIdx(_pageIdx, contentSearchResults.length);
        }
        
        mainFunctions[_page].execute(_pageIdx)
    }

    function getFormattedTime(videoDuration) {
        const pad = time => (time + '').padStart(2, '0')
        const hours = Math.floor(videoDuration / 3600);
        const minutes = Math.floor((videoDuration % 3600) / 60)
        const seconds = Math.floor(videoDuration % 60)
        let formattedTime = `${pad(minutes)}:${pad(seconds)}`
        if (hours) formattedTime = `${pad(hours)}:${formattedTime}`;
        return formattedTime;
    }

    const mainFunctions = {
        transcript: {
            getTranscriptTimestamps,
            onChangePageIdx,
            async execute(pageIdx) {
                setMatchedScriptsSegs(_searchTerm)
                if (!_matchedElScriptSegs.length) return console.log('No matches found')
                pageIdx = loopIdx(pageIdx, _matchedElScriptSegs.length)

                scrollTo(0, 0)
                await sleep()
                const elMatch = _matchedElScriptSegs[pageIdx]
                // alert(elMatch + '')
                elMatch.click()
                const segTime = elMatch.querySelector('div.segment-timestamp').innerText

                chrome.runtime.sendMessage({ type: 'setPageIdx', pageIdx, time: segTime })
            }
        },
        heatmap: {
            onChangePageIdx,
            execute(pageIdx) {
                if (!_pickPercentages) setHeatPercentages()
                if (!_pickPercentages) return console.log('No matches found')
                pageIdx = loopIdx(pageIdx, _pickPercentages.length)
                const percent = _pickPercentages[pageIdx]
                skipToPercent(percent)
                const elVideo = document.querySelector(VIDEO_SELECTOR)
                const videoDuration = +elVideo.duration
                const timeInSeconds = videoDuration * percent / 100
                const formattedTime = getFormattedTime(timeInSeconds)
                chrome.runtime.sendMessage({ type: 'setPageIdx', pageIdx, time: formattedTime, totalTime: getFormattedTime(videoDuration) })
            }
        }
    }

    //* Execute the main function
    mainFunctions[_page][_funcName](_argsObj)

}

