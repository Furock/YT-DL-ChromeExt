import sys
import psutil
import json
import datetime
import os, os.path
import traceback
import tempfile
import logging
from json.decoder import JSONDecodeError
from yt_dlp import YoutubeDL

import ytdl_gcext_logger
from ytdl_gcext_logger import log
import ytdl_gcext_audioconverter

# if the process grandparent is chrome then it's called by the extension else it's a local execution
localEx = psutil.Process(os.getpid()).parent().parent().name() not in  ["chrome.exe"]
debugMessage = {
            "type": "YT-DLP",
            "payload": {
                "audio-format" : "mp3",
                "downloadPath" : "C:\\Users\\renen\\Downloads\\YT-DLP",
                "url" : "http://localhost:8000/vehicle.mp4"
            }
        }
executionStartForFilename = datetime.datetime.now().strftime("%Y%m%dT%H%M%S%f")[:-3]

def nowAsString():
    return datetime.datetime.now().strftime("%Y-%m-%dT%X.%f")[:-3]

def getExistingDir(*pathElements):
    path = ""
    for el in pathElements:
        path = os.path.join(path, el)
        if not os.path.exists(path):
            os.mkdir(path)
    return path

tempDir = getExistingDir(tempfile.gettempdir(), "YT-DL_GCEXT")
executionTempDir = getExistingDir(tempDir, executionStartForFilename)
logDir = getExistingDir(executionTempDir, "logs")
currentLogFile = os.path.join(logDir, "native-host.log")
ytdl_gcext_logger.defaultLog = currentLogFile
ytdl_gcext_logger.alsoLogToStdout = localEx

extensionLogFile = os.path.join(logDir, "extension.log")
downloadsDir = getExistingDir(os.path.expanduser("~"), "Downloads", "YT-DLP")
if os.name == "nt" and downloadsDir[0] == "~": downloadsDir = None
ytdlpOutFile = os.path.join(logDir, "ytdlpProcess.txt")
tempDownload = getExistingDir(executionTempDir, "downloads")
allLogFile = os.path.join(tempDir, "results.log")

def read_message():

    if localEx:
        return debugMessage

    length = sys.stdin.buffer.read(4)
    log("Read message length:", "'" + length.hex() + "'")
    if len(length) < 4:
        return None
    message_length = int.from_bytes(length, byteorder='little')
    log("->", message_length)
    
    if message_length == None:
        return ""
    elif message_length < 33554432: #py stdin max inputbytes
        message = sys.stdin.buffer.read(message_length)
        log("Before JSONDecoding, read:", "'" + message.decode('utf-8') + "'")
        return json.loads(message)
    else:
        message = sys.stdin.buffer.read(100)
        log("Message too long:", "'" + message.decode('utf-8') + "...'")
        return message.decode('utf-8') + "..."

def printProgress(dict):
    send_message({
        "type": "UPDATE",
        "payload": {
            "title": dict.get("info_dict", {}).get("title", "NO_TITLE"),
            "state": "DOWNLOAD", #dict.get("status"),
            "progress": dict.get("_default_template")
        }
    })
    if dict.get("status") != "error":
        log(dict.get("info_dict", {}).get("title", "NO_TITLE"), dict.get("_default_template"))
    else: log(dict) 

def ppFinished(ctx) -> bool:
    """
    returns true if yt-dlps own postprocessing is finished
    """
    return ctx.get("postprocessor") == "MoveFiles" and ctx.get("status") == "finished"

def convertFile(ctx):
    if ppFinished(ctx):
        send_message({
            "type": "UPDATE",
            "payload": {
                "state": "CONVERSION"
            }
            
        })
        ytdl_gcext_audioconverter.convertFile(ctx)
        

def ytdlp(body):
    ytdl_gcext_audioconverter.destinationFormat = body.get("audio-format", "mp3")

    msgDownloadPath = body.get("downloadPath", "").strip()
    downloadPath = msgDownloadPath if len(msgDownloadPath) > 0 else downloadsDir
    
    with YoutubeDL({
        "format": "bestaudio/best",
        "windowsfilenames" : os.name == "nt",
        "postprocessors" : [
            {
                "key" : "FFmpegExtractAudio"
            }
        ],
        "progress_hooks" : [printProgress],
        "postprocessor_hooks" : [convertFile],
        "paths": { 
            "home" : downloadPath
        },
        "logger": ytdl_gcext_logger.getLogger(ytdlpOutFile),
        "keepvideo": True
    }) as dlp:
        dlp.download([body.get("url")])

