cd ../..
name=furock.yt_dl_native_msg_host
file=$PWD/yt-dl-native-msg-manifest.json

echo Generate $file.
cat <<EOF > $file
{
  "name": "$name",
  "description": "Native Messaging host for the yt-dl extension",
  "path": "$PWD/scripts/local.py",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://hgiinhkgbbjkejebfgkbmfhbemhlmfcm/"]
}
EOF

echo Successfully generated.

read -p "Press Enter to continue..."