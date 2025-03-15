'use strict'

//* state management at content script level
let contentPageIdx = 0
let contentSearchResults = null

chrome.runtime.onMessage.addListener(({ type, command, pageIdx, page, searchTerm, direction }) => {
    try {
        if (type === 'command') {
            //* If pageIdx is provided (from popup), use it, otherwise calculate new index
            const newPageIdx = (pageIdx !== undefined)
                ? pageIdx
                : contentPageIdx + (command.startsWith('increment-page') ? 1 : -1)

            contentPageIdx = newPageIdx //* Update our local state
            page ||= 'heatmap'
            const args = {
                page,
                funcName: 'onChangePageIdx',
                pageIdx: newPageIdx,
                searchTerm,
                direction: command.startsWith('increment-page') ? 1 : -1,
                isSkipToClosest: command.endsWith('from-time')
            }
            injectedFunction(args)
        }
    } catch (err) {
        console.error('Error handling command message:', err)
    }
});

const forwardKeyCodes = ['KeyX', 'Period']
const backwardKeyCodes = ['KeyZ', 'Comma']
document.addEventListener('keydown', (ev) => {
    try {
        if (ev.altKey) {
            if (forwardKeyCodes.includes(ev.code)) {
                chrome.runtime.sendMessage({ type: 'keybind', altKey: ev.altKey, shiftKey: ev.shiftKey, key: 'x' });
            } else if (backwardKeyCodes.includes(ev.code)) {
                chrome.runtime.sendMessage({ type: 'keybind', altKey: ev.altKey, shiftKey: ev.shiftKey, key: 'z' });
            }
        }
    } catch (err) {
        console.error('Error handling keydown:', err)
    }
})

var gIsVideoBuffering = false
var gElVideo = null
// Add more robust buffering state management
let gBufferingTimeout = null

// Create a map to store event listener references
const videoEventListeners = new Map();

// Initial setup
function setupVideoListeners() {
    // Check if video element exists
    const elVideo = document.querySelector('#movie_player > div.html5-video-container > video');
    if (elVideo) {
        attachVideoEventListeners(elVideo);
        return elVideo;
    }
    // Retry after a short delay if video not found
    setTimeout(setupVideoListeners, 1000);
    return null;
}


function handleWaiting() {
    // Clear any existing timeout
    if (gBufferingTimeout) clearTimeout(gBufferingTimeout);
    
    gIsVideoBuffering = true;
    chrome.runtime.sendMessage({ type: 'buffering-start' });
    
    // Set a timeout to reset buffering state if waiting too long
    gBufferingTimeout = setTimeout(() => {
        gIsVideoBuffering = false;
        chrome.runtime.sendMessage({ type: 'buffering-timeout' });
    }, 10000); // 10 second timeout
}

function handlePlaying() {
    if (gBufferingTimeout) clearTimeout(gBufferingTimeout);
    gIsVideoBuffering = false;
    chrome.runtime.sendMessage({ type: 'buffering-end' });
}

function attachVideoEventListeners(elVideo) {
    // Remove any existing listeners first
    removeVideoEventListeners(elVideo);
    
    // Create named functions for each listener so we can remove them later
    const waitingListener = () => handleWaiting();
    const playingListener = () => handlePlaying();
    const playListener = () => chrome.runtime.sendMessage({ type: 'play' });
    const pauseListener = () => chrome.runtime.sendMessage({ type: 'pause' });
    
    // Store listeners in map
    videoEventListeners.set(elVideo, {
        waiting: waitingListener,
        playing: playingListener,
        play: playListener,
        pause: pauseListener
    });
    
    // Attach listeners
    elVideo.addEventListener('waiting', waitingListener);
    elVideo.addEventListener('playing', playingListener);
    elVideo.addEventListener('play', playListener);
    elVideo.addEventListener('pause', pauseListener);
}

function removeVideoEventListeners(elVideo) {
    if (!elVideo) return;
    
    const listeners = videoEventListeners.get(elVideo);
    if (listeners) {
        elVideo.removeEventListener('waiting', listeners.waiting);
        elVideo.removeEventListener('playing', listeners.playing);
        elVideo.removeEventListener('play', listeners.play);
        elVideo.removeEventListener('pause', listeners.pause);
        videoEventListeners.delete(elVideo);
    }
}

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            const elNewVideo = document.querySelector('#movie_player > div.html5-video-container > video');
            if (elNewVideo && elNewVideo !== gElVideo) {
                console.log('Video element changed, updating listeners');
                // Remove existing listeners from old video if it exists
                if (gElVideo) {
                    removeVideoEventListeners(gElVideo);
                }

                // Attach new listeners
                attachVideoEventListeners(elNewVideo);

                // Update global reference
                gElVideo = elNewVideo;
            }
        }
    });
});

// Start observing the document with the configured parameters
observer.observe(document.body, { 
    childList: true, 
    subtree: true 
});


