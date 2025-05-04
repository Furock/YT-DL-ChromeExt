//TODO Ausprobieren, Fixen
import { Download } from "./shared/download.js"
import { YtdlpCache } from "./shared/ytdlpcache.js";

//__init___Code that is executed in the beginning___________________
chrome.runtime.onInstalled.addListener(YtdlpCache.clear)

/**
 * The current actual download which needs internet connection
 * @type Download
 */
let currentDownload = null
self.currentDownload = currentDownload

/**
 * @type Download[]
 */
let downloads = []

let downloadQueue = []
self.downloadQueue = downloadQueue
/**
 * @type chrome.runtime.Port[]
 */
let popupPorts = [];

/**
 * Maps native ports to their download id
 */
let portDownloadMap = new Map();

chrome.runtime.onConnect.addListener((port) => {
	log("Port opened for ", port.sender, port.name)
	popupPorts.push(port)
	
	port.onDisconnect.addListener((closedPort) => {
		log("Port closed", closedPort.sender)
		popupPorts = popupPorts.filter(port => port !== closedPort)
	})
	
	// receive Message from popup
	port.onMessage.addListener( async (msg) => {
		log("Received Message", msg, "from Sender", port.sender)
		switch (msg["type"]) {
			case "GetFormats":
				let getFormatsResp = await send(msg.type, msg.id, msg.payload)
				log("Response from native host:", getFormatsResp)
				let formats = getFormatsResp["message"]
				send("RESP:" + msg.type, msg.id, formats, port)
				YtdlpCache.set(YtdlpCache.KEYS.FORMATS, formats)
				break;
			case "GetDownloads":
				send("RESP:" + msg.type, msg.id, downloads, port)
				downloads = downloads.filter(dl => dl.state != Download.State.ABORTED && dl.state != Download.State.FINISHED)
				break;
			case "YT-DLP":
				if (!isDownloading()) {
					startDownload(msg)
				} else {
					log("Put new download in queue")
					downloadQueue[downloadQueue.length] = msg
					let download = new Download(msg.id, msg.payload["audio-format"], 
						Download.State.DOWNLOAD, Download.Progress.PENDING)
					download.title = msg.tabTitle
					update(download)
				}

				break;
			case "LOG":
				log("POPUP:", ...(msg.payload))
				break;

			case "GetDownloadPath":
				let getDownloadPathResp = await send(msg.type, msg.id, msg.payload)
				log("Response from native host:", getDownloadPathResp)
				let receivedPath = getDownloadPathResp["message"]
				send("RESP:" + msg.type, msg.id, receivedPath, port)
				YtdlpCache.set(YtdlpCache.KEYS.DOWNLOAD_PATH, receivedPath)
				break;
			case "SetDownloadPath":
				let resp = await send(msg.type, msg.id, msg.payload)
				log("Response from native host:", resp)
				let path = resp["message"]
				send("RESP:" + msg.type, msg.id, path, port)
				YtdlpCache.set(YtdlpCache.KEYS.DOWNLOAD_PATH, path)
				break;
			default:
				error("Received message with unknown message type " + msg["type"])
				break;
		}
	})
})

//__methods___________________________________________________________________________________________________
const getTime = function() {
	let time = new Date();
	return time.toLocaleTimeString() + "." + time.getMilliseconds()
};

function log(...data) {
	console.log(getTime(), ...data)//, "at", new Error().stack)
}

function error(...data) {
	console.error(getTime(), ...data)
}


/**
 * 
 * @param {chrome.runtime.Port} port, if null message will be sent via sendNativeMessage 
 * @returns 
 */
function send(type, id, payload, port) {
	let msg = {}
	msg.type = type;
	if (id) msg.id = id;
	msg.payload = payload

	//The following is true for native host communication. 
	//But if we want to send more than 4 GB to the Popup we have problems on another level.
	//_____________________________________________________
	//Chrome sends 4 bytes for the following message length
	//4 bytes are 32bits for possible message lengths
	//So the maximum message length is 2^32 bytes = 4GB
	let GB_IN_BYTES = 1024**3
	if (JSON.stringify(msg) >= 4*GB_IN_BYTES) {
		//hopefully NEVER happens
		error("Message is bigger than 4GB")
		return null;
	} else {
		if (port) {
			log("Send", msg, "via Port", port)
			port.postMessage(msg)	
		} else {
			log("Send to native host", msg)
			return chrome.runtime.sendNativeMessage('furock.yt_dl_native_msg_host', msg)
		}
	}
}