def process_message(message):
    type = message.get("type")
    if type == "LOGGING":
        log(message.get("payload"))
    elif type == "GetFormats":
        return [v for v in ytdl_gcext_audioconverter.FORMAT_CODECS]
    elif type == "YT-DLP":
        ytdlp(message.get("payload"))
    else:
        log(f"Request {type} unknown", level = logging.ERROR)

def send_message(message):
    encoded_message = json.dumps(message)#.encode('utf-8')
    length = len(encoded_message)
    log("Length:", length)
    log("Message:", encoded_message)
    encoded_message = encoded_message.encode('utf-8')

    #not more than 4MB are allowed:
    MB_IN_B = 1024*1024
    if length < 4*MB_IN_B:
        lengthInBytes = length.to_bytes(length=4, byteorder="little", signed=False)
        log("Send to the Extension:", lengthInBytes, encoded_message)

        sys.stdout.buffer.write(lengthInBytes)
        sys.stdout.buffer.write(encoded_message)
        sys.stdout.flush()
        log ("Sent.")
    else:
        log("Response to long (>=4MB)")


def main():
    status = "STARTED"
    try:
        #empty the current log at every method start
        with open(currentLogFile, "w") as f:
            print("START:", nowAsString(), file=f)
            print("OS:", os.name, file=f)
            print("PYTHON:", sys.version, file=f)
            print("EXTENSION-CALL:", not localEx, file=f)
            print("GRANDPARENT-PROCESS:", psutil.Process(os.getpid()).parent().parent().name(), file=f)
            print(file=f)
        errorcode = None

        def handleException(exception, newStatus, newErrorCode):
            nonlocal status; status = newStatus
            nonlocal errorcode; errorcode = newErrorCode
            nonlocal result; result = str(exception)

            with open(currentLogFile, "a") as f:
                traceback.print_exc(file=f)
                if localEx: traceback.print_exc()

            log(exception, level=logging.ERROR)

        try:
            try:
                # Warten auf eine Nachricht von der Extension
                status = "READING_MESSAGE"
                receivedMessage = read_message()
            except JSONDecodeError as e:
                handleException(e, newStatus="READ_ERROR", newErrorCode="INVALID_JSON")
            else:
                status = "READ_SUCCESS"
                log("Received Message:", receivedMessage)
            
            status="PROCESSING_DATA"
            
            try: 
                result = process_message(receivedMessage)
            except Exception as e:
                handleException(e, newStatus="FAILURE", newErrorCode="PROCESS_ERROR")
                result = str(e)
            else: 
                status = "SUCCESS"


            response = {
                "type": "END:" + receivedMessage.get("type"),
                "status": status,
                "message": result
            }

            if receivedMessage.get("type") == "YT-DLP":
                response["yt-dlp.out"] = ytdlpOutFile

            if errorcode:
                response["errorCode"] = errorcode

            send_message(response)  # Antwort an die Extension
        except Exception as f:
            handleException(f, newStatus="DONT KNOW BUT PROLLY NO RESP SENT", newErrorCode="HIGH_LEVEL_ERROR")

            response = {
                "type": "END:YT-DLP",
                "status": status,
                "message": ""
            }

            if receivedMessage.get("PURPOSE") == "YT-DLP":
                response["yt-dlp.out"] = ytdlpOutFile

            if errorcode:
                response["errorCode"] = errorcode


        logObj = {
            "metadata" : {
                "time": nowAsString(),
                "process": {
                    "pid": os.getpid(),
                    #"command": ' '.join(psutil.Process(os.getpid()).cmdline()),
                },
                "py.version": sys.version,
                "os": os.name
            },
            "response": response,
        }
        
        log(json.dumps(logObj), file=allLogFile)

    except Exception:
        with open(currentLogFile, "a") as logFile:
            traceback.print_exc(file=logFile)
            if localEx: traceback.print_exc()

    # #archive if no SUCCESS
    # if status != "SUCCESS":
    #     archiveLog(getCurrentLogPath())
    #     shutil.copy(getYtdlpOut(),
    #                 os.path.join(getYtdlpArchive(), os.path.basename(getYtdlpOut())))
        
        

if __name__ == "__main__":
    main()
