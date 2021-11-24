#!/bin/bash
if !(pgrep "spotifyd" > /dev/null); then
    systemctl --user start spotifyd
fi
spt

