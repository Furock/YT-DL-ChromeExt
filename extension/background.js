const getTime = function() {
	let time = new Date();
	return time.toLocaleTimeString() + "." + time.getMilliseconds()
};

function log(...data) {
	console.log(getTime(), ...data)
}

async function toNativeHost(msg) {
	log("Send to local.py:", msg)

	//chrome sends 4 bytes for the following message length
	//4 bytes are 32bits for possible message lengths
	//So the maximum message length is 2^32 bytes = 4GB
	let GB_IN_BYTES = 1073741824
	if (JSON.stringify(msg) >= 4*GB_IN_BYTES) {
		//hopefully NEVER happens
		console.log("Message is bigger than 4GB")
		return null;
	} else {
		console.log(msg)
		let resp = await chrome.runtime.sendNativeMessage('furock.yt_dl_native_msg_host', msg)
		console.log('Received:', resp);
		return resp; 
	}
}

formats = [];

function receiveMessage(msg, sender, sendResponse) {
	console.log("Sender", sender)
	console.log("Message", msg)

	if (msg["forwardToNativeHost"]) {
		toNativeHost(msg["obj"])
	} else {
		if (msg["obj"]["REQUEST"] == "GetFormats") {
			if (formats.length == 0) {
				toNativeHost(msg["obj"]).then(resp => {
					console.log("Response from native host:", resp)
					console.log("Send to popup:", resp["message"])
					formats = resp["message"]
					sendResponse(formats)
				})
			} else {
				sendResponse(formats)	
			}
			
		} else {
			console.error("Unknown request: " + msg["obj"]["REQUEST"])
		}
			
	}
	return true;
}

if (!chrome.runtime.onMessage.hasListener(receiveMessage)) {
	chrome.runtime.onMessage.addListener(receiveMessage)
}
