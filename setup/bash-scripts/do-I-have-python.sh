#!/bin/bash

if command -v python >/dev/null 2>&1; then
    echo "Python is already installed."
else
    echo "Python is NOT already installed."
fi

read -p "Press Enter to continue..."