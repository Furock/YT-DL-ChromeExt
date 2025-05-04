import { Download } from "../shared/download.js"
import { YtdlpCache } from "../shared/ytdlpcache.js";

//__init___Code that is executed in the beginning__________________________________________________________________

let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
let currentTab = null
if (tabs.length != 1) {
    console.error("Not exactly one active tab in this window, but" + tabs.length)
    alert("Ein Fehler ist aufgetreten. Es wurden " + tabs.length + " Tabs erkannt. Bitte versuche es erneut oder starte Chrome neu.")
} else {
    currentTab = tabs[0]
}

let connected = false;
let port = getNewPort();




let pendingResponses = {};
//Handle incoming messages

document.getElementById("submit-download").addEventListener("click", download)
document.getElementById("downloadPathButton").addEventListener("click", setDownloadPath)

getFormats()

getCurrentDownloadPath()

let hasAddedDownloadHeader = false;

getDownloads()

//__method_declarations________________________________________________________________________________________
function log(...data) {
    console.log(...data)
    forwardToBackground({
        "type": "LOG",
        "payload": data
    })
}

function getNewPort() {
    let port = chrome.runtime.connect({
        name: currentTab.title
    })
    connected = true;

    port.onDisconnect.addListener(() => {
        connected = false
    })

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
    return port;
}

function getPort() {
    if (!connected) {
        port = getNewPort() 
    }
    return port;
}

function forwardToBackground(obj) {
    obj.id = crypto.randomUUID()
    getPort().postMessage(obj);
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
    let defaultFormat = (await YtdlpCache.get(YtdlpCache.KEYS.DEFAULT_FORMAT))[YtdlpCache.KEYS.DEFAULT_FORMAT]

    /**
     * @type String[]
     */
    let formats = (await YtdlpCache.get(YtdlpCache.KEYS.FORMATS))[YtdlpCache.KEYS.FORMATS]
    if (!formats) {
        formats = await sendGet("GetFormats")
    }
        
    formats.forEach(format => {
        let option = document.createElement("option")
        option.value = format
        option.innerText = format
        document.getElementById("format").appendChild(option)
    })

    if (formats.includes(defaultFormat)) {
        document.getElementById("format").value = defaultFormat
    }

    if (formats.length > 0) {
        let popup = document.getElementById("download-popup");
        popup.classList.remove("hidden")
    }
    
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
    let downloads = document.getElementById("downloads")

    if (!hasAddedDownloadHeader) {
        let header = document.createElement("h3")
        header.style.marginBottom="unset"
        header.style.borderBottom="1px solid black"
        header.style.marginTop="0.5em"
        header.innerText = "Downloads"
        downloads.before(header)
        hasAddedDownloadHeader = true

        //document.getElementById("downloadPathPlaceholder").style.height = "1px"
    }
    
    let download = createElement("div", "download", null, downloads)
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
        createDownloadElement(downloadObj)
    })
}

function download() {
    let format = document.getElementById("format").value;
    YtdlpCache.set(YtdlpCache.KEYS.DEFAULT_FORMAT, format)
    let message = {
        "type": "YT-DLP",
        "payload": {
            "audio-format" : format,
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

    if (!downloadElement) {
        //console.log("Create Download HTML Element")
        downloadElement = createDownloadElement(downloadObj)
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

async function getCurrentDownloadPath() {
    /**
     * @type String
     */
    let path = (await YtdlpCache.get(YtdlpCache.KEYS.DOWNLOAD_PATH))[YtdlpCache.KEYS.DOWNLOAD_PATH]
    if (!path || path.trim().length == 0) {
        path = await sendGet("GetDownloadPath")
    }
    document.getElementById("downloadPath").innerText = path
    //document.getElementById("downloadPathPlaceholder").innerText = path
}

async function setDownloadPath() {
    let path = await sendGet("SetDownloadPath")
    document.getElementById("downloadPath").innerText = path
    //document.getElementById("downloadPathPlaceholder").innerText = path
}