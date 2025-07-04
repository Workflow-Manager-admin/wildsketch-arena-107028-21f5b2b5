#!/bin/bash
cd /home/kavia/workspace/code-generation/wildsketch-arena-107028-21f5b2b5/frontend_react_app
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

