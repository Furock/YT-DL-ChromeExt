const getTime = function() {
	let time = new Date();
	return time.toLocaleTimeString() + "." + time.getMilliseconds()
};

function log(...data) {
	console.log(getTime(), ...data)
}

function toNativeHost(msg) {
	log("Send to local.py:", msg)

	//chrome sends 4 bytes for the following message length
	//4 bytes are 32bits for possible message lengths
	//So the maximum message length is 2^32 bytes = 4GB
	let GB_IN_BYTES = 1073741824
	if (JSON.stringify(msg) >= 4*GB_IN_BYTES) {
		//hopefully NEVER happens
		console.log("Message is bigger than 4GB")
	} else {
		console.log(msg)
		chrome.runtime.sendNativeMessage('furock.yt_dl_native_msg_host', 
			msg, 
			(response) => {
				console.log('Received:', response);
			}
		) 
	}
}

async function receiveMessage(msg, sender) {
	console.log("Sender", sender)
	console.log("Message", msg)

	if (msg.forwardToNativeHost) {
		toNativeHost(msg.obj)
	}
}

if (!chrome.runtime.onMessage.hasListener(receiveMessage)) {
	chrome.runtime.onMessage.addListener(receiveMessage)
}
