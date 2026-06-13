#!/bin/sh
cd "$(dirname "$0")"
echo "SAND & RUST — http://localhost:8741"
(sleep 1 && open "http://localhost:8741") &
python3 serve.py
