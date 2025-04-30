let portPromise = new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs.length != 1) {
            console.error("Not exactly one active tab in this window, but" + tabs.length)
            reject("Not exactly one active tab in this window, but" + tabs.length)
        } else {
            port = chrome.runtime.connect({
                name: tabs[0].title
            })
            resolve(port)
        }
    })
})



async function forwardToBackground(obj) {
    (await portPromise).postMessage(obj);
}

let pendingResponses = {};
function sendRequest(msg) {
    let id = crypto.randomUUID();
    msg.id = id
    return new Promise((resolve, reject) =>{
        pendingResponses[id] = resolve;
        console.log("Send message to background:", msg)
        forwardToBackground(msg)
    })
}

//Handle incoming messages
portPromise.then((port) => {
    port.onMessage.addListener((msg, port) => {
        console.log("Received Message from ", port.sender)
        console.log("Message: ", msg)
        if (pendingResponses[msg.id]) {
            pendingResponses[msg.id](msg.payload)
            delete pendingResponses[msg.id]
        } else {
    
        }
    })
    
})

async function getFormats() {
    response = await sendRequest({
        "type": "GetFormats",
    })

    //console.log("Working with", response)
        
    response.forEach(format => {
        let option = document.createElement("option")
        option.value = format
        option.innerText = format
        document.getElementById("format").appendChild(option)
    })
}

getFormats()

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("submit-download").addEventListener("click", async () => {

        let tabs = await chrome.tabs.query({active:true, currentWindow:true})

        if (tabs.length == 1) {
            message = {
                "type": "YT-DLP",
                "payload": {
                    "audio-format" : document.getElementById("format").value,
                    "url" : tabs[0].url
                }
            }
            forwardToBackground(message)
        } else {
            alert("Ein Fehler ist aufgetreten. Es wurden " + tabs.length + " Tabs erkannt. Bitte versuche es erneut oder starte Chrome neu.")
        }
    });
})