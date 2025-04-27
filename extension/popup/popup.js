

async function forwardToBackground(obj, forwardToNativeHost = false) {
    // return new Promise((resolve, reject) => {
    //     chrome.runtime.sendMessage({"obj": obj, "forwardToNativeHost": forwardToNativeHost}, response => {
    //         resolve(response)
    //     });
    // })
    return await chrome.runtime.sendMessage({"obj": obj, "forwardToNativeHost": forwardToNativeHost});
}

async function forwardToNativeHost(obj) {
    return await forwardToBackground(obj, true)
}

async function getFormats() {
    let response = await forwardToBackground({
        "REQUEST": "GetFormats"
    }, false)

    console.log("Received Response from Service Worker:", response)
        
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
                "REQUEST": "YT-DLP",
                "MSG": {
                    "audio-format" : document.getElementById("format").value,
                    "url" : tabs[0].url
                }
            }
            forwardToNativeHost(message)
        } else {
            alert("Ein Fehler ist aufgetreten. Es wurden " + tabs.length + " Tabs erkannt. Bitte versuche es erneut oder starte Chrome neu.")
        }
    });
})


