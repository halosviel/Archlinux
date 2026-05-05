#!/bin/bash

# toggles obs' record/stop recording functions
# -> obs must be open!!

STATUS=$(obs-cmd --websocket obsws://localhost:4455/slg20Z55ZmFTHX8G recording status 2>/dev/null)

if echo "$STATUS" | grep -qi "Active: true"; then
    obs-cmd --websocket obsws://localhost:4455/slg20Z55ZmFTHX8G recording stop
else
    obs-cmd --websocket obsws://localhost:4455/slg20Z55ZmFTHX8G recording start
fi
