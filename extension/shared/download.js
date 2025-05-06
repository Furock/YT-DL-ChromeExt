export class Download {

    static State = {
        DOWNLOAD  : chrome.i18n.getMessage("download"), 
        EXTRACTION: chrome.i18n.getMessage("extraction"),
        CONVERSION: chrome.i18n.getMessage("conversion"),
        FINISHED: chrome.i18n.getMessage("finished"),
        ABORTED: chrome.i18n.getMessage("aborted")
    }									

    static Progress = {					
        PENDING: chrome.i18n.getMessage("pending"),
        INPROGRESS: chrome.i18n.getMessage("inProgress"),
        FINISHED: chrome.i18n.getMessage("finished"),
        ERROR: chrome.i18n.getMessage("error")
    }

    /**
     * Constructor for a audio download object
     * @param {*} id of the download (decided by the service worker)
     * @param {*} targetFormat 
     * @param {*} state
     * @param {String} progress 
     */
    constructor(id, targetFormat, state, progress) {
        this.id = id;
        this.targetFormat = targetFormat;
        this.state = state;

        /**
         * @type String
         */
        this.progress = progress
        this.title = null;
    }

}
