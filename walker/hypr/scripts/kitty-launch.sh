#!/bin/bash

## custom kitty launch script
## floats workspace 6 terminals

CURRENT=$(hyprctl activeworkspace -j | jq -r '.id')
if [ "$CURRENT" = "6" ]; then
  kitty --title floating-term
else
  kitty
fi
