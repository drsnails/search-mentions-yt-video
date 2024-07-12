'use strict'

var gElSearchBtn
var gElForm
var gElSearchInput
var gPageIdx = 0
var gElPrevBtn
var gElNextBtn
var gElPageResult

window.addEventListener('DOMContentLoaded', () => {
    onInit()
})


function onInit() {
    gElForm = document.querySelector('form')
    gElSearchBtn = document.querySelector('.search-btn')
    gElSearchInput = document.querySelector('.search-input')
    gElPrevBtn = document.querySelector('.prev-btn')
    gElNextBtn = document.querySelector('.next-btn')
    gElPageResult = document.querySelector('.page-result')
    const searchTerm = loadFromStorage('searchTerm')
    gElSearchInput.value = searchTerm || ''
    addEventListeners()
    chrome.runtime.onMessage.addListener(({ type, pageIdx }) => {
        if (type === 'search') {
            showPagination()
        } else if (type === 'setPageIdx') {
            gPageIdx = pageIdx
            gElPageResult.innerText = gPageIdx + 1
        }
    })

}


async function onSearch(ev) {
    ev.preventDefault()
    const searchTerm = gElSearchInput.value
    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        executeContentScript(tab, {
            funcName: 'getTranscriptTimestamps',
            searchTerm
        })

    } catch (error) {
        console.log('error:', error)

    } finally {
        saveToStorage('searchTerm', searchTerm)
    }
}

async function onChangePageIdx(diff) {
    gPageIdx += diff
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    executeContentScript(tab, {
        funcName: 'onChangePageIdx',
        pageIdx: gPageIdx,
        searchTerm: gElSearchInput.value
    })
}


async function executeContentScript(tab, argsObj = {}) {
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: injectedFunction,
        args: [argsObj]
    });
}


function addEventListeners() {
    gElForm.addEventListener('submit', onSearch)
    gElPrevBtn.addEventListener('click', () => onChangePageIdx(-1))
    gElNextBtn.addEventListener('click', () => onChangePageIdx(1))
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
}

function showSearchInput() {
    showElement('.search-input-container')
    hideElement('.pagination')
}


function showElement(selector) {
    const el = document.querySelector(selector)
    el.classList.remove('hide')
}

function hideElement(selector) {
    const el = document.querySelector(selector)
    el.classList.add('hide')
}