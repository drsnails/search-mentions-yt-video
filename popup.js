'use strict'

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

window.addEventListener('DOMContentLoaded', () => {
    onInit()
})


function onInit() {
    gElForm = document.querySelector('form')
    gElSearchBtn = document.querySelector('.search-btn')
    gElSearchInput = document.querySelector('.search-input')
    gElPrevBtn = document.querySelector('.prev-btn')
    gElNextBtn = document.querySelector('.next-btn')
    gElBackBtn = document.querySelector('.back-btn')
    gElPageResult = document.querySelector('.page-result')
    gElCurrentTime = document.querySelector('.current-time')
    gElTotalTime = document.querySelector('.total-time')
    const searchTerm = loadFromStorage('searchTerm')
    gElSearchInput.value = searchTerm || ''
    addEventListeners()
    chrome.runtime.onMessage.addListener(({ type, pageIdx, segTime, totalTime }) => {
        if (type === 'search') {
            showPagination()
            gElTotalTime.innerText = totalTime
        } else if (type === 'setPageIdx') {
            gPageIdx = pageIdx
            gElPageResult.innerText = gPageIdx + 1
            gElCurrentTime.innerText = segTime
        } else if (type === 'no-matches') {
            console.log('No matches found')
        }
    })

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
            funcName: 'getTranscriptTimestamps',
            searchTerm
        })

    } catch (error) {
        console.log('error:', error)
    }
}

async function onChangePageIdx(diff) {
    gPageIdx += diff
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    executeContentScript(tab, {
        funcName: 'onChangePageIdx',
        pageIdx: gPageIdx,
        searchTerm: gElSearchInput.value.trim()
    })
}



async function executeContentScript(tab, argsObj = {}) {
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: injectedFunction,
        args: [argsObj]
    });
}

const onInputSearch = _debounce((ev) => {
    const searchTerm = ev.target.value.trim()
    saveToStorage('searchTerm', searchTerm)
}, 700)

function addEventListeners() {
    gElForm.addEventListener('submit', onSearch)
    gElPrevBtn.addEventListener('click', () => onChangePageIdx(-1))
    gElNextBtn.addEventListener('click', () => onChangePageIdx(1))
    gElBackBtn.addEventListener('click', showSearchInput)
    gElSearchInput.addEventListener('input', onInputSearch)
}


function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data))
}

function loadFromStorage(key) {
    const data = localStorage.getItem(key)
    return JSON.parse(data)
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