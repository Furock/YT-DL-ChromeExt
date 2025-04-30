const getTime = function() {
	let time = new Date();
	return time.toLocaleTimeString() + "." + time.getMilliseconds()
};

function log(...data) {
	console.log(getTime(), ...data)
}

function error(...data) {
	console.error(getTime(), ...data)
}


async function toNativeHost(msg) {
	if (!msg) {
		error("msg undefined")
		return;
	}
	
	log("Send to native host:", msg)

	//chrome sends 4 bytes for the following message length
	//4 bytes are 32bits for possible message lengths
	//So the maximum message length is 2^32 bytes = 4GB
	let GB_IN_BYTES = 1073741824
	if (JSON.stringify(msg) >= 4*GB_IN_BYTES) {
		//hopefully NEVER happens
		log("Message is bigger than 4GB")
		return null;
	} else {
		log(msg)
		let resp = await chrome.runtime.sendNativeMessage('furock.yt_dl_native_msg_host', msg)
		log('Received:', resp);
		return resp; 
	}
}

formats = [];

/**
 * 
 * @returns {chrome.runtime.Port}
 */
function startNative() {
	return chrome.runtime.connectNative('furock.yt_dl_native_msg_host')
}

function createResponse(request, responsePayload) {
	let response = {}
	response.id = request.id;
	response.type = "response:"+request.type;
	response.payload = responsePayload;
	return response;
}

chrome.runtime.onConnect.addListener((port) => {
	log("Port geöffnet für ", port.sender, port.name)
	
	port.onDisconnect.addListener((port) => {
		log("Popup closed")
	})
	
	// receive Message from popup
	port.onMessage.addListener((msg, port) => {
		log("Sender", port.sender)
		log("Message", msg)

		switch (msg["type"]) {
			case "GetFormats":
				if (formats.length == 0) {
					toNativeHost(msg).then(resp => {
						log("Response from native host:", resp)
						log("Send to popup:", resp["message"])
						formats = resp["message"]
						port.postMessage(createResponse(msg, formats))
					})
				} else {
					port.postMessage(createResponse(msg, formats))
				}
				break;
			case "YT-DLP":
				toNativeHost(msg)
				break;
			default:
				error("Received message with unknown message type " + msg["type"])
				break;
		}
	})
})
