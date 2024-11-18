'use strict'

var gPage = 'transcript'
var gHeatMapPath
var gElSearchBtn
var gElForm
var gElSearchInput
var gPageIdx = 0
var gElPrevBtn
var gElNextBtn
var gElBackBtn
var gElPageResult
var gElCurrentTime
var gElTotalTime

let videoTimeInterval;

window.addEventListener('DOMContentLoaded', () => {
    onInit()
})


function onInit() {
    setGlobalElements()
    addEventListeners()

    startVideoTimeInterval()
    const searchTerm = _loadFromStorage('searchTerm')
    gElSearchInput.value = searchTerm || ''
    executeCurrentContentScript({ funcName: 'init' })
    chrome.runtime.onMessage.addListener(({ type, pageIdx, time, totalTime, command, path, percent }) => {
        switch (type) {
            case 'search':
                showPagination();
                gElTotalTime.innerText = totalTime;
                break;
            case 'setPageIdx':
                gPageIdx = pageIdx;
                gElPageResult.innerText = gPageIdx + 1;
                renderTime(time, totalTime, percent);
                break;
            case 'heatmap-path':
                setPathInSvg(path);
                break;
            case 'change-time':
                console.log('change-time')
                renderTime(time, totalTime, percent);
                break;
            case 'no-matches':
                console.log('No matches found');
                break;
            case 'command':
                if (command === 'increment-page') onIncrementPage();
                if (command === 'decrement-page') onDecrementPage();
                break;
            case 'play':
                startVideoTimeInterval()
                break;
            case 'pause':
                stopVideoTimeInterval()
                break;
            default:
                console.log('Unknown message type:', type);
        }
    })
}

function renderTime(time, totalTime, percent) {
    gElCurrentTime.innerText = time
    totalTime && (gElTotalTime.innerText = totalTime)
    percent && insertRedLine(window.innerWidth * (+percent / 100))
}


function setGlobalElements() {

    const elPageContainer = document.querySelector(`.${gPage}-search`)

    gElForm = elPageContainer.querySelector('form')
    gElSearchBtn = elPageContainer.querySelector('.search-btn')
    gElSearchInput = elPageContainer.querySelector('.search-input')
    gElPrevBtn = elPageContainer.querySelector('.prev-btn')
    gElNextBtn = elPageContainer.querySelector('.next-btn')
    gElBackBtn = elPageContainer.querySelector('.back-btn')
    gElPageResult = elPageContainer.querySelector('.page-result')
    gElCurrentTime = elPageContainer.querySelector('.current-time')
    gElTotalTime = elPageContainer.querySelector('.total-time')

}


function addEventListeners() {
    addPageEventListeners()
    document.querySelector('.navigation').addEventListener('click', onChangePage)
    document.querySelector('svg').addEventListener('click', onSvgHeatmapClick)
    document.addEventListener('keydown', onKeyDown)
}



function addPageEventListeners() {
    gElForm.addEventListener('submit', onSearch)
    gElPrevBtn.addEventListener('click', onDecrementPage)
    gElNextBtn.addEventListener('click', onIncrementPage)
    gElBackBtn && gElBackBtn.addEventListener('click', showSearchInput)
    gElSearchInput && gElSearchInput.addEventListener('input', onInputSearch)
}



function startVideoTimeInterval() {
    if (videoTimeInterval) return;
    videoTimeInterval = setInterval(async () => {
        executeCurrentContentScript({ funcName: 'onTimeInterval' })
    }, 1000);
}

async function onSearch(ev) {
    ev.preventDefault()
    const elSrcBtn = ev.target.querySelector('.search-btn')
    const searchTerm = gElSearchInput.value.trim()
    if (!searchTerm) {
        gElSearchInput.focus()
        return _animateCSS(elSrcBtn, 'shake')
    }

    const formattedSearchTerm = formatSearchTerm(searchTerm)
    document.querySelector('span.term-title span').innerText = formattedSearchTerm
    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        executeContentScript(tab, {
            page: gPage,
            funcName: 'getTranscriptTimestamps',
            searchTerm
        })

    } catch (error) {
        console.log('error:', error)
    }
}

async function onIncrementPage() {
    // console.log('onIncrementPage - popup');

    const newPageIdx = gPageIdx + 1
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.tabs.sendMessage(tab.id, {
        type: 'command',
        command: 'increment-page',
        pageIdx: newPageIdx,
        page: gPage,
        searchTerm: gElSearchInput?.value.trim()
    });
    onChangePageIdx(1)
}

function setPathInSvg(path) {
    if (gHeatMapPath === path) return
    gHeatMapPath = path
    const elPath = document.querySelector('.yt-heat-map-path')
    elPath.setAttribute('d', path)
}

