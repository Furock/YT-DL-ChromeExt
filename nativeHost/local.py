import sys
#import psutil
import subprocess
import json
import datetime
import os, os.path
import traceback
import tempfile
from json.decoder import JSONDecodeError

unsafe = True
debug = False
debugMessage = {
            "PURPOSE": "YT-DLP",
            "MSG": {
                #"-k" : "", 
                "-x" : "",
                "--audio-format" : "mp3",
                "--audio-quality" : "0",
                "-P" : "C:\\Users\\renen\\Downloads\\YT-DLP",
                "url" : "http://localhost"
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
currentLogFile = os.path.join(logDir, "local-py.log")
extensionLogFile = os.path.join(logDir, "extension.log")
downloadsDir = getExistingDir(os.path.expanduser("~"), "Downloads", "YT-DLP")
if os.name == "nt" and downloadsDir[0] == "~": downloadsDir = None
ytdlpOutFile = os.path.join(logDir, "ytdlpProcess.txt")
tempDownload = getExistingDir(executionTempDir, "downloads")
allLogFile = os.path.join(tempDir, "results.log")
    
def log(*values, **kwargs):
    if kwargs.get("file") == None: kwargs["file"] = currentLogFile
    with open(kwargs.get("file"), "a") as f:
        kwargs["file"] = f
        print(nowAsString(), *values, **kwargs)
        if debug:
            kwargs.pop("file", None)
            print(nowAsString(), *values, **kwargs)

def read_message():

    if debug:
        return debugMessage

    # Lese die Nachricht von stdin
    length = sys.stdin.buffer.read(4)
    log("Read message length:", "'" + length.hex() + "'", end=" ")
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


wishedDownloadPath = None
def use_message(message):
    if message.get("PURPOSE") == "LOGGING":
        log(message.get("MSG"))
    elif message.get("PURPOSE") == "YT-DLP":
        with open(ytdlpOutFile, "w") as f:

            if unsafe:
                cmd = ['yt-dlp']
                msg = message.get("MSG")
                global wishedDownloadPath
                wishedDownloadPath = msg.pop("-P", wishedDownloadPath)
                wishedDownloadPath = msg.pop("--paths", wishedDownloadPath)

                if msg.get("-P") == None and msg.get("--paths") == None:
                    msg["-P"] = downloadsDir
                
                if os.name == "nt" and msg.get("--windows-filenames") == None:
                    msg["--windows-filenames"] = "" # that way we activate this
                for key, value in msg.items():
                    if key == "url": continue
                    cmd.append(key.replace("--exec","")) #no harmful code allowed
                    if value: cmd.append(value.replace("--exec",""))
                
                cmd.append(msg.get('url', "no-url"))
                log(' '.join(cmd))
                result = subprocess.Popen(args=cmd, stdout=f, stderr=f)

                return result.returncode == 0
            else:
                cmd = ['yt-dlp']
                msg = message.get("MSG")
                wishedDownloadPath = msg.pop("-P", wishedDownloadPath)
                wishedDownloadPath = msg.pop("--paths", wishedDownloadPath)
                
                if os.name == "nt" and msg.get("--windows-filenames") == None:
                    msg["--windows-filenames"] = "" # that way we activate this
                for key, value in msg.items():
                    if key == "url": continue
                    cmd.append(key.replace("--exec","")) #no harmful code allowed
                    if value: cmd.append(value.replace("--exec",""))
                
                log(' '.join(cmd))
                result = subprocess.run(args=cmd, capture_output=True, text=True)
                
                
                if result.stdout:
                    log("OUT:", file=ytdlpOutFile)
                    log(result.stdout, file=ytdlpOutFile)
                    log(os.linesep, file=ytdlpOutFile)
                if result.stderr:
                    log("ERR:", file=ytdlpOutFile)
                    log(result.stderr, file=ytdlpOutFile)


                return result.stderr == None

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
            print(file=f)

        msg = "READ MESSAGE"
        errorcode = None

        def handleException(exception, newStatus, newErrorCode):
            nonlocal status; status = newStatus
            nonlocal errorcode; errorcode = newErrorCode
            nonlocal msg; msg = str(exception)

            with open(currentLogFile, "a") as f:
                traceback.print_exc(file=f)
                if debug: traceback.print_exc()

            log("Handle exception:", exception)

        try:
            try:
                # Warten auf eine Nachricht von der Extension
                status = "READING_MESSAGE"
                msg = read_message()
            except JSONDecodeError as e:
                handleException(e, newStatus="READ_ERROR", newErrorCode="INVALID_JSON")
            else:
                status = "READ_SUCCESS"
                print("Empfangene Nachricht:", msg)
                log("Empfangene Nachricht:", msg)
            
            status="PROCESSING_DATA"
            
            success = use_message(msg)
            if success: status="SUCCESS"
            else:
                status = "FAILURE"
                errorcode = "DOWNLOAD_ERROR"


            response = {
                "status": status,
                "message": "",
                "yt-dlp.out": ytdlpOutFile
            }

            if errorcode:
                response["errorCode"] = errorcode

            send_message(response)  # Antwort an die Extension
        except Exception as f:
            handleException(f, newStatus="DONT KNOW BUT PROLLY NO RESP SENT", newErrorCode="HIGH_LEVEL_ERROR")

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
            if debug: traceback.print_exc()

    # #archive if no SUCCESS
    # if status != "SUCCESS":
    #     archiveLog(getCurrentLogPath())
    #     shutil.copy(getYtdlpOut(),
    #                 os.path.join(getYtdlpArchive(), os.path.basename(getYtdlpOut())))
        
        

if __name__ == "__main__":
    main()
