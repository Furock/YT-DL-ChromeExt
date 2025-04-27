import logging
import sys
import inspect
import os

defaultLog = os.path.join(".", "defaultLog.log")
alsoLogToStdout = False

def getLogger(logfile=defaultLog) -> logging.Logger:
    logger = logging.getLogger(logfile)

    if logger.handlers: return logger

    logger.setLevel(logging.DEBUG)

    formatter = logging.Formatter("%(asctime)s.%(msecs)03d %(levelname)s - %(message)s", datefmt="%Y-%m-%d %X")

    if (alsoLogToStdout) :
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.addFilter(lambda record : record.levelno <= logging.WARN)
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        error_handler = logging.StreamHandler(sys.stderr)
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        logger.addHandler(error_handler)
    
    file_handler = logging.FileHandler(filename=logfile)
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    return logger


def log(*values, **kwargs):
    values = (inspect.stack()[1].function, "-") + values
    if kwargs.get("level") == None: kwargs["level"] = logging.INFO
    logger = getLogger(kwargs.pop("file", defaultLog))
    msg = ' '.join([str(v) for v in values])
    logger.log(msg=msg, **kwargs)
    