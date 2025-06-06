import { Download } from "../shared/download.js"
import { YtdlpCache } from "../shared/ytdlpcache.js";
import { config } from "../shared/config.js";

//__config__
let isLogging = config.isLogging

//__init___Code that is executed in the beginning__________________________________________________________________

let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
let currentTab = null
if (tabs.length != 1) {
    console.error(chrome.i18n.getMessage("notOneTab", String(tabs.length)), tabs)
    alert(chrome.i18n.getMessage("notOneTab", String(tabs.length)))
} else {
    currentTab = tabs[0]
}

let connected = false;
let port = getNewPort();

let pendingResponses = {};
//Handle incoming messages

let hasAddedDownloadHeader = false;

init()

//__method_declarations________________________________________________________________________________________
function log(...data) {
    if (isLogging) {
        console.log(...data)
        forwardToBackground({
            "type": "LOG",
            "payload": data
        })
    }
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
        //log("Received Message from ", port.sender)
        log("Received message: ", msg)
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
        log("Send message to background:", msg)
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

    return formats;
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

    let header = document.getElementById("downloadsHeader") 
    header.classList.remove("hidden")
    if (header.innerText === "") header.innerText = chrome.i18n.getMessage("downloads")
    
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
    //log("UPDATE", downloadObj.id)
    let downloadElement = document.getElementById(downloadObj.id)

    if (!downloadElement) {
        //log("Create Download HTML Element")
        downloadElement = createDownloadElement(downloadObj)
    } else {
        //log("Update existing Download HTML Element")
        let titleElement = downloadElement.getElementsByClassName("title").item(0)
        let stateElements = downloadElement.getElementsByClassName("state")
        let stateElement = stateElements.item(stateElements.length-1)
        let progressElements = downloadElement.getElementsByClassName("progress")
        let progressElement = progressElements.item(progressElements.length-1)
        
        if (downloadObj.title && (titleElement.innerText === "" || titleElement.innerText !== downloadObj.title)) {
            titleElement.innerText = downloadObj.title
        }

        if (stateElement.innerText === downloadObj.state) {
            //log("Update progress of state", downloadObj.state)
            progressElement.innerText = downloadObj.progress
        } else {
            //log("Create new status element for new state", downloadObj.state)
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

// async function getCurrentDownloadPath() {
//     /**
//      * @type String
//      */
//     let path = (await YtdlpCache.get(YtdlpCache.KEYS.DOWNLOAD_PATH))[YtdlpCache.KEYS.DOWNLOAD_PATH]
//     if (!path || path.trim().length == 0) {
//         path = await sendGet("loadPath")
//     }
//     document.getElementById("downloadPath").innerText = path
// }

async function setDownloadPath() {
    let path = await sendGet("SetDownloadPath")
    //document.getElementById("downloadPath").innerText = path
}

async function init() {
    let formats = await getFormats()

    log(formats)

    
    if (formats && formats.length > 0) {
        document.getElementById("submit-download").addEventListener("click", download)
        document.getElementById("downloadPathButton").addEventListener("click", setDownloadPath)

        //getCurrentDownloadPath()
        getDownloads()

        document.getElementById("submit-download").innerText = chrome.i18n.getMessage("download")
        document.getElementById("downloadPathButton").innerText = chrome.i18n.getMessage("downloadPath")

        let coll = document.getElementById("optionsButton");
        coll.innerText = chrome.i18n.getMessage("options")
        coll.addEventListener("click", function() {
            
            let content = coll.nextElementSibling;
            coll.classList.toggle("active");
            content.classList.toggle("active");
            if (content.style.maxHeight){
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        })
        

        let popup = document.getElementById("download-popup");
        popup.classList.remove("hidden")
    } else {
        let popup = document.getElementById("setup-popup");
        popup.innerText = chrome.i18n.getMessage("nativeHostNotReachable")
        popup.classList.remove("hidden")
    }
    document.getElementById("setup-popup").innerText = chrome.i18n.getMessage("nativeHostNotReachable")

    
}