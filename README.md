# YT-DL-ChromeExt
Chrome Extension for a [audio/video downloader with support for thousands of sites](https://github.com/yt-dlp/yt-dlp)

# ⚠️ Legal Notice
This software is provided for educational and personal use only. It is intended to download or process media only when the user has the legal right to do so, such as content that is public domain, licensed under Creative Commons, or owned by the user.

The developers of this software do not endorse or encourage the downloading of copyrighted materials without permission. You are solely responsible for ensuring that your use of this software complies with applicable laws, terms of service, and copyright restrictions.

By using this software, you agree to take full responsibility for your actions and any consequences that may arise from them.



# Setup
1. Download this project (https://github.com/Furock/YT-DL-ChromeExt/archive/refs/heads/main.zip) and unzip it.
2. Load the extension in chrome
	2.1. Open chrome and view its extensions (chrome://extensions/).
	2.2. Enable the developer mode (to load this extension locally, because it's not in marketplace).
	2.3. Click on load unpacked extension and choose the unzipped folder from step 1.
3. Get python if not already done 
	3.1 If you're not sure, you can
		3.1.1 on windows: run setup\win\do-I-have-python.bat
		3.1.2 with bash script: run setup\bash-scripts\do-I-have-python.sh
		3.1.3 in general: open a command line and execute 'python --version' and look whether your system finds a python version or not
		3.1.4 if you're sure you have python but 'python --version' does not work, it might be, that the path to your python is missing in the 'path' _environment variable_. Please look up, how to add python to the path environment variable.
	3.2. If you still have Win7 (which is not recommended), you can install python 3.8.10. Because it was somewhat tricky to find, you can use 'setup\win\python-3.8.10-DL-for-win7x64.bat' if you have win-x64
	3.3 https://www.python.org/downloads/
4. Configure the extension that it can use the python yt downloader (We create a new json and have to add it to registry)
	4.1. on windows: run setup\win\generate-native-message-manifest.bat
	4.2. with bash script: run setup\bash-scripts\generate-native-message-manifest.sh
		4.2.1 This generates just yt-dl-native-msg-manifest.json. We still have to make a registry entry to it. Please refer to https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging?hl=de#native-messaging-host-location because it depends on your OS and browser
5. Download the required package yt-dlp package
	5.1. on windows: execute setup\win\install-yt-dlp.bat
	5.2. in general: it's just 
		5.2.1 `pip download yt-dlp` and
		5.2.2 `pip install yt-dlp`
6. Since yt-dlp requires ffmpeg or ffprobe, we need to install it too
	6.1. https://www.ffmpeg.org/download.html
	6.2. Be reminded to add its 'bin' folder to the 'path' variable