/**
 * 
 * @returns {chrome.runtime.Port}
 */
function startNative() {
	let nativePort = chrome.runtime.connectNative('furock.yt_dl_native_msg_host')

	nativePort.onDisconnect.addListener((port) => {
		log("Native Port closed", port)
	})

	nativePort.onMessage.addListener((msg, port) => {
		log("Received Message from Native Host", msg)
		
		/**
		 * @type Download
		 */
		let download = null
		switch (msg.type) {
			case "UPDATE":
				let progress = msg.payload.progress
				if (Object.keys(Download.Progress).includes(progress)) progress = Download.Progress[progress]
				download = new Download(msg.payload.id, null, 
					Download.State[msg.payload.state], progress)
				download.title = msg.payload.title

				download.id = portDownloadMap.get(nativePort)
				
				if (download.state === Download.State.CONVERSION && download.progress == null) {
					download.progress = Download.Progress.INPROGRESS
				}
				
				update(download)

				if (download.state === Download.State.DOWNLOAD && download.progress.includes("100%")) {
					let extraction = new Download(download.id, null, Download.State.EXTRACTION, 
						Download.Progress.INPROGRESS)
					update(extraction)
				}

				break;
			case "END:YT-DLP":
				port.disconnect()
				
				let state = null;
				if (msg.status == "SUCCESS") {
					state = Download.State.FINISHED
				} else {
					state = Download.State.ABORTED
				}
				download = new Download(portDownloadMap.get(nativePort), null, state, null)
				update(download)
				break;
			default :
				error("Unknown message type", msg.type)
		}
	})

	return nativePort;
}

function isDownloading() {
	return currentDownload !== null && currentDownload.state === Download.State.DOWNLOAD
}

async function startDownload(msg) {
	//Inform the popup that the download will be started
	let download = new Download(msg.id, msg["payload"]["audio-format"], 
		Download.State.DOWNLOAD, Download.Progress.PENDING)
	
	currentDownload = download
	download.title = msg.payload.tabTitle
	update(download)
	
	//start the download
	let nativePort = startNative()
	send(msg.type, msg.id, msg.payload, nativePort)
	
	portDownloadMap.set(nativePort, msg.id)	
}

// DO NOT USE chome.tabs.query({ active: true, currentWindow: true }) inside service worker
// if you are in another window and then trigger this method via popup, there are no tabs returned
// if you want to retrieve information about the current tab, get this information inside popup.js 
// and send it to the background
//
// async function getCurrentTab() {
// 	let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
// 	if (tabs.length != 1) {
// 		console.error("Not exactly one active tab in this window, but", tabs.length)
// 		//alert("Ein Fehler ist aufgetreten. Es wurden " + tabs.length + " Tabs erkannt. Bitte versuche es erneut oder starte Chrome neu.")
// 	} else {
// 		return tabs[0]
// 	}
// }

/**
 * 1. updates the downdloads array with the new download info <br>
 * 2. if the new download info regards the currentDownload, <br>
 * 		2.1 if currentDownload is still downloading, it is updated <br>
 * 		2.2 if not, currentDownload is set to null and next download starts from queue <br>
 * 3. popup is also informed about new download info
 * 
 * @param {Download} download 
 */
function update(download) {
	let old = downloads.find((dl) => dl.id === download.id)
	if (old){
		if (download.title) old.title = download.title
		old.state = download.state
		old.progress = download.progress
	} else {
		downloads.push(download)
	}

	if (currentDownload && currentDownload.id === download.id) {
		if (download.state !== Download.State.DOWNLOAD) {
			currentDownload = null;
			if (downloadQueue.length !== 0) startDownload(downloadQueue.shift())
		} else {
			currentDownload = download;
		}
	}
	
	popupPorts.forEach((port) => {
		send("UPDATE", download.id, download, port)
	})
}