import { Download } from "../shared/download.js"
//__init___Code that is executed in the beginning__________________________________________________________________
let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
let currentTab = null
let port = null;
if (tabs.length != 1) {
    console.error("Not exactly one active tab in this window, but" + tabs.length)
    alert("Ein Fehler ist aufgetreten. Es wurden " + tabs.length + " Tabs erkannt. Bitte versuche es erneut oder starte Chrome neu.")
} else {
    currentTab = tabs[0]
    port = chrome.runtime.connect({
        name: currentTab.title
    })
}

let pendingResponses = {};
//Handle incoming messages
port.onMessage.addListener((msg) => {
    //console.log("Received Message from ", port.sender)
    console.log("Received message: ", msg)
    if (pendingResponses[msg.id]) {
        pendingResponses[msg.id](msg.payload)
        delete pendingResponses[msg.id]
    } else {
        if (msg.type === "UPDATE") {
            update(msg.payload)
        }
    }
})

document.getElementById("submit-download").addEventListener("click", download)

getFormats()
getDownloads()

//__method_declarations________________________________________________________________________________________
function log(...data) {
    console.log(...data)
    forwardToBackground({
        "type": "LOG",
        "payload": data
    })
}

function forwardToBackground(obj) {
    obj.id = crypto.randomUUID()
    port.postMessage(obj);
    //return obj.id
}

function sendRequest(msg) {
    return new Promise((resolve, reject) =>{
        console.log("Send message to background:", msg)
        forwardToBackground(msg)
        pendingResponses[msg.id] = resolve;
    })
}

function sendGet(method) {
    return sendRequest({
        "type": method
    })
}

async function getFormats() {
    let response = await sendGet("GetFormats")
        
    response.forEach(format => {
        let option = document.createElement("option")
        option.value = format
        option.innerText = format
        document.getElementById("format").appendChild(option)
    })
}

/**
 * 
 * @param {*} tagName 
 * @param {*} className 
 * @param {*} innerText 
 * @param {Element} parent 
 */
function createElement(tagName, classes, innerText, parent) {
    let element = document.createElement(tagName)

    if (Array.isArray(classes)) {
        classes.forEach(classEl => element.classList.add(classEl))
    } else if (classes) {
        element.classList.add(classes)
    }

    if (innerText) {
        element.innerText = innerText
    }

    if (parent) {
        parent.appendChild(element)
    }
    return element
}

/**
 * 
 * @param {Download} downloadObj 
 */
function createDownloadElement(downloadObj) {
    let download = document.createElement("div")
    download.id = downloadObj.id

    let description = createElement("div", "description", "", download)
    createElement("div", "format", downloadObj.targetFormat, description)
    let title = downloadObj.title? downloadObj.title : ""
    createElement("div", "title", title, description)

    let status = createElement("div", "status", "", download)
    createElement("div", "state", downloadObj.state, status)
    createElement("div", "progress", downloadObj.progress, status)
    return download;
}

async function getDownloads() {
    /**
     * @type Download[]
     */
    let response = await sendGet("GetDownloads")
        
    response.forEach(downloadObj => {
        document.getElementById("downloads").appendChild(createDownloadElement(downloadObj))
    })
}

function download() {
    let message = {
        "type": "YT-DLP",
        "payload": {
            "audio-format" : document.getElementById("format").value,
            "url" : currentTab.url,
            "tabTitle": currentTab.title
        }
    }
    forwardToBackground(message)
}

/**
 * 
 * @param {Download} downloadObj 
 */
function update(downloadObj) {
    //console.log("UPDATE", downloadObj.id)
    let downloadElement = document.getElementById(downloadObj.id)
    let downloadsElement = document.getElementById("downloads")
    if (!downloadElement) {
        //console.log("Create Download HTML Element")
        downloadElement = createDownloadElement(downloadObj)
        downloadsElement.appendChild(downloadElement)
    } else {
        //console.log("Update existing Download HTML Element")
        let titleElement = downloadElement.getElementsByClassName("title").item(0)
        let stateElements = downloadElement.getElementsByClassName("state")
        let stateElement = stateElements.item(stateElements.length-1)
        let progressElements = downloadElement.getElementsByClassName("progress")
        let progressElement = progressElements.item(progressElements.length-1)

        if (downloadObj.title && (titleElement.innerText === "" || titleElement.innerText !== downloadObj.title)) {
            titleElement.innerText = downloadObj.title
        }

        if (stateElement.innerText === downloadObj.state) {
            //console.log("Update progress of state", downloadObj.state)
            progressElement.innerText = downloadObj.progress
        } else {
            //console.log("Create new status element for new state", downloadObj.state)
            log(Object.values(Download.Progress), progressElement.innerText)
            if (Object.values(Download.Progress).includes(progressElement.innerText)) {
                if (downloadObj.state === Download.State.ABORTED) {
                    progressElement.innerText = Download.Progress.ERROR
                } else {
                    progressElement.innerText = Download.Progress.FINISHED
                }
            }

            let newStatus = createElement("div", "status", "", downloadElement)
            createElement("div", "state", downloadObj.state, newStatus)
            createElement("div", "progress", downloadObj.progress, newStatus)
        }
    }
}