async function onDecrementPage() {
    const newPageIdx = gPageIdx - 1
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.tabs.sendMessage(tab.id, {
        type: 'command',
        command: 'decrement-page',
        pageIdx: newPageIdx,
        page: gPage,
        searchTerm: gElSearchInput?.value.trim()
    });
    onChangePageIdx(-1)
}

async function onChangePageIdx(diff) {
    // console.log('onChangePageIdx - popup');

    gPageIdx += diff
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const pageVals = {
        transcript: {
            searchTerm: gElSearchInput?.value.trim()
        }
    }
    executeContentScript(tab, {
        page: gPage,
        funcName: 'onChangePageIdx',
        pageIdx: gPageIdx,
        ...pageVals[gPage]
    })
}


async function executeCurrentContentScript(argsObj = {}) {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    executeContentScript(tab, argsObj)
}

async function executeContentScript(tab, argsObj = {}) {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: injectedFunction,
        args: [{ ...argsObj, page: gPage }]
    });
}

const onInputSearch = _debounce((ev) => {
    const searchTerm = ev.target.value.trim()
    _saveToStorage('searchTerm', searchTerm)
}, 700)

function onKeyDown(ev) {
    if (document.activeElement.tagName === 'INPUT') return
    let seconds = 5
    if (ev.shiftKey) seconds = 10

    if (ev.key === ' ') {
        executeCurrentContentScript({ funcName: 'togglePlay' })
    } else if (ev.key === 'ArrowRight') {
        executeCurrentContentScript({ funcName: 'updateVideoTime', seconds: seconds })
    } else if (ev.key === 'ArrowLeft') {
        executeCurrentContentScript({ funcName: 'updateVideoTime', seconds: -seconds })
    }
}

async function onSvgHeatmapClick(ev) {
    const percent = ev.x / window.innerWidth * 100
    try {
        executeCurrentContentScript({ funcName: 'changeTime', percent })

    } catch (error) {
        console.log('error:', error)
    }
}

function onChangePage(ev) {
    gPageIdx = 0
    const el = ev.target
    if (el.classList.contains('nav-btn')) {
        const navPage = el.dataset.page
        changePage(navPage)
    }

}



function changePage(navPage) {
    gPage = navPage

    const els = document.querySelectorAll('[data-page]')
    els.forEach(el => {
        el.classList.remove('active')
        if (el.dataset.page === navPage) {
            el.classList.add('active')
        }
    })
    setGlobalElements()
    addPageEventListeners()
}


function showPagination() {
    showElement('.pagination')
    hideElement('.search-input-container')
    showElement('.back-btn')
    hideElement('.search-btn')
}

function showSearchInput() {
    showElement('.search-input-container')
    hideElement('.pagination')
    showElement('.search-btn')
    hideElement('.back-btn')
}

function showElement(selector) {
    const el = document.querySelector(selector)
    el.classList.remove('hide')
}

function hideElement(selector) {
    const el = document.querySelector(selector)
    el.classList.add('hide')
}

function formatSearchTerm(str) {
    const OR = ' OR '
    const AND = ' AND '
    str = str
        .replace(/\|\|/g, OR)
        .replace(/\&\&/g, AND)
        .replace(/\s{2,}/g, ' ')


    const regex = new RegExp(`(${AND}|${OR})`, 'g')
    const strParts = str.split(regex)
    const quotedParts = strParts.map(part => {
        if (part === AND || part === OR) {
            return part
        }
        return `"${part.trim()}"`
    })

    const resStr = quotedParts.join('')
    return resStr

}

function _animateCSS(el, animationName, isRemoveClass = true) {
    return new Promise((resolve, reject) => {
        el.classList.add(animationName)

        function handleAnimationEnd(event) {
            event.stopPropagation()
            if (isRemoveClass) el.classList.remove(animationName)
            resolve('Animation ended')
        }
        el.addEventListener('animationend', handleAnimationEnd, { once: true })
    })
}

function _debounce(func, wait) {
    let timeout
    return (...args) => {
        const later = () => {
            timeout = null
            func.call(this, ...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

function insertRedLine(x, color = 'red') {
    const existingLines = document.querySelectorAll('.red-line')
    existingLines.forEach(line => line.remove())
    const line = document.createElement('div')
    line.classList.add('red-line')
    line.style.position = 'absolute'
    line.style.left = `${x}px`
    // line.style.top = '46vh'
    line.style.bottom = '0'
    line.style.width = '1px'
    line.style.height = '15%'
    line.style.backgroundColor = color
    document.body.appendChild(line)
}

function _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data))
}

function _loadFromStorage(key) {
    const data = localStorage.getItem(key)
    return JSON.parse(data)
}

function stopVideoTimeInterval() {
    clearInterval(videoTimeInterval);
    videoTimeInterval = null;
}