#!/bin/bash
# f.sh - single frame

USAGE="f.sh infile timecode [outfile]"

if [ "$#" == "0" ]; then
        echo "$USAGE"
        exit 1
fi

if [ -e "$1" ]; then
        video="$1"
else
        echo "file not found: $1"
        exit 1
fi

if [ ! -z "$2" ]; then
        time="$2"
else
        echo "Need timecode!"
        exit 1
fi

# if we have a filename write to that, else imagemagick display

if [ ! -z "$3" ]; then
        echo "ffmpeg -i \"$video\" -ss $time  -vframes 1 -f image2 \"$3\""
        ffmpeg -loglevel quiet -hide_banner -ss $time -i "$video" -vframes 1 -f image2 "$3"
else
        echo "ffmpeg -i \"$video\" -ss $3  -vframes 1 -f image2 - | display"
        ffmpeg -hide_banner -loglevel quiet -ss $time  -i "$video" -vframes 1 -f image2 - | display
fi
