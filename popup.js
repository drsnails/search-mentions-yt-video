'use strict'

var gElSearchBtn
var gElForm
var gElSearchInput

window.addEventListener('DOMContentLoaded', () => {
    onInit()
})


function onInit() {
    gElForm = document.querySelector('form')
    gElSearchBtn = document.querySelector('.search-btn')
    gElSearchInput = document.querySelector('.search-input')
    addEventListeners()

    // chrome.runtime.onMessage.addListener(({ type, isRunningScroll }) => {
    //     if (type === 'queue') {
    //         onToggleImgLoader()
    //     } else if (type === 'scroll') {
    //         changeStopBtnTxt(isRunningScroll)
    //     }
    // })

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
        // await chrome.scripting.executeScript({
        //     target: { tabId: tab.id },
        //     function: getTranscriptTimestamps,
        //     args: [{
        //         term: searchTerm
        //     }]
        // })
    } catch (error) {
        console.log('error:', error)

    } finally {
        saveToStorage('searchTerm', searchTerm)
    }
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
}


function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data))
}

function loadFromStorage(key) {
    const data = localStorage.getItem(key)
    return JSON.parse(data)
}

