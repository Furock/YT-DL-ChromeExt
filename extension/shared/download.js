export class Download {

    static State = {
        DOWNLOAD  : "Download", 
        EXTRACTION: "Extrahieren",
        CONVERSION: "Konvertieren",
        FINISHED  : "Abgeschlossen",
        ABORTED   : "Abgebrochen: Fehler"
    }

    static Progress = {
        PENDING: "Ausstehend",
        INPROGRESS: "Läuft",
        FINISHED: "Abgeschlossen",
        ERROR: "Error"
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
