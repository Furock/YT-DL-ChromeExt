export class YtdlpCache {

    static KEYS = {
        DEFAULT_FORMAT: "defaultFormat",
        FORMATS: "formats",
        DOWNLOAD_PATH : "downloadPath"
    }

    /**
     * 
     * @param {String} key 
     * @param {*} value 
     * @returns 
     */
    static set(key, value) {
        if (!Object.values(YtdlpCache.KEYS).includes(key)) {
            console.error("Unknown cache key", key)
            return
        }
        
        let storage = {}
        storage[key] = value
        chrome.storage.local.set(storage)
    }



    /**
     * 
     * @param {*} key A single key to get, list of keys to get, or a dictionary specifying default values. An empty list or object will return an empty result object. Pass in null to get the entire contents of storage.
     * @returns 
     */
    static get(key) {
        if (typeof key === "string") {
            if (!Object.values(YtdlpCache.KEYS).includes(key)) {
                console.error("Unknown cache key (String)", key, "valid cache keys", Object.values(YtdlpCache.KEYS))
                return null;    
            }
        } else if (Array.isArray(key)) {
            if (!key.every(singleKey => Object.values(YtdlpCache.KEYS).includes(singleKey))) {
                console.error("Array contains unknown cache keys", key, "valid cache keys", Object.values(YtdlpCache.KEYS))
                return null;
            }
        } else if (!Object.keys(key).every(singleKey => Object.values(YtdlpCache.KEYS).includes(singleKey))) {
            console.error("Object contains unknown cache keys", key, "valid cache keys", Object.values(YtdlpCache.KEYS))
            return null;
        }
        return chrome.storage.local.get(key)
    }

    static clear() {
        // some data shall persist clearing like downloadPath
        YtdlpCache.get([
            YtdlpCache.KEYS.DOWNLOAD_PATH
        ]).then(shallPersist => {
            chrome.storage.local.clear();
            chrome.storage.local.set(shallPersist);
        })

        
    }

}