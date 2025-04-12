

async function forwardToBackground(obj, forwardToNativeHost = false) {
    return await chrome.runtime.sendMessage({"obj": obj, "forwardToNativeHost": forwardToNativeHost});
}

async function forwardToNativeHost(obj) {
    return await forwardToBackground(obj, true)
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("submit-download").addEventListener("click", async () => {

        let tabs = await chrome.tabs.query({active:true, currentWindow:true})

        if (tabs.length == 1) {
            message = {
                "PURPOSE": "YT-DLP",
                "MSG": {
                    "-x": "",
                    "--audio-format" : document.getElementById("format").value,
                    "--audio-quality" : "0",
                    "url" : tabs[0].url
                }
            }
            forwardToNativeHost(message)
        } else {
            alert("Ein Fehler ist aufgetreten. Es wurden " + tabs.length + " Tabs erkannt. Bitte versuche es erneut oder starte Chrome neu.")
        }
    });
})


