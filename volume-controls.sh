#!/bin/bash

MAX_VOLUME=100
INCREMENT=5
DECREMENT=5

case "$1" in
    up)
        CURRENT=$(wpctl get-volume @DEFAULT_AUDIO_SINK@ | awk '{printf "%d", $2 * 100}')
        NEW=$(( CURRENT + INCREMENT ))
        if [ "$NEW" -gt "$MAX_VOLUME" ]; then
            NEW=$MAX_VOLUME
        fi
        wpctl set-volume @DEFAULT_AUDIO_SINK@ "${NEW}%"
        ;;
    down)
        CURRENT=$(wpctl get-volume @DEFAULT_AUDIO_SINK@ | awk '{printf "%d", $2 * 100}')
        NEW=$(( CURRENT - DECREMENT ))
        if [ "$NEW" -lt 0 ]; then
            NEW=0
        fi
        wpctl set-volume @DEFAULT_AUDIO_SINK@ "${NEW}%"
        ;;
    mute)
        wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle
        ;;
esac