function injectedFunction({
    funcName: _funcName,
    searchTerm: _searchTerm,
    pageIdx: _pageIdx,
    page: _page,
    percent: _percent,
    seconds: _seconds,
    volume: _volume,
    direction: _direction,
    isSkipToClosest: _isSkipToClosest,
}) {
    const _argsObj = {
        _page,
        _funcName,
        _searchTerm,
        _pageIdx,
        _percent,
        _seconds,
        _direction,
        _isSkipToClosest
    }
    // console.log('_argsObj:', _argsObj)
    const TRANSCRIPTS_SEGS_SELECTOR = '#segments-container > ytd-transcript-segment-renderer > div'
    const SVG_SELECTOR = 'div.ytp-heat-map-container > div.ytp-heat-map-chapter > svg'
    const VIDEO_SELECTOR = "#movie_player > div.html5-video-container > video"


    //* ------------------- Transcript -------------------
    var _matchedElScriptSegs
    var _peakPercentages
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
        const orTerms = expr.split(/\|\||OR/).map(term => term.trim())

        return orTerms.some(orTerm => {
            const andTerms = orTerm.split(/&&|AND/).map(term => term.trim())
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
            if (lastSlashIdx > 0) { //* if second "/" exist, (not -1) and not equal to the first one, (not 0) 
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
        contentSearchResults = _matchedElScriptSegs
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
            const { formattedTotalTime } = getTimeFromVideo()
            chrome.runtime.sendMessage({ type: 'search', totalTime: formattedTotalTime })
            clearTimeout(intervalId)
        }, 1000)

    }

    //* ------------------- Heatmap -------------------

    /**
     * Finds the highest peaks in an SVG path data string based on prominence.
     *
     * @param {string} pathData - The SVG path data string.
     * @param {number} [prominenceThreshold=2] - The threshold for peak prominence as a percentage of the maximum prominence.
     * @param {number} [percentCorrection=0.6] - The correction factor to adjust the peak x-locations percentages.
     * @returns {Object} An object containing the peak percentages.
     * @returns {string[]} peakPercentages - An array of peak x-locations as percentages of the total width.
     */
    function findHighestPeaksInSVGPath(pathData, prominenceThreshold = 2, percentCorrection = 0.6) {

        //* Extract all numbers from the path data
        const numbers = pathData
            .replace(/[a-zA-Z,]/g, ' ')
            .trim()
            .split(/\s+/)
            .map(parseFloat)

        //* Group numbers into x and y coordinate pairs
        let points = []
        for (let i = 0; i < numbers.length; i += 2) {
            points.push({ x: numbers[i], y: numbers[i + 1] })
        }

        //* Filter out points with duplicate y-values
        //TODO: Potentially can fix the missing peaks bug. check for any issues
        points = points.filter((point, idx, _points) =>
            idx === _points.findIndex(p => p.y === point.y)
        )
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

        //* Convert peak x-locations to percentages of the total width
        const peakPercentages = significantPeaks.map(p => ((p.peak.x / maxX) * 100 - percentCorrection).toFixed(2))


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

    function updateVideoTime(seconds) {
        const elVideo = document.querySelector(VIDEO_SELECTOR)
        elVideo.currentTime += seconds
        sendTimeData(elVideo.currentTime / elVideo.duration * 100)
    }

    function updateAudioVolume(volume) {
        return
        const elVideo = document.querySelector(VIDEO_SELECTOR)
        const timeFactor = 1 + volume
        elVideo.volume *= timeFactor
    }

    function togglePlay() {
        const elVideo = document.querySelector(VIDEO_SELECTOR)
        elVideo.paused ? elVideo.play() : elVideo.pause()
    }

    function changeTime(percent) {
        skipToPercent(percent)
        sendTimeData(percent)
    }

    function onTimeInterval() {
        sendTimeData()
    }


    function sendTimeData(percent, type = 'change-time') {
        const { formattedCurrTime, formattedTotalTime, percent: _percent, videoDuration } = getTimeFromVideo()
        chrome.runtime.sendMessage({
            type,
            percent: percent ?? _percent,
            time: formattedCurrTime,
            totalTime: formattedTotalTime,
            videoDuration
        })
    }

    function getHeatMapPath() {
        const elSvg = document.querySelector(SVG_SELECTOR)
        if (!elSvg) return
        const path = elSvg.querySelector('path').getAttribute('d')
        return path
    }

    function setHeatPercentages() {
        const pathData = getHeatMapPath()
        if (!pathData) return ''
        const { videoDuration } = getTimeFromVideo()
        const minutes = videoDuration / 60
        let percentCorrection = 0.6
        if (minutes < 12) percentCorrection = 1.2
        if (minutes > 45) percentCorrection = 0.4
        const { peakPercentages } = findHighestPeaksInSVGPath(pathData, 3, percentCorrection)
        _peakPercentages = peakPercentages
        //* Store the results in the content script scope
        contentSearchResults = peakPercentages
    }

    function loopIdx(idx, length) {
        let newIdx = idx
        if (newIdx < 0) newIdx = length - 1
        if (newIdx >= length) newIdx = 0
        return newIdx
    }

    function onChangePageIdx({ _pageIdx = 0, _direction }) {

        if (!contentSearchResults) {
            if (_page === 'heatmap') {
                setHeatPercentages()
            } else {
                setMatchedScriptsSegs(_searchTerm)
            }
        }

        if (contentSearchResults) {
            contentPageIdx = loopIdx(_pageIdx, contentSearchResults.length)
        }

        mainFunctions[_page].execute(_pageIdx, _direction)
    }

    function getFormattedTime(videoDuration) {
        const pad = time => (time + '').padStart(2, '0')
        const hours = Math.floor(videoDuration / 3600)
        const minutes = Math.floor((videoDuration % 3600) / 60)
        const seconds = Math.floor(videoDuration % 60)
        const formattedSeconds = pad(seconds)
        const formattedMinutes = hours ? pad(minutes) : minutes
        let formattedTime = `${formattedMinutes}:${formattedSeconds}`
        if (hours) formattedTime = `${hours}:${formattedTime}`
        return formattedTime
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
                elMatch.click()

                const { formattedCurrTime, percent } = getTimeFromVideo()
                chrome.runtime.sendMessage({ type: 'setPageIdx', pageIdx, time: formattedCurrTime, percent })
            }
        },
        heatmap: {
            onChangePageIdx,
            execute(pageIdx, direction) {
                if (!_peakPercentages) setHeatPercentages()
                if (!_peakPercentages) return console.log('No matches found')

                const { videoDuration, formattedTotalTime, currTime: prevSkippedTime } = getTimeFromVideo()

                if (_isSkipToClosest) {
                    let nextPageIdx
                    if (direction === 1) {
                        nextPageIdx = _peakPercentages.findIndex(peakPercent => +peakPercent / 100 * videoDuration > prevSkippedTime)
                        if (nextPageIdx && nextPageIdx !== -1) {
                            // console.log('\n\n****************************************');
                            // console.log('nextPageIdx:', nextPageIdx)
                            // console.log('pageIdx:', pageIdx)
                            // console.log('contentPageIdx:', contentPageIdx)
                            // console.log('gIsVideoBuffering:', gIsVideoBuffering)
                            // console.log('****************************************\n\n');
                            //* If we're moving from current peak to next peak (diff of 1)
                            //* AND we're currently at the same peak (pageIdx matches contentPageIdx)
                            //* AND video is buffering or paused, skip to next peak
                            //*** Otherwise the video will not skip to the next peak ***//
                            if (gIsVideoBuffering && pageIdx === nextPageIdx - 1) {
                                nextPageIdx++
                            }
                            pageIdx = nextPageIdx
                        }
                    } else if (direction === -1) {
                        // nextPageIdx = _peakPercentages.findLastIndex(peakPercent => +peakPercent / 100 * videoDuration < prevSkippedTime)
                    }
                }

                pageIdx = loopIdx(pageIdx, _peakPercentages.length)
                contentPageIdx = pageIdx

                const percent = _peakPercentages[pageIdx]
                skipToPercent(+percent + 0.00001)
                const calculatedTimeInSeconds = videoDuration * percent / 100
                const formattedTime = getFormattedTime(calculatedTimeInSeconds)
                chrome.runtime.sendMessage({ type: 'setPageIdx', pageIdx, time: formattedTime, totalTime: formattedTotalTime, percent })
            }
        }
    }

    function getTimeFromVideo() {
        const elVideo = document.querySelector(VIDEO_SELECTOR)
        const videoDuration = +elVideo.duration
        const currTime = +elVideo.currentTime
        const percent = currTime / videoDuration * 100
        const formattedCurrTime = getFormattedTime(currTime)
        const formattedTotalTime = getFormattedTime(videoDuration)
        return { formattedCurrTime, formattedTotalTime, percent, videoDuration, currTime, elVideo }
    }

    function init() {
        // alert('init')
        const pathData = getHeatMapPath()
        if (!pathData) return
        const elVideo = document.querySelector(VIDEO_SELECTOR)
        const videoDuration = getFormattedTime(+elVideo.duration)
        chrome.runtime.sendMessage({ type: elVideo.paused ? 'pause' : 'play' })
        chrome.runtime.sendMessage({ type: 'heatmap-path', path: pathData, totalTime: videoDuration })
        sendTimeData()
    }

    //* Execute the main function
    if (_funcName === 'init') init()
    else if (_funcName === 'changeTime') changeTime(_percent)
    else if (_funcName === 'sendTimeData') sendTimeData(_percent, 'send-time')
    else if (_funcName === 'togglePlay') togglePlay()
    else if (_funcName === 'updateVideoTime') updateVideoTime(_seconds)
    else if (_funcName === 'updateAudioVolume') updateAudioVolume(_volume)
    else if (_funcName === 'onTimeInterval') onTimeInterval()
    else mainFunctions[_page][_funcName](_argsObj)

}

