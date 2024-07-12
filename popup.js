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
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: getTranscriptTimestamps,
            args: [{
                term: searchTerm
            }]
        })
    } catch (error) {
        console.log('error:', error)

    }
}


function addEventListeners() {
    gElForm.addEventListener('submit', onSearch)
}


